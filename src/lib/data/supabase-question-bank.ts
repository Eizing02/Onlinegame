import { randomUUID } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  DeleteQuestionSetResult,
  StoredQuestion,
  StoredQuestionSet,
} from "@/lib/data/question-bank";

type QuestionSetRow = {
  id: string;
  teacher_code: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type QuestionRow = {
  id: string;
  question_text: string;
  correct_answer: string;
  points: number;
  time_limit_seconds: number;
  order_index: number;
  created_at: string;
};

type DeleteQuestionSetSafelyRpcRow = {
  ok: boolean;
  reason: "active_room" | "not_found" | null;
  active_room_code: string | null;
};

function isMissingRpcFunctionError(error: { code?: string; message?: string }) {
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.message?.includes("delete_question_set_safely") === true
  );
}

function mapQuestion(row: QuestionRow): StoredQuestion {
  return {
    id: row.id,
    questionText: row.question_text,
    correctAnswer: row.correct_answer,
    points: row.points,
    timeLimitSeconds: row.time_limit_seconds,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  };
}

async function getQuestions(questionSetId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, question_text, correct_answer, points, time_limit_seconds, order_index, created_at",
    )
    .eq("question_set_id", questionSetId)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapQuestion);
}

export async function getSupabaseQuestionSetSummaries(teacherCode: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("question_sets")
    .select(
      "id, title, description, questions(points)",
    )
    .eq("teacher_code", teacherCode)
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((set) => {
    const questions = Array.isArray(set.questions) ? set.questions : [];

    return {
      id: set.id,
      title: set.title,
      description: set.description,
      questionCount: questions.length,
      totalPoints: questions.reduce(
        (sum, question) => sum + Number(question.points ?? 0),
        0,
      ),
    };
  });
}

export async function getSupabaseQuestionSet(
  teacherCode: string,
  questionSetId: string,
): Promise<StoredQuestionSet | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("question_sets")
    .select("id, teacher_code, title, description, created_at, updated_at")
    .eq("teacher_code", teacherCode)
    .eq("id", questionSetId)
    .maybeSingle<QuestionSetRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    teacherCode: data.teacher_code,
    title: data.title,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    questions: await getQuestions(data.id),
  };
}

export async function createSupabaseQuestionSet(
  teacherCode: string,
  title: string,
  description: string | null,
) {
  const supabase = createSupabaseAdminClient();
  const id = randomUUID();
  const { data, error } = await supabase
    .from("question_sets")
    .insert({
      id,
      teacher_code: teacherCode,
      title,
      description,
    })
    .select("id, teacher_code, title, description, created_at, updated_at")
    .single<QuestionSetRow>();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    teacherCode: data.teacher_code,
    title: data.title,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    questions: [],
  };
}

export async function addSupabaseQuestion(
  teacherCode: string,
  questionSetId: string,
  question: Omit<StoredQuestion, "id" | "orderIndex" | "createdAt">,
) {
  const questionSet = await getSupabaseQuestionSet(teacherCode, questionSetId);

  if (!questionSet) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("questions")
    .insert({
      question_set_id: questionSetId,
      question_text: question.questionText,
      correct_answer: question.correctAnswer,
      points: question.points,
      time_limit_seconds: question.timeLimitSeconds,
      order_index: questionSet.questions.length,
    })
    .select(
      "id, question_text, correct_answer, points, time_limit_seconds, order_index, created_at",
    )
    .single<QuestionRow>();

  if (error) {
    throw error;
  }

  await supabase
    .from("question_sets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", questionSetId);

  return mapQuestion(data);
}

export async function deleteSupabaseQuestion(
  teacherCode: string,
  questionSetId: string,
  questionId: string,
) {
  const questionSet = await getSupabaseQuestionSet(teacherCode, questionSetId);

  if (!questionSet) {
    return false;
  }

  const target = questionSet.questions.find(
    (question) => question.id === questionId,
  );

  if (!target) {
    return false;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("question_set_id", questionSetId);

  if (error) {
    throw error;
  }

  const remaining = questionSet.questions
    .filter((question) => question.id !== questionId)
    .map((question, index) => ({
      id: question.id,
      order_index: index,
    }));

  for (const question of remaining) {
    const { error: updateError } = await supabase
      .from("questions")
      .update({ order_index: question.order_index })
      .eq("id", question.id);

    if (updateError) {
      throw updateError;
    }
  }

  await supabase
    .from("question_sets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", questionSetId);

  return true;
}

export async function deleteSupabaseQuestions(
  teacherCode: string,
  questionSetId: string,
  questionIds: string[],
) {
  const questionSet = await getSupabaseQuestionSet(teacherCode, questionSetId);
  const uniqueQuestionIds = [...new Set(questionIds.filter(Boolean))];

  if (!questionSet || uniqueQuestionIds.length === 0) {
    return false;
  }

  const existingQuestionIds = new Set(
    questionSet.questions.map((question) => question.id),
  );
  const targetQuestionIds = uniqueQuestionIds.filter((questionId) =>
    existingQuestionIds.has(questionId),
  );

  if (targetQuestionIds.length === 0) {
    return false;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("question_set_id", questionSetId)
    .in("id", targetQuestionIds);

  if (error) {
    throw error;
  }

  const remaining = questionSet.questions
    .filter((question) => !targetQuestionIds.includes(question.id))
    .map((question, index) => ({
      id: question.id,
      order_index: index,
    }));

  for (const question of remaining) {
    const { error: updateError } = await supabase
      .from("questions")
      .update({ order_index: question.order_index })
      .eq("id", question.id);

    if (updateError) {
      throw updateError;
    }
  }

  await supabase
    .from("question_sets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", questionSetId);

  return true;
}

async function deleteSupabaseQuestionSetDirectly(
  teacherCode: string,
  questionSetId: string,
): Promise<DeleteQuestionSetResult> {
  const supabase = createSupabaseAdminClient();
  const { data: activeRooms, error: activeError } = await supabase
    .from("game_sessions")
    .select("room_code")
    .eq("teacher_code", teacherCode)
    .eq("question_set_id", questionSetId)
    .neq("status", "ended")
    .order("created_at", { ascending: false })
    .limit(1);

  if (activeError) {
    throw activeError;
  }

  const activeRoomCode = activeRooms?.[0]?.room_code;

  if (activeRoomCode) {
    return {
      ok: false,
      reason: "active_room",
      activeRoomCode,
    };
  }

  const { error: cleanupError } = await supabase
    .from("game_sessions")
    .delete()
    .eq("teacher_code", teacherCode)
    .eq("question_set_id", questionSetId)
    .eq("status", "ended");

  if (cleanupError) {
    throw cleanupError;
  }

  const { data, error } = await supabase
    .from("question_sets")
    .delete()
    .eq("teacher_code", teacherCode)
    .eq("id", questionSetId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        reason: "active_room",
      };
    }

    throw error;
  }

  return data ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function deleteSupabaseQuestionSet(
  teacherCode: string,
  questionSetId: string,
): Promise<DeleteQuestionSetResult> {
  const questionSet = await getSupabaseQuestionSet(teacherCode, questionSetId);

  if (!questionSet) {
    return { ok: false, reason: "not_found" };
  }

  const { data, error } = await createSupabaseAdminClient()
    .rpc("delete_question_set_safely", {
      p_question_set_id: questionSetId,
      p_teacher_code: teacherCode,
    })
    .returns<DeleteQuestionSetSafelyRpcRow[]>();

  if (error) {
    if (isMissingRpcFunctionError(error)) {
      return deleteSupabaseQuestionSetDirectly(teacherCode, questionSetId);
    }

    throw error;
  }

  const result = Array.isArray(data) ? data[0] : null;

  if (!result) {
    return { ok: false, reason: "not_found" };
  }

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: result.reason ?? "not_found",
    activeRoomCode: result.active_room_code ?? undefined,
  };
}
