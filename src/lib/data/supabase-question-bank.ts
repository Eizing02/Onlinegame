import { randomUUID } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  CreateQuestionInput,
  DeleteQuestionSetResult,
  QuestionType,
  StoredQuestion,
  StoredQuestionOption,
  StoredQuestionSet,
} from "@/lib/data/question-bank";

const QUESTION_IMAGE_BUCKET = "question-images";
const QUESTION_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

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
  question_type?: QuestionType | null;
  image_url?: string | null;
  image_path?: string | null;
  points: number;
  time_limit_seconds: number;
  order_index: number;
  created_at: string;
};

type QuestionOptionRow = {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
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

function isMissingQuestionMetadataError(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("question_type") === true ||
    error.message?.includes("image_path") === true
  );
}

function isMissingQuestionOptionsTableError(error: {
  code?: string;
  message?: string;
}) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("question_options") === true
  );
}

function normalizeQuestionType(value: unknown): QuestionType {
  return value === "true_false" || value === "multiple_choice"
    ? value
    : "short_text";
}

function mapQuestionOption(row: QuestionOptionRow): StoredQuestionOption {
  return {
    id: row.id,
    optionText: row.option_text,
    isCorrect: row.is_correct,
    orderIndex: row.order_index,
  };
}

function mapQuestion(
  row: QuestionRow,
  optionsByQuestionId = new Map<string, StoredQuestionOption[]>(),
): StoredQuestion {
  return {
    id: row.id,
    questionText: row.question_text,
    correctAnswer: row.correct_answer,
    questionType: normalizeQuestionType(row.question_type),
    options: optionsByQuestionId.get(row.id) ?? [],
    imageUrl: row.image_url ?? null,
    imagePath: row.image_path ?? null,
    points: row.points,
    timeLimitSeconds: row.time_limit_seconds,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  };
}

function isImageFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

function getSafeFileName(fileName: string) {
  const safeName =
    fileName
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "question-image";

  return safeName.toLowerCase();
}

async function ensureQuestionImageBucket() {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.createBucket(QUESTION_IMAGE_BUCKET, {
    public: true,
    allowedMimeTypes: QUESTION_IMAGE_MIME_TYPES,
  });

  if (
    error &&
    !error.message.toLowerCase().includes("already exists") &&
    !error.message.toLowerCase().includes("duplicate")
  ) {
    throw error;
  }
}

async function uploadQuestionImage({
  imageFile,
  questionId,
  questionSetId,
  teacherCode,
}: {
  imageFile?: File | null;
  questionId: string;
  questionSetId: string;
  teacherCode: string;
}) {
  if (!isImageFile(imageFile)) {
    return { imageUrl: null, imagePath: null };
  }

  if (!imageFile.type.startsWith("image/")) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
  }

  const supabase = createSupabaseAdminClient();
  const imagePath = [
    teacherCode,
    questionSetId,
    `${questionId}-${getSafeFileName(imageFile.name)}`,
  ].join("/");
  const upload = await supabase.storage
    .from(QUESTION_IMAGE_BUCKET)
    .upload(imagePath, imageFile, {
      cacheControl: "31536000",
      contentType: imageFile.type,
      upsert: true,
    });

  if (upload.error) {
    if (upload.error.message.toLowerCase().includes("bucket")) {
      await ensureQuestionImageBucket();
      const retry = await supabase.storage
        .from(QUESTION_IMAGE_BUCKET)
        .upload(imagePath, imageFile, {
          cacheControl: "31536000",
          contentType: imageFile.type,
          upsert: true,
        });

      if (retry.error) {
        throw retry.error;
      }
    } else {
      throw upload.error;
    }
  }

  const { data } = supabase.storage
    .from(QUESTION_IMAGE_BUCKET)
    .getPublicUrl(imagePath);

  return {
    imageUrl: data.publicUrl,
    imagePath,
  };
}

async function removeQuestionImages(imagePaths: string[]) {
  const paths = [...new Set(imagePaths.filter(Boolean))];

  if (paths.length === 0) {
    return;
  }

  const { error } = await createSupabaseAdminClient()
    .storage.from(QUESTION_IMAGE_BUCKET)
    .remove(paths);

  if (error && !error.message.toLowerCase().includes("not found")) {
    throw error;
  }
}

async function getQuestionOptions(questionIds: string[]) {
  if (questionIds.length === 0) {
    return new Map<string, StoredQuestionOption[]>();
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("question_options")
    .select("id, question_id, option_text, is_correct, order_index")
    .in("question_id", questionIds)
    .order("order_index", { ascending: true })
    .returns<QuestionOptionRow[]>();

  if (error) {
    if (isMissingQuestionOptionsTableError(error)) {
      return new Map<string, StoredQuestionOption[]>();
    }

    throw error;
  }

  const optionsByQuestionId = new Map<string, StoredQuestionOption[]>();

  for (const option of data ?? []) {
    const options = optionsByQuestionId.get(option.question_id) ?? [];
    options.push(mapQuestionOption(option));
    optionsByQuestionId.set(option.question_id, options);
  }

  return optionsByQuestionId;
}

async function getQuestions(questionSetId: string) {
  const supabase = createSupabaseAdminClient();
  const questionResult = await supabase
    .from("questions")
    .select(
      "id, question_text, correct_answer, question_type, image_url, image_path, points, time_limit_seconds, order_index, created_at",
    )
    .eq("question_set_id", questionSetId)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();
  let data = questionResult.data;
  const error = questionResult.error;

  if (error) {
    if (!isMissingQuestionMetadataError(error)) {
      throw error;
    }

    const fallback = await supabase
      .from("questions")
      .select(
        "id, question_text, correct_answer, image_url, points, time_limit_seconds, order_index, created_at",
      )
      .eq("question_set_id", questionSetId)
      .order("order_index", { ascending: true })
      .returns<QuestionRow[]>();

    if (fallback.error) {
      throw fallback.error;
    }

    data = fallback.data;
  }

  const optionsByQuestionId = await getQuestionOptions(
    (data ?? []).map((question) => question.id),
  );

  return (data ?? []).map((question) => mapQuestion(question, optionsByQuestionId));
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
  question: CreateQuestionInput,
) {
  const questionSet = await getSupabaseQuestionSet(teacherCode, questionSetId);

  if (!questionSet) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const questionId = randomUUID();
  const questionType = question.questionType ?? "short_text";
  const questionOptions = question.options ?? [];
  const image = await uploadQuestionImage({
    imageFile: question.imageFile,
    questionId,
    questionSetId,
    teacherCode,
  });
  const questionResult = await supabase
    .from("questions")
    .insert({
      id: questionId,
      question_set_id: questionSetId,
      question_text: question.questionText,
      correct_answer: question.correctAnswer,
      question_type: questionType,
      image_url: image.imageUrl ?? question.imageUrl ?? null,
      image_path: image.imagePath ?? question.imagePath ?? null,
      points: question.points,
      time_limit_seconds: question.timeLimitSeconds,
      order_index: questionSet.questions.length,
    })
    .select(
      "id, question_text, correct_answer, question_type, image_url, image_path, points, time_limit_seconds, order_index, created_at",
    )
    .single<QuestionRow>();
  let data = questionResult.data;
  let error = questionResult.error;

  if (error && isMissingQuestionMetadataError(error)) {
    if (image.imagePath) {
      await removeQuestionImages([image.imagePath]);
    }

    if (
      image.imagePath ||
      questionType !== "short_text" ||
      questionOptions.length > 0
    ) {
      throw error;
    }

    const fallbackResult = await supabase
      .from("questions")
      .insert({
        id: questionId,
        question_set_id: questionSetId,
        question_text: question.questionText,
        correct_answer: question.correctAnswer,
        image_url: image.imageUrl ?? question.imageUrl ?? null,
        points: question.points,
        time_limit_seconds: question.timeLimitSeconds,
        order_index: questionSet.questions.length,
      })
      .select(
        "id, question_text, correct_answer, image_url, points, time_limit_seconds, order_index, created_at",
      )
      .single<QuestionRow>();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    if (image.imagePath) {
      await removeQuestionImages([image.imagePath]);
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  if (questionOptions.length > 0) {
    const { error: optionsError } = await supabase.from("question_options").insert(
      questionOptions.map((option) => ({
        question_id: data.id,
        option_text: option.optionText,
        is_correct: option.isCorrect,
        order_index: option.orderIndex,
      })),
    );

    if (optionsError) {
      await supabase.from("questions").delete().eq("id", data.id);

      if (image.imagePath) {
        await removeQuestionImages([image.imagePath]);
      }

      throw optionsError;
    }
  }

  await supabase
    .from("question_sets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", questionSetId);

  const nextQuestionSet = await getSupabaseQuestionSet(teacherCode, questionSetId);

  return (
    nextQuestionSet?.questions.find((storedQuestion) => storedQuestion.id === data.id) ??
    mapQuestion(data)
  );
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

  if (target.imagePath) {
    await removeQuestionImages([target.imagePath]);
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

  await removeQuestionImages(
    questionSet.questions
      .filter((question) => targetQuestionIds.includes(question.id))
      .map((question) => question.imagePath ?? "")
      .filter(Boolean),
  );

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

  const imagePaths = questionSet.questions
    .map((question) => question.imagePath ?? "")
    .filter(Boolean);

  const { data, error } = await createSupabaseAdminClient()
    .rpc("delete_question_set_safely", {
      p_question_set_id: questionSetId,
      p_teacher_code: teacherCode,
    })
    .returns<DeleteQuestionSetSafelyRpcRow[]>();

  if (error) {
    if (isMissingRpcFunctionError(error)) {
      const result = await deleteSupabaseQuestionSetDirectly(
        teacherCode,
        questionSetId,
      );

      if (result.ok) {
        await removeQuestionImages(imagePaths);
      }

      return result;
    }

    throw error;
  }

  const result = Array.isArray(data) ? data[0] : null;

  if (!result) {
    return { ok: false, reason: "not_found" };
  }

  if (result.ok) {
    await removeQuestionImages(imagePaths);
    return { ok: true };
  }

  return {
    ok: false,
    reason: result.reason ?? "not_found",
    activeRoomCode: result.active_room_code ?? undefined,
  };
}
