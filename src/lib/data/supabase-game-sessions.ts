import { getSupabaseQuestionSet } from "@/lib/data/supabase-question-bank";
import { generateRoomCode, normalizeRoomCode } from "@/lib/game/room-code";
import { calculateAwardedPoints } from "@/lib/game/scoring";
import { findTeamForNewParticipant } from "@/lib/game/team-assignment";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  StoredAnswer,
  StoredGameSession,
  StoredParticipant,
  StoredTeam,
} from "@/lib/data/game-sessions";

type SessionRow = {
  id: string;
  room_code: string;
  teacher_code: string;
  question_set_id: string;
  question_set_title: string;
  question_count: number;
  activity_name: string | null;
  status: StoredGameSession["status"];
  team_count: number;
  max_members_per_team: number;
  current_question_index: number;
  current_question_started_at: string | null;
  current_question_ends_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type TeamRow = {
  id: string;
  team_number: number;
  team_name: string;
  score: number | string;
  raw_score: number;
  average_score: number | string;
  locked_member_count: number | null;
};

type ParticipantRow = {
  id: string;
  student_code: string;
  display_name: string;
  team_id: string | null;
  connection_status: StoredParticipant["connectionStatus"];
  joined_after_start: boolean;
  is_score_eligible: boolean;
  joined_at: string;
  last_seen_at: string;
};

type AnswerRow = {
  id: string;
  question_index: number;
  student_code: string;
  team_id: string;
  answer_text: string;
  is_correct: boolean;
  score_awarded: number;
  submitted_at: string;
};

function mapTeam(row: TeamRow): StoredTeam {
  return {
    id: row.id,
    teamNumber: row.team_number,
    teamName: row.team_name,
    score: Number(row.score),
    rawScore: row.raw_score,
    averageScore: Number(row.average_score),
    lockedMemberCount: row.locked_member_count,
  };
}

function mapParticipant(row: ParticipantRow): StoredParticipant {
  return {
    id: row.id,
    studentCode: row.student_code,
    displayName: row.display_name,
    teamId: row.team_id,
    connectionStatus: row.connection_status,
    joinedAfterStart: row.joined_after_start,
    isScoreEligible: row.is_score_eligible,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
  };
}

function mapAnswer(row: AnswerRow): StoredAnswer {
  return {
    id: row.id,
    questionIndex: row.question_index,
    studentCode: row.student_code,
    teamId: row.team_id,
    answerText: row.answer_text,
    isCorrect: row.is_correct,
    scoreAwarded: row.score_awarded,
    submittedAt: row.submitted_at,
  };
}

async function mapSession(row: SessionRow): Promise<StoredGameSession> {
  const supabase = createSupabaseAdminClient();
  const [teamsResult, participantsResult, answersResult] = await Promise.all([
    supabase
      .from("teams")
      .select(
        "id, team_number, team_name, score, raw_score, average_score, locked_member_count",
      )
      .eq("session_id", row.id)
      .order("team_number", { ascending: true })
      .returns<TeamRow[]>(),
    supabase
      .from("participants")
      .select(
        "id, student_code, display_name, team_id, connection_status, joined_after_start, is_score_eligible, joined_at, last_seen_at",
      )
      .eq("session_id", row.id)
      .order("joined_at", { ascending: true })
      .returns<ParticipantRow[]>(),
    supabase
      .from("answers")
      .select(
        "id, question_index, student_code, team_id, answer_text, is_correct, score_awarded, submitted_at",
      )
      .eq("session_id", row.id)
      .order("submitted_at", { ascending: true })
      .returns<AnswerRow[]>(),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (participantsResult.error) throw participantsResult.error;
  if (answersResult.error) throw answersResult.error;

  return {
    id: row.id,
    roomCode: row.room_code,
    teacherCode: row.teacher_code,
    questionSetId: row.question_set_id,
    questionSetTitle: row.question_set_title,
    questionCount: row.question_count,
    activityName: row.activity_name,
    status: row.status,
    teamCount: row.team_count,
    maxMembersPerTeam: row.max_members_per_team,
    currentQuestionIndex: row.current_question_index,
    currentQuestionStartedAt: row.current_question_started_at,
    currentQuestionEndsAt: row.current_question_ends_at,
    teams: (teamsResult.data ?? []).map(mapTeam),
    participants: (participantsResult.data ?? []).map(mapParticipant),
    answers: (answersResult.data ?? []).map(mapAnswer),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchSessionByRoomCode(roomCode: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select(
      "id, room_code, teacher_code, question_set_id, question_set_title, question_count, activity_name, status, team_count, max_members_per_team, current_question_index, current_question_started_at, current_question_ends_at, started_at, ended_at, created_at, updated_at",
    )
    .eq("room_code", normalizeRoomCode(roomCode))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SessionRow>();

  if (error) throw error;
  return data ? mapSession(data) : null;
}

async function fetchSessionById(sessionId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select(
      "id, room_code, teacher_code, question_set_id, question_set_title, question_count, activity_name, status, team_count, max_members_per_team, current_question_index, current_question_started_at, current_question_ends_at, started_at, ended_at, created_at, updated_at",
    )
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();

  if (error) throw error;
  return data ? mapSession(data) : null;
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
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
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

function getQuestionTimerWindow({
  timeLimitSeconds,
  nowIso,
}: {
  timeLimitSeconds: number;
  nowIso: string;
}) {
  const startedAt = new Date(nowIso);

  return {
    current_question_started_at: nowIso,
    current_question_ends_at: new Date(
      startedAt.getTime() + timeLimitSeconds * 1000,
    ).toISOString(),
  };
}

function hasGameStarted(session: StoredGameSession) {
  return session.status !== "lobby";
}

function isActiveParticipant(participant: StoredParticipant) {
  return participant.connectionStatus !== "left" && Boolean(participant.teamId);
}

function findAutoTeam(session: StoredGameSession) {
  const candidates = session.teams.map((team) => ({
    id: team.id,
    memberCount: getTeamMemberCount(session, team.id),
    maxMembers: session.maxMembersPerTeam,
  }));

  return findTeamForNewParticipant(candidates);
}

async function insertEvent(
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("game_events").insert({
    session_id: sessionId,
    event_type: eventType,
    payload,
  });

  if (error) throw error;
  await touchSession(sessionId);
}

async function touchSession(sessionId: string, now = new Date().toISOString()) {
  const { error } = await createSupabaseAdminClient()
    .from("game_sessions")
    .update({ updated_at: now })
    .eq("id", sessionId);

  if (error) throw error;
}

async function recalculateTeamScores(sessionId: string) {
  const session = await fetchSessionById(sessionId);

  if (!session) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  for (const team of session.teams) {
    const rawScore = session.answers
      .filter((answer) => answer.teamId === team.id)
      .reduce((sum, answer) => sum + answer.scoreAwarded, 0);
    const divisor = team.lockedMemberCount ?? 0;
    const averageScore = divisor > 0 ? Number((rawScore / divisor).toFixed(2)) : 0;
    const { error } = await supabase
      .from("teams")
      .update({
        raw_score: rawScore,
        average_score: averageScore,
        score: averageScore,
      })
      .eq("id", team.id);

    if (error) throw error;
  }
}

function generateSupabaseRoomCodeError(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function createSupabaseGameSession({
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
  const supabase = createSupabaseAdminClient();

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const roomCode = generateRoomCode();
    const { data, error } = await supabase
      .from("game_sessions")
      .insert({
        room_code: roomCode,
        teacher_code: teacherCode,
        question_set_id: questionSetId,
        question_set_title: questionSetTitle,
        question_count: questionCount,
        activity_name: activityName,
        team_count: teamCount,
        max_members_per_team: maxMembersPerTeam,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      if (generateSupabaseRoomCodeError(error)) {
        continue;
      }

      throw error;
    }

    const teams = Array.from({ length: teamCount }, (_, index) => ({
      session_id: data.id,
      team_number: index + 1,
      team_name: `กลุ่ม ${index + 1}`,
    }));
    const { error: teamsError } = await supabase.from("teams").insert(teams);

    if (teamsError) throw teamsError;

    await insertEvent(data.id, "start_question", { roomCode });
    const session = await fetchSessionById(data.id);

    if (!session) {
      throw new Error("สร้างห้องแล้วแต่โหลดข้อมูลห้องไม่สำเร็จ");
    }

    return session;
  }

  throw new Error("ไม่มีรหัสห้องว่าง");
}

export async function getSupabaseActiveTeacherGameSession(teacherCode: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select(
      "id, room_code, teacher_code, question_set_id, question_set_title, question_count, activity_name, status, team_count, max_members_per_team, current_question_index, current_question_started_at, current_question_ends_at, started_at, ended_at, created_at, updated_at",
    )
    .eq("teacher_code", teacherCode)
    .neq("status", "ended")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SessionRow>();

  if (error) throw error;
  return data ? mapSession(data) : null;
}

export async function getSupabaseGameSessionByRoomCode(roomCode: string) {
  return fetchSessionByRoomCode(roomCode);
}

export async function getSupabaseTeacherGameSession(
  teacherCode: string,
  roomCode: string,
) {
  const session = await fetchSessionByRoomCode(roomCode);

  if (!session || session.teacherCode !== teacherCode) {
    return null;
  }

  return session;
}

export async function joinSupabaseGameSession({
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
  const session = await fetchSessionByRoomCode(roomCode);

  if (!session || session.status === "ended") {
    return {
      ok: false as const,
      reason: "ไม่พบห้อง หรือห้องนี้จบเกมแล้ว",
    };
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const existingParticipant = session.participants.find(
    (participant) => participant.studentCode === studentCode,
  );
  const isStarted = hasGameStarted(session);

  if (existingParticipant && isStarted && existingParticipant.teamId) {
    const { error } = await supabase
      .from("participants")
      .update({
        display_name: displayName,
        connection_status: "online",
        last_seen_at: now,
      })
      .eq("id", existingParticipant.id);

    if (error) throw error;

    const existingTeam = session.teams.find(
      (team) => team.id === existingParticipant.teamId,
    );

    if (!existingTeam) {
      return {
        ok: false as const,
        reason: "ไม่พบทีมเดิมของคุณ กรุณาแจ้งครู",
      };
    }

    return { ok: true as const, roomCode: session.roomCode, team: existingTeam };
  }

  const selectedTeamId = teamId || findAutoTeam(session)?.id;

  if (!selectedTeamId) {
    return { ok: false as const, reason: "ห้องนี้เต็มแล้ว" };
  }

  const selectedTeam = session.teams.find((team) => team.id === selectedTeamId);

  if (!selectedTeam) {
    return { ok: false as const, reason: "ไม่พบทีมที่เลือก" };
  }

  const memberCount = getTeamMemberCount(session, selectedTeamId);

  if (
    memberCount >= session.maxMembersPerTeam &&
    existingParticipant?.teamId !== selectedTeamId
  ) {
    return { ok: false as const, reason: "ทีมนี้เต็มแล้ว" };
  }

  if (existingParticipant) {
    const { error } = await supabase
      .from("participants")
      .update({
        display_name: displayName,
        team_id: selectedTeamId,
        connection_status: "online",
        joined_after_start: isStarted,
        is_score_eligible: !isStarted,
        last_seen_at: now,
      })
      .eq("id", existingParticipant.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("participants").insert({
      session_id: session.id,
      team_id: selectedTeamId,
      student_code: studentCode,
      display_name: displayName,
      connection_status: "online",
      joined_after_start: isStarted,
      is_score_eligible: !isStarted,
      joined_at: now,
      last_seen_at: now,
    });

    if (error) throw error;
  }

  await insertEvent(session.id, "join_room", { studentCode, teamId: selectedTeamId });
  return { ok: true as const, roomCode: session.roomCode, team: selectedTeam };
}

export async function startSupabaseGameSession({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  const session = await getSupabaseTeacherGameSession(teacherCode, roomCode);

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

  const questionSet = await getSupabaseQuestionSet(
    session.teacherCode,
    session.questionSetId,
  );

  if (!questionSet?.questions[0]) {
    return { ok: false as const, reason: "ไม่พบคำถามในชุดคำถามนี้" };
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const firstQuestion = questionSet.questions[0];
  const questionTimer = getQuestionTimerWindow({
    timeLimitSeconds: firstQuestion.timeLimitSeconds,
    nowIso: now,
  });

  for (const team of session.teams) {
    const { error } = await supabase
      .from("teams")
      .update({
        locked_member_count: getTeamMemberCount(session, team.id),
        raw_score: 0,
        average_score: 0,
        score: 0,
      })
      .eq("id", team.id);

    if (error) throw error;
  }

  for (const participant of session.participants) {
    const eligible = isActiveParticipant(participant);
    const { error } = await supabase
      .from("participants")
      .update({
        joined_after_start: false,
        is_score_eligible: eligible,
        last_seen_at: now,
      })
      .eq("id", participant.id);

    if (error) throw error;
  }

  const { error: clearAnswersError } = await supabase
    .from("answers")
    .delete()
    .eq("session_id", session.id);

  if (clearAnswersError) throw clearAnswersError;

  const { error } = await supabase
    .from("game_sessions")
    .update({
      status: "question_active",
      current_question_index: 0,
      ...questionTimer,
      started_at: now,
      ended_at: null,
    })
    .eq("id", session.id);

  if (error) throw error;

  await insertEvent(session.id, "start_game", { roomCode: session.roomCode });
  const nextSession = await fetchSessionById(session.id);

  if (!nextSession) {
    throw new Error("เริ่มเกมแล้วแต่โหลดข้อมูลห้องไม่สำเร็จ");
  }

  return { ok: true as const, session: nextSession };
}

async function updateTeacherSession({
  teacherCode,
  roomCode,
  update,
  eventType,
}: {
  teacherCode: string;
  roomCode: string;
  update: (session: StoredGameSession) => Promise<string | null>;
  eventType: string;
}) {
  const session = await getSupabaseTeacherGameSession(teacherCode, roomCode);

  if (!session) {
    return { ok: false as const, reason: "ไม่พบห้องนี้" };
  }

  const error = await update(session);

  if (error) {
    return { ok: false as const, reason: error };
  }

  await insertEvent(session.id, eventType, { roomCode: session.roomCode });
  const nextSession = await fetchSessionById(session.id);

  if (!nextSession) {
    throw new Error("อัปเดตเกมแล้วแต่โหลดข้อมูลห้องไม่สำเร็จ");
  }

  return { ok: true as const, session: nextSession };
}

export async function lockSupabaseGameAnswers(payload: {
  teacherCode: string;
  roomCode: string;
}) {
  return updateTeacherSession({
    ...payload,
    eventType: "lock_answers",
    async update(session) {
      if (session.status !== "question_active") {
        return "ยังไม่มีคำถามที่กำลังเปิดรับคำตอบ";
      }

      const { error } = await createSupabaseAdminClient()
        .from("game_sessions")
        .update({ status: "answer_locked" })
        .eq("id", session.id);

      if (error) throw error;
      return null;
    },
  });
}

export async function showSupabaseGameAnswer(payload: {
  teacherCode: string;
  roomCode: string;
}) {
  return updateTeacherSession({
    ...payload,
    eventType: "reveal_answer",
    async update(session) {
      if (
        session.status !== "question_active" &&
        session.status !== "answer_locked"
      ) {
        return "ยังไม่สามารถเฉลยคำตอบได้";
      }

      const { error } = await createSupabaseAdminClient()
        .from("game_sessions")
        .update({ status: "showing_answer" })
        .eq("id", session.id);

      if (error) throw error;
      return null;
    },
  });
}

export async function advanceSupabaseGameQuestion(payload: {
  teacherCode: string;
  roomCode: string;
}) {
  return updateTeacherSession({
    ...payload,
    eventType: "next_question",
    async update(session) {
      if (
        session.status !== "showing_answer" &&
        session.status !== "answer_locked" &&
        session.status !== "question_active"
      ) {
        return "ต้องล็อกคำตอบหรือเฉลยก่อนข้อต่อไป";
      }

      const now = new Date().toISOString();
      let values:
        | {
            status: "ended";
            ended_at: string;
            current_question_started_at: null;
            current_question_ends_at: null;
          }
        | {
            status: "question_active";
            current_question_index: number;
            current_question_started_at: string;
            current_question_ends_at: string;
          };

      if (session.currentQuestionIndex >= session.questionCount - 1) {
        values = {
          status: "ended",
          ended_at: now,
          current_question_started_at: null,
          current_question_ends_at: null,
        };
      } else {
        const nextQuestionIndex = session.currentQuestionIndex + 1;
        const questionSet = await getSupabaseQuestionSet(
          session.teacherCode,
          session.questionSetId,
        );
        const nextQuestion = questionSet?.questions[nextQuestionIndex];

        if (!nextQuestion) {
          return "ไม่พบคำถามข้อถัดไป";
        }

        values = {
          status: "question_active",
          current_question_index: nextQuestionIndex,
          ...getQuestionTimerWindow({
            timeLimitSeconds: nextQuestion.timeLimitSeconds,
            nowIso: now,
          }),
        };
      }
      const { error } = await createSupabaseAdminClient()
        .from("game_sessions")
        .update(values)
        .eq("id", session.id);

      if (error) throw error;
      return null;
    },
  });
}

export async function endSupabaseGameSession(payload: {
  teacherCode: string;
  roomCode: string;
}) {
  return updateTeacherSession({
    ...payload,
    eventType: "end_game",
    async update(session) {
      const { error } = await createSupabaseAdminClient()
        .from("game_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          current_question_started_at: null,
          current_question_ends_at: null,
        })
        .eq("id", session.id);

      if (error) throw error;
      return null;
    },
  });
}

export async function leaveSupabaseTeam({
  roomCode,
  studentCode,
}: {
  roomCode: string;
  studentCode: string;
}) {
  const session = await fetchSessionByRoomCode(roomCode);

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

  const { error } = await createSupabaseAdminClient()
    .from("participants")
    .update({
      team_id: null,
      connection_status: "online",
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", participant.id);

  if (error) throw error;

  await insertEvent(session.id, "leave_team", { studentCode });
  const nextSession = await fetchSessionById(session.id);

  if (!nextSession) {
    throw new Error("ออกจากทีมแล้วแต่โหลดข้อมูลห้องไม่สำเร็จ");
  }

  return { ok: true as const, session: nextSession };
}

export async function renameSupabaseTeam({
  roomCode,
  studentCode,
  teamName,
}: {
  roomCode: string;
  studentCode: string;
  teamName: string;
}) {
  const nextTeamName = teamName.trim().replace(/\s+/g, " ");

  if (nextTeamName.length < 2 || nextTeamName.length > 30) {
    return { ok: false as const, reason: "ชื่อทีมต้องมี 2-30 ตัวอักษร" };
  }

  const session = await fetchSessionByRoomCode(roomCode);

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

  const { error } = await createSupabaseAdminClient()
    .from("teams")
    .update({ team_name: nextTeamName })
    .eq("id", participant.teamId);

  if (error) throw error;

  await insertEvent(session.id, "rename_team", {
    studentCode,
    teamId: participant.teamId,
    teamName: nextTeamName,
  });
  const nextSession = await fetchSessionById(session.id);

  if (!nextSession) {
    throw new Error("เปลี่ยนชื่อทีมแล้วแต่โหลดข้อมูลห้องไม่สำเร็จ");
  }

  return { ok: true as const, session: nextSession };
}

export async function deleteSupabaseGameSession({
  teacherCode,
  roomCode,
}: {
  teacherCode: string;
  roomCode: string;
}) {
  const session = await getSupabaseTeacherGameSession(teacherCode, roomCode);

  if (!session) {
    return { ok: false as const, reason: "ไม่พบห้องนี้" };
  }

  if (session.status !== "ended") {
    return { ok: false as const, reason: "ลบห้องได้หลังจบเกมเท่านั้น" };
  }

  const { error } = await createSupabaseAdminClient()
    .from("game_sessions")
    .delete()
    .eq("id", session.id);

  if (error) throw error;

  return { ok: true as const };
}

export async function submitSupabaseAnswer({
  roomCode,
  studentCode,
  answerText,
}: {
  roomCode: string;
  studentCode: string;
  answerText: string;
}) {
  const session = await fetchSessionByRoomCode(roomCode);

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

  const questionSet = await getSupabaseQuestionSet(
    session.teacherCode,
    session.questionSetId,
  );
  const currentQuestion = questionSet?.questions[session.currentQuestionIndex];

  if (!currentQuestion) {
    return { ok: false as const, reason: "ไม่พบคำถามปัจจุบัน" };
  }

  if (isQuestionTimerExpired(session)) {
    return { ok: false as const, reason: "หมดเวลาตอบคำถามข้อนี้แล้ว" };
  }

  const trimmedAnswer = answerText.trim();

  if (!trimmedAnswer) {
    return { ok: false as const, reason: "กรุณากรอกคำตอบ" };
  }

  if (trimmedAnswer.length > 2000) {
    return { ok: false as const, reason: "คำตอบยาวเกินไป" };
  }

  const rawAwardedPoints = calculateAwardedPoints({
    answerText: trimmedAnswer,
    correctAnswer: currentQuestion.correctAnswer,
    points: currentQuestion.points,
  });
  const scoreAwarded = participant.isScoreEligible ? rawAwardedPoints : 0;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("answers")
    .insert({
      session_id: session.id,
      question_id: currentQuestion.id,
      question_index: session.currentQuestionIndex,
      team_id: participant.teamId,
      participant_id: participant.id,
      student_code: studentCode,
      answer_text: trimmedAnswer,
      is_correct: rawAwardedPoints > 0,
      score_awarded: scoreAwarded,
    })
    .select(
      "id, question_index, student_code, team_id, answer_text, is_correct, score_awarded, submitted_at",
    )
    .single<AnswerRow>();

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, reason: "คุณตอบคำถามข้อนี้ไปแล้ว" };
    }

    throw error;
  }

  const { error: participantError } = await supabase
    .from("participants")
    .update({
      connection_status: "online",
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", participant.id);

  if (participantError) throw participantError;

  await recalculateTeamScores(session.id);
  await insertEvent(session.id, "submit_answer", {
    studentCode,
    questionIndex: session.currentQuestionIndex,
  });

  const nextSession = await fetchSessionById(session.id);

  if (!nextSession) {
    throw new Error("ส่งคำตอบแล้วแต่โหลดข้อมูลห้องไม่สำเร็จ");
  }

  return { ok: true as const, answer: mapAnswer(data), session: nextSession };
}
