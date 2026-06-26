import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getLocalQuestionSet,
  type StoredQuestion,
} from "@/lib/data/question-bank";
import { isSupabaseDataBackend } from "@/lib/data/backend";
import {
  advanceSupabaseGameQuestion,
  createSupabaseGameSession,
  endSupabaseGameSession,
  getSupabaseActiveTeacherGameSession,
  getSupabaseGameSessionByRoomCode,
  getSupabaseTeacherGameSession,
  joinSupabaseGameSession,
  lockSupabaseGameAnswers,
  showSupabaseGameAnswer,
  startSupabaseGameSession,
  submitSupabaseAnswer,
} from "@/lib/data/supabase-game-sessions";
import { generateRoomCode, normalizeRoomCode } from "@/lib/game/room-code";
import { calculateAwardedPoints } from "@/lib/game/scoring";
import { findTeamForNewParticipant } from "@/lib/game/team-assignment";
import type { GameStatus } from "@/types/game";

const GAME_SESSIONS_FILE = path.join(
  process.cwd(),
  "data",
  "game-sessions.json",
);

export type StoredTeam = {
  id: string;
  teamNumber: number;
  teamName: string;
  score: number;
  rawScore: number;
  averageScore: number;
  lockedMemberCount: number | null;
};

export type StoredParticipant = {
  id: string;
  studentCode: string;
  displayName: string;
  teamId: string | null;
  connectionStatus: "online" | "offline" | "left";
  joinedAfterStart: boolean;
  isScoreEligible: boolean;
  joinedAt: string;
  lastSeenAt: string;
};

export type StoredAnswer = {
  id: string;
  questionIndex: number;
  studentCode: string;
  teamId: string;
  answerText: string;
  isCorrect: boolean;
  scoreAwarded: number;
  submittedAt: string;
};

export type StoredGameSession = {
  id: string;
  roomCode: string;
  teacherCode: string;
  questionSetId: string;
  questionSetTitle: string;
  questionCount: number;
  activityName: string | null;
  status: GameStatus;
  teamCount: number;
  maxMembersPerTeam: number;
  currentQuestionIndex: number;
  teams: StoredTeam[];
  participants: StoredParticipant[];
  answers: StoredAnswer[];
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionSnapshot = {
  id: string;
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  points: number;
  timeLimitSeconds: number;
  correctAnswer?: string;
};

export type TeamSummary = StoredTeam & {
  memberCount: number;
  maxMembers: number;
  isFull: boolean;
  participants: StoredParticipant[];
};

export type RankedTeam = {
  id: string;
  teamName: string;
  teamNumber: number;
  rawScore: number;
  averageScore: number;
  lockedMemberCount: number;
  currentMemberCount: number;
  rank: number | null;
  isTied: boolean;
};

export type AnswerProgress = {
  answeredCount: number;
  eligibleCount: number;
  totalParticipantCount: number;
};

export type TeacherDashboardSnapshot = {
  roomCode: string;
  questionSetTitle: string;
  questionCount: number;
  activityName: string | null;
  status: GameStatus;
  teamCount: number;
  maxMembersPerTeam: number;
  currentQuestionIndex: number;
  currentQuestion: QuestionSnapshot | null;
  answerProgress: AnswerProgress;
  canStart: boolean;
  emptyTeamCount: number;
  incompleteTeamCount: number;
  participants: StoredParticipant[];
  teams: StoredTeam[];
  teamSummaries: TeamSummary[];
  rankedTeams: RankedTeam[];
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
};

export type StudentPlaySnapshot = {
  roomCode: string;
  questionSetTitle: string;
  activityName: string | null;
  status: GameStatus;
  participant: StoredParticipant;
  team: StoredTeam;
  currentQuestionIndex: number;
  currentQuestion: QuestionSnapshot | null;
  currentAnswer: StoredAnswer | null;
  canSubmitAnswer: boolean;
  answerProgress: AnswerProgress;
  teamScore: {
    rawScore: number;
    averageScore: number;
    lockedMemberCount: number | null;
  };
  rankedTeams: RankedTeam[];
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
};

function normalizeTeam(team: Partial<StoredTeam>, index: number): StoredTeam {
  const rawScore = Number(team.rawScore ?? team.score ?? 0);
  const averageScore = Number(team.averageScore ?? team.score ?? 0);

  return {
    id: String(team.id),
    teamNumber: Number(team.teamNumber ?? index + 1),
    teamName: String(team.teamName ?? `กลุ่ม ${index + 1}`),
    score: Number(team.score ?? averageScore),
    rawScore,
    averageScore,
    lockedMemberCount:
      typeof team.lockedMemberCount === "number"
        ? team.lockedMemberCount
        : null,
  };
}

function normalizeParticipant(
  participant: Partial<StoredParticipant>,
): StoredParticipant {
  const joinedAfterStart = Boolean(participant.joinedAfterStart);

  return {
    id: String(participant.id),
    studentCode: String(participant.studentCode),
    displayName: String(participant.displayName),
    teamId: participant.teamId ?? null,
    connectionStatus: participant.connectionStatus ?? "online",
    joinedAfterStart,
    isScoreEligible:
      typeof participant.isScoreEligible === "boolean"
        ? participant.isScoreEligible
        : !joinedAfterStart,
    joinedAt: String(participant.joinedAt),
    lastSeenAt: String(participant.lastSeenAt ?? participant.joinedAt),
  };
}

function normalizeAnswer(answer: Partial<StoredAnswer>): StoredAnswer {
  return {
    id: String(answer.id),
    questionIndex: Number(answer.questionIndex ?? 0),
    studentCode: String(answer.studentCode),
    teamId: String(answer.teamId),
    answerText: String(answer.answerText ?? ""),
    isCorrect: Boolean(answer.isCorrect),
    scoreAwarded: Number(answer.scoreAwarded ?? 0),
    submittedAt: String(answer.submittedAt),
  };
}

function normalizeGameSession(
  session: Partial<StoredGameSession>,
): StoredGameSession {
  const createdAt = String(session.createdAt ?? new Date().toISOString());

  return {
    id: String(session.id),
    roomCode: String(session.roomCode),
    teacherCode: String(session.teacherCode),
    questionSetId: String(session.questionSetId),
    questionSetTitle: String(session.questionSetTitle),
    questionCount: Number(session.questionCount ?? 0),
    activityName: session.activityName ?? null,
    status: session.status ?? "lobby",
    teamCount: Number(session.teamCount ?? session.teams?.length ?? 0),
    maxMembersPerTeam: Number(session.maxMembersPerTeam ?? 5),
    currentQuestionIndex: Number(session.currentQuestionIndex ?? 0),
    teams: (session.teams ?? []).map(normalizeTeam),
    participants: (session.participants ?? []).map(normalizeParticipant),
    answers: (session.answers ?? []).map(normalizeAnswer),
    startedAt: session.startedAt ?? null,
    endedAt: session.endedAt ?? null,
    createdAt,
    updatedAt: String(session.updatedAt ?? createdAt),
  };
}

async function readGameSessions() {
  try {
    const raw = await readFile(GAME_SESSIONS_FILE, "utf8");
    return (JSON.parse(raw) as Partial<StoredGameSession>[]).map(
      normalizeGameSession,
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeGameSessions(gameSessions: StoredGameSession[]) {
  await mkdir(path.dirname(GAME_SESSIONS_FILE), { recursive: true });
  await writeFile(
    GAME_SESSIONS_FILE,
    `${JSON.stringify(gameSessions, null, 2)}\n`,
    "utf8",
  );
}

function hasActiveRoomCode(
  gameSessions: StoredGameSession[],
  roomCode: string,
) {
  return gameSessions.some(
    (session) => session.roomCode === roomCode && session.status !== "ended",
  );
}

function generateUniqueRoomCode(gameSessions: StoredGameSession[]) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const roomCode = generateRoomCode();

    if (!hasActiveRoomCode(gameSessions, roomCode)) {
      return roomCode;
    }
  }

  for (let code = 0; code <= 9999; code += 1) {
    const roomCode = code.toString().padStart(4, "0");

    if (!hasActiveRoomCode(gameSessions, roomCode)) {
      return roomCode;
    }
  }

  throw new Error("ไม่มีรหัสห้องว่าง");
}

function isActiveParticipant(participant: StoredParticipant) {
  return participant.connectionStatus !== "left" && Boolean(participant.teamId);
}

function hasGameStarted(session: StoredGameSession) {
  return session.status !== "lobby";
}

function getTeamMemberCount(session: StoredGameSession, teamId: string) {
  return session.participants.filter(
    (participant) =>
      participant.teamId === teamId && participant.connectionStatus !== "left",
  ).length;
}

function getEligibleParticipantCount(session: StoredGameSession) {
  return session.participants.filter(
    (participant) =>
      participant.isScoreEligible &&
      participant.connectionStatus !== "left" &&
      Boolean(participant.teamId),
  ).length;
}

function getCurrentQuestionAnswers(session: StoredGameSession) {
  return session.answers.filter(
    (answer) => answer.questionIndex === session.currentQuestionIndex,
  );
}

function getTeamCapacity(session: StoredGameSession, teamId: string) {
  const team = session.teams.find((item) => item.id === teamId);

  if (!team) {
    return null;
  }

  const memberCount = getTeamMemberCount(session, teamId);

  return {
    team,
    memberCount,
    isFull: memberCount >= session.maxMembersPerTeam,
  };
}

function findAutoTeam(session: StoredGameSession) {
  const candidates = session.teams.map((team) => ({
    id: team.id,
    memberCount: getTeamMemberCount(session, team.id),
    maxMembers: session.maxMembersPerTeam,
  }));

  return findTeamForNewParticipant(candidates);
}

function getCurrentQuestionNumber(session: StoredGameSession) {
  return session.currentQuestionIndex + 1;
}

function toQuestionSnapshot({
  question,
  session,
  includeCorrectAnswer,
}: {
  question: StoredQuestion;
  session: StoredGameSession;
  includeCorrectAnswer: boolean;
}): QuestionSnapshot {
  return {
    id: question.id,
    questionNumber: getCurrentQuestionNumber(session),
    totalQuestions: session.questionCount,
    questionText: question.questionText,
    points: question.points,
    timeLimitSeconds: question.timeLimitSeconds,
    correctAnswer: includeCorrectAnswer ? question.correctAnswer : undefined,
  };
}

async function getCurrentQuestion(session: StoredGameSession) {
  const questionSet = await getLocalQuestionSet(
    session.teacherCode,
    session.questionSetId,
  );

  return questionSet?.questions[session.currentQuestionIndex] ?? null;
}

function recalculateTeamScores(session: StoredGameSession) {
  for (const team of session.teams) {
    const rawScore = session.answers
      .filter((answer) => answer.teamId === team.id)
      .reduce((sum, answer) => sum + answer.scoreAwarded, 0);
    const divisor = team.lockedMemberCount ?? 0;
    const averageScore = divisor > 0 ? rawScore / divisor : 0;

    team.rawScore = rawScore;
    team.averageScore = Number(averageScore.toFixed(2));
    team.score = team.averageScore;
  }
}

function getAnswerProgress(session: StoredGameSession): AnswerProgress {
  const currentAnswers = getCurrentQuestionAnswers(session);
  const totalParticipantCount = session.participants.filter(isActiveParticipant)
    .length;

  return {
    answeredCount: new Set(currentAnswers.map((answer) => answer.studentCode))
      .size,
    eligibleCount: getEligibleParticipantCount(session),
    totalParticipantCount,
  };
}

export function getTeamSummaries(session: StoredGameSession): TeamSummary[] {
  return session.teams.map((team) => {
    const memberCount = getTeamMemberCount(session, team.id);

    return {
      ...team,
      memberCount,
      maxMembers: session.maxMembersPerTeam,
      isFull: memberCount >= session.maxMembersPerTeam,
      participants: session.participants.filter(
        (participant) =>
          participant.teamId === team.id &&
          participant.connectionStatus !== "left",
      ),
    };
  });
}

export function getRankedTeams(session: StoredGameSession): RankedTeam[] {
  const scoreableTeams = session.teams
    .filter((team) => (team.lockedMemberCount ?? 0) > 0)
    .toSorted(
      (a, b) =>
        b.averageScore - a.averageScore ||
        a.teamNumber - b.teamNumber,
    );
  const unrankedTeams = session.teams
    .filter((team) => (team.lockedMemberCount ?? 0) === 0)
    .toSorted((a, b) => a.teamNumber - b.teamNumber);
  const tiedScores = new Set(
    scoreableTeams
      .map((team) => team.averageScore)
      .filter(
        (score, _index, scores) =>
          scores.filter((item) => item === score).length > 1,
      ),
  );
  let previousScore: number | null = null;
  let currentRank = 0;

  const rankedScoreableTeams = scoreableTeams.map((team, index) => {
    if (previousScore === null || team.averageScore !== previousScore) {
      currentRank = index + 1;
      previousScore = team.averageScore;
    }

    return {
      id: team.id,
      teamName: team.teamName,
      teamNumber: team.teamNumber,
      rawScore: team.rawScore,
      averageScore: team.averageScore,
      lockedMemberCount: team.lockedMemberCount ?? 0,
      currentMemberCount: getTeamMemberCount(session, team.id),
      rank: currentRank,
      isTied: tiedScores.has(team.averageScore),
    };
  });

  return [
    ...rankedScoreableTeams,
    ...unrankedTeams.map((team) => ({
      id: team.id,
      teamName: team.teamName,
      teamNumber: team.teamNumber,
      rawScore: team.rawScore,
      averageScore: team.averageScore,
      lockedMemberCount: team.lockedMemberCount ?? 0,
      currentMemberCount: getTeamMemberCount(session, team.id),
      rank: null,
      isTied: false,
    })),
  ];
}

export async function createLocalGameSession({
  teacherCode,
  questionSetId,
  questionSetTitle,
  questionCount,
  activityName,
  teamCount,
  maxMembersPerTeam,
}: {
  teacherCode: string;
  questionSetId: string;
  questionSetTitle: string;
  questionCount: number;
  activityName: string | null;
  teamCount: number;
  maxMembersPerTeam: number;
}) {
  if (isSupabaseDataBackend()) {
    return createSupabaseGameSession({
      teacherCode,
      questionSetId,
      questionSetTitle,
      questionCount,
      activityName,
      teamCount,
      maxMembersPerTeam,
    });
  }

  const gameSessions = await readGameSessions();
  const now = new Date().toISOString();
  const roomCode = generateUniqueRoomCode(gameSessions);
  const teams = Array.from({ length: teamCount }, (_, index) => ({
    id: randomUUID(),
    teamNumber: index + 1,
    teamName: `กลุ่ม ${index + 1}`,
    score: 0,
    rawScore: 0,
    averageScore: 0,
    lockedMemberCount: null,
  }));
  const gameSession: StoredGameSession = {
    id: randomUUID(),
    roomCode,
    teacherCode,
    questionSetId,
    questionSetTitle,
    questionCount,
    activityName,
    status: "lobby",
    teamCount,
    maxMembersPerTeam,
    currentQuestionIndex: 0,
    teams,
    participants: [],
    answers: [],
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  gameSessions.push(gameSession);
  await writeGameSessions(gameSessions);
  return gameSession;
}

export async function getActiveTeacherGameSession(teacherCode: string) {
  if (isSupabaseDataBackend()) {
    return getSupabaseActiveTeacherGameSession(teacherCode);
  }

  const gameSessions = await readGameSessions();

  return (
    gameSessions
      .filter(
        (session) =>
          session.teacherCode === teacherCode && session.status !== "ended",
      )
      .toSorted(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
  );
}

export async function getLocalGameSessionByRoomCode(roomCode: string) {
  if (isSupabaseDataBackend()) {
    return getSupabaseGameSessionByRoomCode(roomCode);
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();

  return (
    gameSessions.find((session) => session.roomCode === normalizedRoomCode) ??
    null
  );
}

export async function getLocalTeacherGameSession(
  teacherCode: string,
  roomCode: string,
) {
  if (isSupabaseDataBackend()) {
    return getSupabaseTeacherGameSession(teacherCode, roomCode);
  }

  const session = await getLocalGameSessionByRoomCode(roomCode);

  if (!session || session.teacherCode !== teacherCode) {
    return null;
  }

  return session;
}

export async function getJoinableGameSession(roomCode: string) {
  const session = await getLocalGameSessionByRoomCode(roomCode);

  if (!session || session.status === "ended") {
    return null;
  }

  return session;
}

export async function joinLocalGameSession({
  roomCode,
  studentCode,
  displayName,
  teamId,
}: {
  roomCode: string;
  studentCode: string;
  displayName: string;
  teamId?: string;
}) {
  if (isSupabaseDataBackend()) {
    return joinSupabaseGameSession({
      roomCode,
      studentCode,
      displayName,
      teamId,
    });
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();
  const session = gameSessions.find(
    (item) => item.roomCode === normalizedRoomCode,
  );

  if (!session || session.status === "ended") {
    return {
      ok: false as const,
      reason: "ไม่พบห้อง หรือห้องนี้จบเกมแล้ว",
    };
  }

  const now = new Date().toISOString();
  const existingParticipant = session.participants.find(
    (participant) => participant.studentCode === studentCode,
  );
  const isStarted = hasGameStarted(session);

  if (existingParticipant && isStarted && existingParticipant.teamId) {
    const existingTeam = session.teams.find(
      (team) => team.id === existingParticipant.teamId,
    );

    if (!existingTeam) {
      return {
        ok: false as const,
        reason: "ไม่พบทีมเดิมของคุณ กรุณาแจ้งครู",
      };
    }

    existingParticipant.displayName = displayName;
    existingParticipant.connectionStatus = "online";
    existingParticipant.lastSeenAt = now;
    session.updatedAt = now;
    await writeGameSessions(gameSessions);

    return {
      ok: true as const,
      roomCode: session.roomCode,
      team: existingTeam,
    };
  }

  const selectedTeamId = teamId || findAutoTeam(session)?.id;

  if (!selectedTeamId) {
    return {
      ok: false as const,
      reason: "ห้องนี้เต็มแล้ว",
    };
  }

  const teamCapacity = getTeamCapacity(session, selectedTeamId);

  if (!teamCapacity) {
    return {
      ok: false as const,
      reason: "ไม่พบทีมที่เลือก",
    };
  }

  if (
    teamCapacity.isFull &&
    existingParticipant?.teamId !== selectedTeamId
  ) {
    return {
      ok: false as const,
      reason: "ทีมนี้เต็มแล้ว",
    };
  }

  if (existingParticipant) {
    existingParticipant.displayName = displayName;
    existingParticipant.teamId = selectedTeamId;
    existingParticipant.connectionStatus = "online";
    existingParticipant.lastSeenAt = now;

    if (isStarted) {
      existingParticipant.joinedAfterStart = true;
      existingParticipant.isScoreEligible = false;
    }
  } else {
    session.participants.push({
      id: randomUUID(),
      studentCode,
      displayName,
      teamId: selectedTeamId,
      connectionStatus: "online",
      joinedAfterStart: isStarted,
      isScoreEligible: !isStarted,
      joinedAt: now,
      lastSeenAt: now,
    });
  }

  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return {
    ok: true as const,
    roomCode: session.roomCode,
    team: teamCapacity.team,
  };
}

export async function startLocalGameSession({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  if (isSupabaseDataBackend()) {
    return startSupabaseGameSession({ teacherCode, roomCode });
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();
  const session = gameSessions.find(
    (item) =>
      item.roomCode === normalizedRoomCode && item.teacherCode === teacherCode,
  );

  if (!session) {
    return { ok: false as const, reason: "ไม่พบห้องนี้" };
  }

  if (session.status !== "lobby") {
    return { ok: false as const, reason: "ห้องนี้เริ่มเกมไปแล้ว" };
  }

  const activeParticipants = session.participants.filter(isActiveParticipant);

  if (activeParticipants.length === 0) {
    return {
      ok: false as const,
      reason: "ต้องมีนักเรียนอย่างน้อย 1 คนก่อนเริ่มเกม",
    };
  }

  const currentQuestion = await getCurrentQuestion(session);

  if (!currentQuestion) {
    return {
      ok: false as const,
      reason: "ไม่พบคำถามในชุดคำถามนี้",
    };
  }

  const now = new Date().toISOString();

  for (const team of session.teams) {
    team.lockedMemberCount = getTeamMemberCount(session, team.id);
    team.rawScore = 0;
    team.averageScore = 0;
    team.score = 0;
  }

  for (const participant of session.participants) {
    if (isActiveParticipant(participant)) {
      participant.joinedAfterStart = false;
      participant.isScoreEligible = true;
    } else {
      participant.isScoreEligible = false;
    }

    participant.lastSeenAt = now;
  }

  session.answers = [];
  session.status = "question_active";
  session.currentQuestionIndex = 0;
  session.startedAt = now;
  session.endedAt = null;
  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return { ok: true as const, session };
}

export async function lockLocalGameAnswers({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  if (isSupabaseDataBackend()) {
    return lockSupabaseGameAnswers({ teacherCode, roomCode });
  }

  return updateTeacherSession({
    teacherCode,
    roomCode,
    update(session) {
      if (session.status !== "question_active") {
        return "ยังไม่มีคำถามที่กำลังเปิดรับคำตอบ";
      }

      session.status = "answer_locked";
      return null;
    },
  });
}

export async function showLocalGameAnswer({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  if (isSupabaseDataBackend()) {
    return showSupabaseGameAnswer({ teacherCode, roomCode });
  }

  return updateTeacherSession({
    teacherCode,
    roomCode,
    update(session) {
      if (
        session.status !== "question_active" &&
        session.status !== "answer_locked"
      ) {
        return "ยังไม่สามารถเฉลยคำตอบได้";
      }

      session.status = "showing_answer";
      return null;
    },
  });
}

export async function advanceLocalGameQuestion({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  if (isSupabaseDataBackend()) {
    return advanceSupabaseGameQuestion({ teacherCode, roomCode });
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();
  const session = gameSessions.find(
    (item) =>
      item.roomCode === normalizedRoomCode && item.teacherCode === teacherCode,
  );

  if (!session) {
    return { ok: false as const, reason: "ไม่พบห้องนี้" };
  }

  if (
    session.status !== "showing_answer" &&
    session.status !== "answer_locked"
  ) {
    return {
      ok: false as const,
      reason: "ต้องล็อกคำตอบหรือเฉลยก่อนข้อต่อไป",
    };
  }

  const now = new Date().toISOString();

  if (session.currentQuestionIndex >= session.questionCount - 1) {
    session.status = "ended";
    session.endedAt = now;
  } else {
    session.currentQuestionIndex += 1;
    session.status = "question_active";
  }

  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return { ok: true as const, session };
}

export async function endLocalGameSession({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  if (isSupabaseDataBackend()) {
    return endSupabaseGameSession({ teacherCode, roomCode });
  }

  return updateTeacherSession({
    teacherCode,
    roomCode,
    update(session) {
      session.status = "ended";
      session.endedAt = new Date().toISOString();
      return null;
    },
  });
}

async function updateTeacherSession({
  teacherCode,
  roomCode,
  update,
}: {
  teacherCode: string;
  roomCode: string;
  update: (session: StoredGameSession) => string | null;
}) {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();
  const session = gameSessions.find(
    (item) =>
      item.roomCode === normalizedRoomCode && item.teacherCode === teacherCode,
  );

  if (!session) {
    return { ok: false as const, reason: "ไม่พบห้องนี้" };
  }

  const error = update(session);

  if (error) {
    return { ok: false as const, reason: error };
  }

  session.updatedAt = new Date().toISOString();
  await writeGameSessions(gameSessions);

  return { ok: true as const, session };
}

export async function submitLocalAnswer({
  roomCode,
  studentCode,
  answerText,
}: {
  roomCode: string;
  studentCode: string;
  answerText: string;
}) {
  if (isSupabaseDataBackend()) {
    return submitSupabaseAnswer({ roomCode, studentCode, answerText });
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();
  const session = gameSessions.find(
    (item) => item.roomCode === normalizedRoomCode,
  );

  if (!session || session.status === "ended") {
    return { ok: false as const, reason: "ไม่พบห้อง หรือเกมจบแล้ว" };
  }

  if (session.status !== "question_active") {
    return { ok: false as const, reason: "ตอนนี้ปิดรับคำตอบแล้ว" };
  }

  const participant = session.participants.find(
    (item) => item.studentCode === studentCode,
  );

  if (!participant || !participant.teamId) {
    return { ok: false as const, reason: "กรุณาเข้าทีมก่อนตอบคำถาม" };
  }

  const existingAnswer = session.answers.find(
    (answer) =>
      answer.studentCode === studentCode &&
      answer.questionIndex === session.currentQuestionIndex,
  );

  if (existingAnswer) {
    return { ok: false as const, reason: "คุณตอบคำถามข้อนี้ไปแล้ว" };
  }

  const currentQuestion = await getCurrentQuestion(session);

  if (!currentQuestion) {
    return { ok: false as const, reason: "ไม่พบคำถามปัจจุบัน" };
  }

  const trimmedAnswer = answerText.trim();

  if (!trimmedAnswer) {
    return { ok: false as const, reason: "กรุณากรอกคำตอบ" };
  }

  if (trimmedAnswer.length > 2000) {
    return { ok: false as const, reason: "คำตอบยาวเกินไป" };
  }

  const now = new Date().toISOString();
  const rawAwardedPoints = calculateAwardedPoints({
    answerText: trimmedAnswer,
    correctAnswer: currentQuestion.correctAnswer,
    points: currentQuestion.points,
  });
  const answer: StoredAnswer = {
    id: randomUUID(),
    questionIndex: session.currentQuestionIndex,
    studentCode,
    teamId: participant.teamId,
    answerText: trimmedAnswer,
    isCorrect: rawAwardedPoints > 0,
    scoreAwarded: participant.isScoreEligible ? rawAwardedPoints : 0,
    submittedAt: now,
  };

  session.answers.push(answer);
  participant.connectionStatus = "online";
  participant.lastSeenAt = now;
  recalculateTeamScores(session);
  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return { ok: true as const, answer, session };
}

export async function getTeacherDashboardSnapshot(
  session: StoredGameSession,
): Promise<TeacherDashboardSnapshot> {
  const teamSummaries = getTeamSummaries(session);
  const activeParticipantCount = session.participants.filter(isActiveParticipant)
    .length;
  const currentQuestion = await getCurrentQuestion(session);
  const includeCorrectAnswer =
    session.status === "showing_answer" || session.status === "ended";

  return {
    roomCode: session.roomCode,
    questionSetTitle: session.questionSetTitle,
    questionCount: session.questionCount,
    activityName: session.activityName,
    status: session.status,
    teamCount: session.teamCount,
    maxMembersPerTeam: session.maxMembersPerTeam,
    currentQuestionIndex: session.currentQuestionIndex,
    currentQuestion: currentQuestion
      ? toQuestionSnapshot({
          question: currentQuestion,
          session,
          includeCorrectAnswer,
        })
      : null,
    answerProgress: getAnswerProgress(session),
    canStart: session.status === "lobby" && activeParticipantCount > 0,
    emptyTeamCount: teamSummaries.filter((team) => team.memberCount === 0)
      .length,
    incompleteTeamCount: teamSummaries.filter(
      (team) =>
        team.memberCount > 0 && team.memberCount < session.maxMembersPerTeam,
    ).length,
    participants: session.participants,
    teams: session.teams,
    teamSummaries,
    rankedTeams: getRankedTeams(session),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    updatedAt: session.updatedAt,
  };
}

export async function getStudentPlaySnapshot({
  roomCode,
  studentCode,
}: {
  roomCode: string;
  studentCode: string;
}) {
  if (isSupabaseDataBackend()) {
    const session = await getSupabaseGameSessionByRoomCode(roomCode);

    if (!session) {
      return { ok: false as const, reason: "ไม่พบห้องนี้" };
    }

    const participant = session.participants.find(
      (item) => item.studentCode === studentCode,
    );

    if (!participant || !participant.teamId) {
      return {
        ok: false as const,
        reason: "กรุณาเลือกทีมก่อนเข้าห้องเล่น",
      };
    }

    const team = session.teams.find((item) => item.id === participant.teamId);

    if (!team) {
      return {
        ok: false as const,
        reason: "ไม่พบทีมของคุณ กรุณาเลือกทีมอีกครั้ง",
      };
    }

    return {
      ok: true as const,
      snapshot: await buildStudentPlaySnapshot({
        session,
        participant,
        team,
      }),
    };
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();
  const session = gameSessions.find(
    (item) => item.roomCode === normalizedRoomCode,
  );

  if (!session) {
    return { ok: false as const, reason: "ไม่พบห้องนี้" };
  }

  const participant = session.participants.find(
    (item) => item.studentCode === studentCode,
  );

  if (!participant || !participant.teamId) {
    return {
      ok: false as const,
      reason: "กรุณาเลือกทีมก่อนเข้าห้องเล่น",
    };
  }

  const team = session.teams.find((item) => item.id === participant.teamId);

  if (!team) {
    return {
      ok: false as const,
      reason: "ไม่พบทีมของคุณ กรุณาเลือกทีมอีกครั้ง",
    };
  }

  const now = new Date().toISOString();
  participant.connectionStatus = "online";
  participant.lastSeenAt = now;
  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return {
    ok: true as const,
    snapshot: await buildStudentPlaySnapshot({
      session,
      participant,
      team,
    }),
  };
}

async function buildStudentPlaySnapshot({
  session,
  participant,
  team,
}: {
  session: StoredGameSession;
  participant: StoredParticipant;
  team: StoredTeam;
}): Promise<StudentPlaySnapshot> {
  const currentQuestion = await getCurrentQuestion(session);
  const includeCorrectAnswer =
    session.status === "showing_answer" || session.status === "ended";
  const currentAnswer =
    session.answers.find(
      (answer) =>
        answer.studentCode === participant.studentCode &&
        answer.questionIndex === session.currentQuestionIndex,
    ) ?? null;

  return {
    roomCode: session.roomCode,
    questionSetTitle: session.questionSetTitle,
    activityName: session.activityName,
    status: session.status,
    participant,
    team,
    currentQuestionIndex: session.currentQuestionIndex,
    currentQuestion: currentQuestion
      ? toQuestionSnapshot({
          question: currentQuestion,
          session,
          includeCorrectAnswer,
        })
      : null,
    currentAnswer,
    canSubmitAnswer:
      session.status === "question_active" &&
      Boolean(currentQuestion) &&
      !currentAnswer,
    answerProgress: getAnswerProgress(session),
    teamScore: {
      rawScore: team.rawScore,
      averageScore: team.averageScore,
      lockedMemberCount: team.lockedMemberCount,
    },
    rankedTeams: getRankedTeams(session),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    updatedAt: session.updatedAt,
  };
}

