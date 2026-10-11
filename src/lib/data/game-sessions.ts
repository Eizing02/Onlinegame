import { roundMultiplier, powerMultiplier, canUseTeamPower } from "@/lib/game/team-power";
import { getDataDirectory } from "@/lib/data/paths";
import { withLocalLock, writeJsonAtomically } from "@/lib/data/local-lock";
﻿import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  deleteSupabaseGameSession,
  leaveSupabaseTeam,
  renameSupabaseTeam,
  activateSupabaseTeamPower,
} from "@/lib/data/supabase-game-sessions";
import { isAnswerCorrect } from "@/lib/game/answer-checking";
import { generateRoomCode, normalizeRoomCode } from "@/lib/game/room-code";
import { findTeamForNewParticipant } from "@/lib/game/team-assignment";
import type { GameStatus } from "@/types/game";

const GAME_SESSIONS_FILE = path.join(
  getDataDirectory(),
  "game-sessions.json",
);

export type StoredTeam = {
  boostQuestionIndex?: number | null;
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

export type TeamParticipantSummary = StoredParticipant & {
  hasAnsweredCurrentQuestion: boolean;
};

export type StoredAnswer = {
  id: string;
  questionIndex: number;
  studentCode: string;
  teamId: string;
  answerText: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  scoreAwarded: number;
  submittedAt: string;
};

export type StoredGameSession = {
  gameMode?: "classic" | "boss_raid";
  rulesVersion?: 1 | 2;
  questionSnapshot?: StoredQuestion[];
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
  currentQuestionStartedAt: string | null;
  currentQuestionEndsAt: string | null;
  teams: StoredTeam[];
  participants: StoredParticipant[];
  answers: StoredAnswer[];
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionSnapshot = {
  basePoints: number;
  roundMultiplier: number;
  id: string;
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  questionType: StoredQuestion["questionType"];
  imageUrl: string | null;
  options: QuestionOptionSnapshot[];
  points: number;
  timeLimitSeconds: number;
  correctAnswer?: string;
};

export type QuestionOptionSnapshot = {
  id: string;
  optionText: string;
  orderIndex: number;
  isCorrect?: boolean;
};

export type TeamSummary = StoredTeam & {
  memberCount: number;
  maxMembers: number;
  isFull: boolean;
  participants: TeamParticipantSummary[];
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
  revealSummary: {correctCount:number} | null;
  rulesVersion: 1 | 2;
  sessionId: string;
  roomCode: string;
  questionSetTitle: string;
  questionCount: number;
  activityName: string | null;
  status: GameStatus;
  teamCount: number;
  maxMembersPerTeam: number;
  currentQuestionIndex: number;
  currentQuestionStartedAt: string | null;
  currentQuestionEndsAt: string | null;
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
  teamMembers: { id: string; displayName: string; isCaptain: boolean; isScoreEligible: boolean }[];
  teamPower: { available: boolean; active: boolean; usedQuestionIndex: number | null; canActivate: boolean };
  contribution: { base: number; bonus: number; total: number } | null;
  rulesVersion: 1 | 2;
  sessionId: string;
  roomCode: string;
  questionSetTitle: string;
  activityName: string | null;
  status: GameStatus;
  participant: StoredParticipant;
  team: StoredTeam;
  currentQuestionIndex: number;
  currentQuestionStartedAt: string | null;
  currentQuestionEndsAt: string | null;
  currentQuestion: QuestionSnapshot | null;
  currentAnswer: StoredAnswer | null;
  isAnswerRevealed: boolean;
  canSubmitAnswer: boolean;
  canRenameTeam: boolean;
  canChangeTeam: boolean;
  isTeamCaptain: boolean;
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

export type ParticipantScoreSummary = {
  participantId: string;
  studentCode: string;
  displayName: string;
  teamId: string | null;
  teamName: string;
  isScoreEligible: boolean;
  answeredCount: number;
  correctCount: number;
  rawScore: number;
};

function normalizeTeam(team: Partial<StoredTeam>, index: number): StoredTeam {
  const rawScore = Number(team.rawScore ?? team.score ?? 0);
  const averageScore = Number(team.averageScore ?? team.score ?? 0);

  return {
    id: String(team.id),
    boostQuestionIndex: team.boostQuestionIndex ?? null,
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
    selectedOptionId: answer.selectedOptionId ?? null,
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
    rulesVersion: session.rulesVersion ?? 1,
    questionSnapshot: session.questionSnapshot,
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
    currentQuestionStartedAt: session.currentQuestionStartedAt ?? null,
    currentQuestionEndsAt: session.currentQuestionEndsAt ?? null,
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
    return (JSON.parse(raw) as Partial<StoredGameSession>[]).map(normalizeGameSession).sort((a, b) => Number(a.status === "ended") - Number(b.status === "ended") || b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeGameSessions(gameSessions: StoredGameSession[]) {
  await writeJsonAtomically(GAME_SESSIONS_FILE, gameSessions);
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

function getTeamMembers(session: StoredGameSession, teamId: string) {
  return session.participants
    .filter(
      (participant) =>
        participant.teamId === teamId &&
        participant.connectionStatus !== "left",
    )
    .toSorted(
      (a, b) =>
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime() || a.id.localeCompare(b.id),
    );
}

function getTeamCaptain(session: StoredGameSession, teamId: string) {
  return getTeamMembers(session, teamId)[0] ?? null;
}

function isTeamCaptain(
  session: StoredGameSession,
  participant: StoredParticipant,
) {
  if (!participant.teamId) {
    return false;
  }

  return getTeamCaptain(session, participant.teamId)?.id === participant.id;
}

function isQuestionTimerExpired(session: StoredGameSession, now = new Date()) {
  return Boolean(
    session.currentQuestionEndsAt &&
      now.getTime() > new Date(session.currentQuestionEndsAt).getTime(),
  );
}

function getQuestionTimerWindow(question: StoredQuestion, nowIso: string) {
  const startedAt = new Date(nowIso);
  const endsAt = new Date(
    startedAt.getTime() + question.timeLimitSeconds * 1000,
  ).toISOString();

  return {
    currentQuestionStartedAt: nowIso,
    currentQuestionEndsAt: endsAt,
  };
}

async function assignCurrentQuestionTimer({
  session,
  nowIso,
}: {
  session: StoredGameSession;
  nowIso: string;
}) {
  const question = await getCurrentQuestion(session);

  if (!question) {
    session.currentQuestionStartedAt = null;
    session.currentQuestionEndsAt = null;
    return null;
  }

  const timer = getQuestionTimerWindow(question, nowIso);
  session.currentQuestionStartedAt = timer.currentQuestionStartedAt;
  session.currentQuestionEndsAt = timer.currentQuestionEndsAt;

  return question;
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
    questionType: question.questionType,
    imageUrl: question.imageUrl,
    options: question.options.map((option) => ({
      id: option.id,
      optionText: option.optionText,
      orderIndex: option.orderIndex,
      isCorrect: includeCorrectAnswer ? option.isCorrect : undefined,
    })),
    basePoints: question.points,
    roundMultiplier: roundMultiplier(session),
    points: question.points * roundMultiplier(session),
    timeLimitSeconds: question.timeLimitSeconds,
    correctAnswer: includeCorrectAnswer ? question.correctAnswer : undefined,
  };
}

async function getCurrentQuestion(session: StoredGameSession) {
  if (session.questionSnapshot) return session.questionSnapshot[session.currentQuestionIndex] ?? null;
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
  const answeredStudentCodes = new Set(
    getCurrentQuestionAnswers(session).map((answer) => answer.studentCode),
  );

  return session.teams.map((team) => {
    const memberCount = getTeamMemberCount(session, team.id);
    const participants = session.participants
      .filter(
        (participant) =>
          participant.teamId === team.id &&
          participant.connectionStatus !== "left",
      )
      .toSorted(
        (a, b) =>
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime() || a.id.localeCompare(b.id),
      )
      .map((participant) => ({
        ...participant,
        hasAnsweredCurrentQuestion: answeredStudentCodes.has(
          participant.studentCode,
        ),
      }));

    return {
      ...team,
      memberCount,
      maxMembers: session.maxMembersPerTeam,
      isFull: memberCount >= session.maxMembersPerTeam,
      participants,
    };
  });
}

function getVisibleTeamScores({
  session,
  excludeQuestionIndex,
}: {
  session: StoredGameSession;
  excludeQuestionIndex?: number;
}) {
  if (excludeQuestionIndex === undefined) {
    return session.teams;
  }

  return session.teams.map((team) => {
    const rawScore = session.answers
      .filter(
        (answer) =>
          answer.teamId === team.id &&
          answer.questionIndex !== excludeQuestionIndex,
      )
      .reduce((sum, answer) => sum + answer.scoreAwarded, 0);
    const divisor = team.lockedMemberCount ?? 0;
    const averageScore = divisor > 0 ? rawScore / divisor : 0;

    return {
      ...team,
      rawScore,
      averageScore: Number(averageScore.toFixed(2)),
      score: Number(averageScore.toFixed(2)),
    };
  });
}

export function getRankedTeams(
  session: StoredGameSession,
  options: { excludeQuestionIndex?: number } = {},
): RankedTeam[] {
  const teams = getVisibleTeamScores({
    session,
    excludeQuestionIndex: options.excludeQuestionIndex,
  });
  const scoreableTeams = teams
    .filter((team) => (team.lockedMemberCount ?? 0) > 0)
    .toSorted(
      (a, b) =>
        b.averageScore - a.averageScore ||
        a.teamNumber - b.teamNumber,
    );
  const unrankedTeams = teams
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
  return withLocalLock(async () => {

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
  const frozenSet = await getLocalQuestionSet(teacherCode, questionSetId);
  if (!frozenSet?.questions.length) throw new Error("ชุดคำถามไม่มีคำถาม");
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
    rulesVersion: 2,
    questionSnapshot: structuredClone(frozenSet.questions),
    id: randomUUID(),
    roomCode,
    teacherCode,
    questionSetId,
    questionSetTitle,
    questionCount: frozenSet.questions.length,
    activityName,
    status: "lobby",
    teamCount,
    maxMembersPerTeam,
    currentQuestionIndex: 0,
    currentQuestionStartedAt: null,
    currentQuestionEndsAt: null,
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

  });
}

export async function getActiveTeacherGameSession(teacherCode: string) {
  return withLocalLock(async () => {

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

  });
}

export async function getActiveStudentGameSession(studentCode: string) {
  if (isSupabaseDataBackend()) {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
    const { data, error } = await createSupabaseAdminClient().from("participants")
      .select("session_id, game_sessions!inner(room_code, status)").eq("student_code", studentCode)
      .not("team_id", "is", null).neq("connection_status", "left").neq("game_sessions.status", "ended")
      .order("joined_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    const room = data?.game_sessions;
    const activeRoom = (Array.isArray(room) ? room[0] : room) as { room_code: string } | null;
    return activeRoom ? { roomCode: activeRoom.room_code } : null;
  }
  return withLocalLock(async () => (await readGameSessions()).find(room => room.status !== "ended" && room.participants.some(p => p.studentCode === studentCode && p.teamId && p.connectionStatus !== "left")) ?? null);
}

export async function getLocalGameSessionByRoomCode(roomCode: string) {
  return withLocalLock(async () => {

  if (isSupabaseDataBackend()) {
    return getSupabaseGameSessionByRoomCode(roomCode);
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();

  return (
    gameSessions.find((session) => session.roomCode === normalizedRoomCode) ??
    null
  );

  });
}

export async function getLocalTeacherGameSession(
  teacherCode: string,
  roomCode: string,
) {
  return withLocalLock(async () => {

  if (isSupabaseDataBackend()) {
    return getSupabaseTeacherGameSession(teacherCode, roomCode);
  }

  const session = await getLocalGameSessionByRoomCode(roomCode);

  if (!session || session.teacherCode !== teacherCode) {
    return null;
  }

  return session;

  });
}

export async function getJoinableGameSession(roomCode: string) {
  return withLocalLock(async () => {

  const session = await getLocalGameSessionByRoomCode(roomCode);

  if (!session || session.status === "ended") {
    return null;
  }

  return session;

  });
}

export async function joinLocalGameSession({
  roomCode,
  studentCode,
  displayName,
  teamId,
  authUserId,
}: {
  roomCode: string;
  studentCode: string;
  displayName: string;
  teamId?: string;
  authUserId?: string;
}) {
  return withLocalLock(async () => {

  if (isSupabaseDataBackend()) {
    return joinSupabaseGameSession({
      roomCode,
      studentCode,
      displayName,
      teamId,
      authUserId,
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

  });
}

export async function startLocalGameSession({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  return withLocalLock(async () => {

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
  Object.assign(session, getQuestionTimerWindow(currentQuestion, now));
  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return { ok: true as const, session };

  });
}

export async function lockLocalGameAnswers({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  return withLocalLock(async () => {

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

  });
}

export async function showLocalGameAnswer({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  return withLocalLock(async () => {

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

  });
}

export async function advanceLocalGameQuestion({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  return withLocalLock(async () => {

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
    session.status !== "answer_locked" &&
    session.status !== "question_active"
  ) {
    return {
      ok: false as const,
      reason: "ยังไม่สามารถไปข้อถัดไปได้",
    };
  }

  const now = new Date().toISOString();

  if (session.currentQuestionIndex >= session.questionCount - 1) {
    session.status = "ended";
    session.endedAt = now;
    session.currentQuestionStartedAt = null;
    session.currentQuestionEndsAt = null;
  } else {
    session.currentQuestionIndex += 1;
    session.status = "question_active";
    await assignCurrentQuestionTimer({ session, nowIso: now });
  }

  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return { ok: true as const, session };

  });
}

export async function endLocalGameSession({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  return withLocalLock(async () => {

  if (isSupabaseDataBackend()) {
    return endSupabaseGameSession({ teacherCode, roomCode });
  }

  return updateTeacherSession({
    teacherCode,
    roomCode,
    update(session) {
      session.status = "ended";
      session.endedAt = new Date().toISOString();
      session.currentQuestionStartedAt = null;
      session.currentQuestionEndsAt = null;
      return null;
    },
  });

  });
}

export async function leaveLocalTeam({
  roomCode,
  studentCode,
}: {
  roomCode: string;
  studentCode: string;
}) {
  return withLocalLock(async () => {

  if (isSupabaseDataBackend()) {
    return leaveSupabaseTeam({ roomCode, studentCode });
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();
  const session = gameSessions.find(
    (item) => item.roomCode === normalizedRoomCode,
  );

  if (!session || session.status === "ended") {
    return { ok: false as const, reason: "ไม่พบห้อง หรือเกมจบแล้ว" };
  }

  if (session.status !== "lobby") {
    return { ok: false as const, reason: "เริ่มเกมแล้ว ไม่สามารถเปลี่ยนทีมได้" };
  }

  const participant = session.participants.find(
    (item) => item.studentCode === studentCode,
  );

  if (!participant) {
    return { ok: false as const, reason: "ยังไม่ได้เข้าห้องนี้" };
  }

  const now = new Date().toISOString();
  participant.teamId = null;
  participant.connectionStatus = "online";
  participant.lastSeenAt = now;
  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return { ok: true as const, session };

  });
}

export async function renameLocalTeam({
  roomCode,
  studentCode,
  teamName,
}: {
  roomCode: string;
  studentCode: string;
  teamName: string;
}) {
  return withLocalLock(async () => {

  if (isSupabaseDataBackend()) {
    return renameSupabaseTeam({ roomCode, studentCode, teamName });
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const nextTeamName = teamName.trim().replace(/\s+/g, " ");

  if (nextTeamName.length < 2 || nextTeamName.length > 30) {
    return { ok: false as const, reason: "ชื่อทีมต้องมี 2-30 ตัวอักษร" };
  }

  const gameSessions = await readGameSessions();
  const session = gameSessions.find(
    (item) => item.roomCode === normalizedRoomCode,
  );

  if (!session || session.status === "ended") {
    return { ok: false as const, reason: "ไม่พบห้อง หรือเกมจบแล้ว" };
  }

  if (session.status !== "lobby") {
    return { ok: false as const, reason: "เริ่มเกมแล้ว ไม่สามารถเปลี่ยนชื่อทีมได้" };
  }

  const participant = session.participants.find(
    (item) => item.studentCode === studentCode,
  );

  if (!participant?.teamId) {
    return { ok: false as const, reason: "กรุณาเลือกทีมก่อนเปลี่ยนชื่อทีม" };
  }

  if (!isTeamCaptain(session, participant)) {
    return { ok: false as const, reason: "เฉพาะคนแรกของทีมเท่านั้นที่เปลี่ยนชื่อทีมได้" };
  }

  const team = session.teams.find((item) => item.id === participant.teamId);

  if (!team) {
    return { ok: false as const, reason: "ไม่พบทีมของคุณ" };
  }

  const now = new Date().toISOString();
  team.teamName = nextTeamName;
  participant.connectionStatus = "online";
  participant.lastSeenAt = now;
  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return { ok: true as const, session };

  });
}

export async function deleteLocalGameSession({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  return withLocalLock(async () => {

  if (isSupabaseDataBackend()) {
    return deleteSupabaseGameSession({ teacherCode, roomCode });
  }

  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const gameSessions = await readGameSessions();
  const sessionIndex = gameSessions.findIndex(
    (item) =>
      item.roomCode === normalizedRoomCode && item.teacherCode === teacherCode,
  );

  if (sessionIndex === -1) {
    return { ok: false as const, reason: "ไม่พบห้องนี้" };
  }

  gameSessions.splice(sessionIndex, 1);
  await writeGameSessions(gameSessions);

  return { ok: true as const };

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
  selectedOptionId,
  expectedQuestionId,
  expectedSessionId,
}: {
  roomCode: string;
  studentCode: string;
  answerText?: string;
  selectedOptionId?: string;
  expectedQuestionId?: string;
  expectedSessionId?: string;
}) {
  return withLocalLock(async () => {

  if (isSupabaseDataBackend()) {
    return submitSupabaseAnswer({
      roomCode,
      studentCode,
      answerText,
      selectedOptionId,
      expectedQuestionId,
      expectedSessionId,
    });
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

  if ((expectedSessionId !== undefined && session.id !== expectedSessionId) || (expectedQuestionId !== undefined && currentQuestion?.id !== expectedQuestionId)) {
    return { ok: false as const, reason: "คำถามเปลี่ยนแล้ว กรุณารอข้อมูลล่าสุดก่อนตอบ" };
  }

  if (!currentQuestion) {
    return { ok: false as const, reason: "ไม่พบคำถามปัจจุบัน" };
  }

  const now = new Date().toISOString();

  if (isQuestionTimerExpired(session, new Date(now))) {
    return { ok: false as const, reason: "หมดเวลาตอบคำถามข้อนี้แล้ว" };
  }

  let trimmedAnswer = (answerText ?? "").trim();
  let selectedOption = null as StoredQuestion["options"][number] | null;
  let rawAwardedPoints = 0;
  let isCorrect = false;

  if (currentQuestion.questionType === "short_text") {
    if (!trimmedAnswer) {
      return { ok: false as const, reason: "กรุณากรอกคำตอบ" };
    }

    if (trimmedAnswer.length > 2000) {
      return { ok: false as const, reason: "คำตอบยาวเกินไป" };
    }

    isCorrect = isAnswerCorrect(trimmedAnswer, currentQuestion.correctAnswer);
    rawAwardedPoints = isCorrect ? currentQuestion.points : 0;
  } else {
    selectedOption =
      currentQuestion.options.find((option) => option.id === selectedOptionId) ??
      null;

    if (!selectedOption) {
      return { ok: false as const, reason: "กรุณาเลือกคำตอบ" };
    }

    trimmedAnswer = selectedOption.optionText;
    isCorrect = selectedOption.isCorrect;
    rawAwardedPoints = isCorrect ? currentQuestion.points : 0;
  }

  const answer: StoredAnswer = {
    id: randomUUID(),
    questionIndex: session.currentQuestionIndex,
    studentCode,
    teamId: participant.teamId,
    answerText: trimmedAnswer,
    selectedOptionId: selectedOption?.id ?? null,
    isCorrect,
    scoreAwarded: participant.isScoreEligible ? rawAwardedPoints * roundMultiplier(session) * powerMultiplier(session, session.teams.find(t => t.id === participant.teamId)!) : 0,
    submittedAt: now,
  };

  session.answers.push(answer);
  participant.connectionStatus = "online";
  participant.lastSeenAt = now;
  recalculateTeamScores(session);
  session.updatedAt = now;
  await writeGameSessions(gameSessions);

  return { ok: true as const, answer, session };

  });
}

export function getParticipantScoreSummaries(
  session: StoredGameSession,
): ParticipantScoreSummary[] {
  const teamNameById = new Map(
    session.teams.map((team) => [team.id, team.teamName] as const),
  );

  return session.participants
    .filter((participant) => participant.connectionStatus !== "left")
    .map((participant) => {
      const answers = session.answers.filter(
        (answer) => answer.studentCode === participant.studentCode,
      );
      const rawScore = answers.reduce(
        (sum, answer) => sum + answer.scoreAwarded,
        0,
      );

      return {
        participantId: participant.id,
        studentCode: participant.studentCode,
        displayName: participant.displayName,
        teamId: participant.teamId,
        teamName: participant.teamId
          ? (teamNameById.get(participant.teamId) ?? "ไม่พบทีม")
          : "ยังไม่เลือกทีม",
        isScoreEligible: participant.isScoreEligible,
        answeredCount: answers.length,
        correctCount: answers.filter((answer) => answer.isCorrect).length,
        rawScore,
      };
    })
    .toSorted(
      (a, b) =>
        (a.teamName || "").localeCompare(b.teamName || "", "th") ||
        b.rawScore - a.rawScore ||
        a.displayName.localeCompare(b.displayName, "th"),
    );
}

export async function getTeacherDashboardSnapshot(
  session: StoredGameSession,
): Promise<TeacherDashboardSnapshot> {
  return withLocalLock(async () => {

  const hideScore = session.status === "question_active" || session.status === "answer_locked";
  const visibleTeams = getVisibleTeamScores({ session, excludeQuestionIndex: hideScore ? session.currentQuestionIndex : undefined });
  const visibleSession = { ...session, teams: visibleTeams };
  const teamSummaries = getTeamSummaries(visibleSession);
  const activeParticipantCount = session.participants.filter(isActiveParticipant)
    .length;
  const currentQuestion = await getCurrentQuestion(session);
  const includeCorrectAnswer =
    session.status === "showing_answer" || session.status === "ended";

  return {
    rulesVersion: session.rulesVersion ?? 1,
    sessionId: session.id,
    roomCode: session.roomCode,
    questionSetTitle: session.questionSetTitle,
    questionCount: session.questionCount,
    activityName: session.activityName,
    status: session.status,
    teamCount: session.teamCount,
    maxMembersPerTeam: session.maxMembersPerTeam,
    currentQuestionIndex: session.currentQuestionIndex,
    currentQuestionStartedAt: session.currentQuestionStartedAt,
    currentQuestionEndsAt: session.currentQuestionEndsAt,
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
    revealSummary: includeCorrectAnswer ? {correctCount: session.answers.filter(a => a.questionIndex === session.currentQuestionIndex && a.isCorrect).length} : null,
    teams: visibleTeams,
    teamSummaries,
    rankedTeams: getRankedTeams(session, { excludeQuestionIndex: hideScore ? session.currentQuestionIndex : undefined }),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    updatedAt: session.updatedAt,
  };

  });
}

export async function getStudentPlaySnapshot({
  roomCode,
  studentCode,
}: {
  roomCode: string;
  studentCode: string;
}) {
  return withLocalLock(async () => {

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

  return {
    ok: true as const,
    snapshot: await buildStudentPlaySnapshot({
      session,
      participant,
      team,
    }),
  };

  });
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
  const shouldShowQuestion = session.status !== "lobby";
  const currentQuestion = shouldShowQuestion
    ? await getCurrentQuestion(session)
    : null;
  const includeCorrectAnswer =
    session.status === "showing_answer" || session.status === "ended";
  const currentAnswer =
    session.answers.find(
      (answer) =>
        answer.studentCode === participant.studentCode &&
        answer.questionIndex === session.currentQuestionIndex,
    ) ?? null;
  const visibleAnswer =
    currentAnswer && includeCorrectAnswer
      ? currentAnswer
      : currentAnswer
        ? {
            ...currentAnswer,
            isCorrect: false,
            scoreAwarded: 0,
          }
        : null;
  const expired = isQuestionTimerExpired(session);
  const captain = isTeamCaptain(session, participant);
  const hideCurrentQuestionScore =
    !includeCorrectAnswer &&
    (session.status === "question_active" || session.status === "answer_locked");
  const visibleTeams = getVisibleTeamScores({
    session,
    excludeQuestionIndex: hideCurrentQuestionScore
      ? session.currentQuestionIndex
      : undefined,
  });
  const visibleTeam = visibleTeams.find((item) => item.id === team.id) ?? team;

  return {
    rulesVersion: session.rulesVersion ?? 1,
    sessionId: session.id,
    roomCode: session.roomCode,
    questionSetTitle: session.questionSetTitle,
    activityName: session.activityName,
    status: session.status,
    participant,
    team: visibleTeam,
    teamMembers: getTeamMembers(session, team.id).map(member => ({ id: member.id, displayName: member.displayName, isCaptain: getTeamCaptain(session, team.id)?.id === member.id, isScoreEligible: member.isScoreEligible })),
    teamPower: { available: session.rulesVersion === 2 && team.boostQuestionIndex == null, active: powerMultiplier(session, team) > 1, usedQuestionIndex: team.boostQuestionIndex ?? null, canActivate: canUseTeamPower(session, team, participant) },
    contribution: includeCorrectAnswer && currentAnswer ? { total: currentAnswer.scoreAwarded / (team.lockedMemberCount || 1), base: currentAnswer.scoreAwarded / powerMultiplier(session, team) / (team.lockedMemberCount || 1), bonus: (currentAnswer.scoreAwarded - currentAnswer.scoreAwarded / powerMultiplier(session, team)) / (team.lockedMemberCount || 1) } : null,
    currentQuestionIndex: session.currentQuestionIndex,
    currentQuestionStartedAt: session.currentQuestionStartedAt,
    currentQuestionEndsAt: session.currentQuestionEndsAt,
    currentQuestion: currentQuestion
      ? toQuestionSnapshot({
          question: currentQuestion,
          session,
          includeCorrectAnswer,
        })
      : null,
    currentAnswer: visibleAnswer,
    isAnswerRevealed: includeCorrectAnswer,
    canSubmitAnswer:
      session.status === "question_active" &&
      Boolean(currentQuestion) &&
      !currentAnswer &&
      !expired,
    canRenameTeam: session.status === "lobby" && captain,
    canChangeTeam: session.status === "lobby",
    isTeamCaptain: captain,
    answerProgress: getAnswerProgress(session),
    teamScore: {
      rawScore: visibleTeam.rawScore,
      averageScore: visibleTeam.averageScore,
      lockedMemberCount: visibleTeam.lockedMemberCount,
    },
    rankedTeams: getRankedTeams(session, {
      excludeQuestionIndex: hideCurrentQuestionScore
        ? session.currentQuestionIndex
        : undefined,
    }),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    updatedAt: session.updatedAt,
  };
}

export async function activateLocalTeamPower(input: { roomCode: string; studentCode: string; expectedSessionId: string; expectedQuestionId: string }) {
  if (isSupabaseDataBackend()) return activateSupabaseTeamPower(input);
  return withLocalLock(async () => {
    const sessions = await readGameSessions();
    const session = sessions.find(s => s.roomCode === normalizeRoomCode(input.roomCode));
    if (!session || session.id !== input.expectedSessionId) return { ok: false as const, reason: "ห้องเปลี่ยนแล้ว กรุณาเปิดหน้าใหม่" };
    const question = await getCurrentQuestion(session);
    const participant = session.participants.find(p => p.studentCode === input.studentCode);
    const team = session.teams.find(t => t.id === participant?.teamId);
    if (question?.id !== input.expectedQuestionId || !participant || !team || !canUseTeamPower(session, team, participant)) return { ok: false as const, reason: "ใช้พลังไม่ได้ ต้องเป็นหัวหน้าทีมและใช้ก่อนคำตอบแรกของทีม ภายในเวลาตอบ" };
    team.boostQuestionIndex = session.currentQuestionIndex;
    session.updatedAt = new Date().toISOString();
    await writeGameSessions(sessions);
    return { ok: true as const };
  });
}
