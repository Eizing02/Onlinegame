import { createHash, randomUUID } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { QUESTION_IMAGE_MIME } from "@/lib/image/question-image-policy";
import { readQuestionImage } from "@/lib/image/read-question-image";
import type {
  CreateQuestionInput,
  DeleteQuestionSetResult,
  QuestionType,
  StoredQuestion,
  StoredQuestionOption,
  StoredQuestionSet,
  UpdateQuestionInput,
} from "@/lib/data/question-bank";

const QUESTION_IMAGE_BUCKET = "question-images";
export class QuestionImageStorageError extends Error {}

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

async function ensureQuestionImageBucket() {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.createBucket(QUESTION_IMAGE_BUCKET, {
    public: true,
    allowedMimeTypes: Object.keys(QUESTION_IMAGE_MIME),
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
  const image = await readQuestionImage(imageFile);
  if (!image) {
    return { imageUrl: null, imagePath: null };
  }

  const supabase = createSupabaseAdminClient();
  const digest = createHash("sha256").update(image.bytes).digest("hex");
  const imagePath = [
    teacherCode,
    questionSetId,
    `${questionId}-${digest.slice(0, 16)}.${image.extension}`,
  ].join("/");
  const bucket = supabase.storage.from(QUESTION_IMAGE_BUCKET);
  const upload = () => bucket.upload(imagePath, image.bytes, {
      cacheControl: "31536000",
      contentType: image.mime,
      upsert: true,
    });

  try {
    let { error } = await upload();
    if (error && /bucket not found|bucket does not exist/i.test(error.message)) {
      await ensureQuestionImageBucket();
      ({ error } = await upload());
    }
    if (error) throw error;
  } catch (error) {
    throw new QuestionImageStorageError("Question image upload failed", { cause: error });
  }

  const { data } = bucket.getPublicUrl(imagePath);

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

async function discardQuestionImage(questionId: string, imagePath: string | null) {
  if (imagePath) {
    await removeQuestionImages([imagePath]).catch(error => {
      console.error("Question image cleanup failed", { questionId, error });
    });
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
  const questionId = question.id ?? randomUUID();
  const questionType = question.questionType ?? "short_text";
  const questionOptions = question.options ?? [];
  const saved = questionSet.questions.find(item => item.id === questionId);
  if (saved) {
    const required = saved.questionType === "short_text" ? 0 : saved.questionType === "true_false" ? 2 : 4;
    if (saved.options.length >= required) return saved;
    // A previous request may have committed the question before losing its response.
    if (saved.questionType !== questionType || saved.correctAnswer !== question.correctAnswer ||
        saved.questionText !== question.questionText || questionOptions.length !== required) {
      throw new Error("Previous question submission is incomplete");
    }
    return saveSupabaseQuestionOptions(questionSetId, saved, questionOptions);
  }
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
  let status = questionResult.status;

  if (error && isMissingQuestionMetadataError(error) &&
      !image.imagePath && questionType === "short_text" && questionOptions.length === 0) {
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
    status = fallbackResult.status;
  }

  if (error) {
    if (error.code === "23505") {
      const current = (await getQuestions(questionSetId)).find(item => item.id === questionId);
      if (current?.imagePath !== image.imagePath) await discardQuestionImage(questionId, image.imagePath);
      if (current && current.options.length === questionOptions.length) return current;
    } else if (status >= 400 && status < 500) {
      // Only discard after a definite rejection. A transport error can follow a commit.
      await discardQuestionImage(questionId, image.imagePath);
    }
    throw error;
  }

  if (!data) throw new Error("Question insert returned no row");
  return saveSupabaseQuestionOptions(questionSetId, mapQuestion(data), questionOptions);
}

async function saveSupabaseQuestionOptions(
  questionSetId: string,
  question: StoredQuestion,
  options: NonNullable<CreateQuestionInput["options"]>,
) {
  const supabase = createSupabaseAdminClient();
  if (options.length > 0) {
    const result = await supabase.from("question_options").insert(
      options.map((option) => ({
        question_id: question.id,
        option_text: option.optionText,
        is_correct: option.isCorrect,
        order_index: option.orderIndex,
      })),
    ).select("id, question_id, option_text, is_correct, order_index").returns<QuestionOptionRow[]>();
    if (result.error) {
      if (result.error.code === "23505") {
        const saved = (await getQuestionOptions([question.id])).get(question.id) ?? [];
        if (saved.length === options.length) return { ...question, options: saved };
      } else if (result.status >= 400 && result.status < 500) {
        const removed = await supabase.from("questions").delete()
          .eq("question_set_id", questionSetId).eq("id", question.id);
        if (removed.error) {
          console.error("Question rollback failed", { questionId: question.id, error: removed.error });
        } else {
          await discardQuestionImage(question.id, question.imagePath);
        }
      }
      throw result.error;
    }
    question = {
      ...question,
      options: (result.data ?? []).map(mapQuestionOption).sort((a, b) => a.orderIndex - b.orderIndex),
    };
  }

  await supabase
    .from("question_sets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", questionSetId);

  return question;
}

export async function updateSupabaseQuestion(
  teacherCode: string,
  questionSetId: string,
  questionId: string,
  question: UpdateQuestionInput,
) {
  const questionSet = await getSupabaseQuestionSet(teacherCode, questionSetId);

  if (!questionSet) {
    return null;
  }

  const target = questionSet.questions.find((item) => item.id === questionId);

  if (!target) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const questionType = question.questionType ?? "short_text";
  const nextOptions = question.options ?? [];
  const uploaded = question.imageFile
    ? await uploadQuestionImage({
        imageFile: question.imageFile,
        questionId,
        questionSetId,
        teacherCode,
      })
    : null;
  const nextImageUrl = uploaded
    ? uploaded.imageUrl
    : question.removeImage
      ? null
      : target.imageUrl;
  const nextImagePath = uploaded
    ? uploaded.imagePath
    : question.removeImage
      ? null
      : target.imagePath;

  const { data, error } = await supabase
    .from("questions")
    .update({
      question_text: question.questionText,
      correct_answer: question.correctAnswer,
      question_type: questionType,
      image_url: nextImageUrl,
      image_path: nextImagePath,
      points: question.points,
      time_limit_seconds: question.timeLimitSeconds,
    })
    .eq("id", questionId)
    .eq("question_set_id", questionSetId)
    .select(
      "id, question_text, correct_answer, question_type, image_url, image_path, points, time_limit_seconds, order_index, created_at",
    )
    .single<QuestionRow>();

  if (error) {
    if (uploaded?.imagePath) {
      await discardQuestionImage(questionId, uploaded.imagePath);
    }
    throw error;
  }

  const { error: deleteOptionsError } = await supabase
    .from("question_options")
    .delete()
    .eq("question_id", questionId);

  if (deleteOptionsError && !isMissingQuestionOptionsTableError(deleteOptionsError)) {
    throw deleteOptionsError;
  }

  let savedOptions: StoredQuestionOption[] = [];

  if (nextOptions.length > 0) {
    const insertResult = await supabase
      .from("question_options")
      .insert(
        nextOptions.map((option) => ({
          question_id: questionId,
          option_text: option.optionText,
          is_correct: option.isCorrect,
          order_index: option.orderIndex,
        })),
      )
      .select("id, question_id, option_text, is_correct, order_index")
      .returns<QuestionOptionRow[]>();

    if (insertResult.error) {
      throw insertResult.error;
    }

    savedOptions = (insertResult.data ?? [])
      .map(mapQuestionOption)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  if (target.imagePath && target.imagePath !== nextImagePath) {
    await discardQuestionImage(questionId, target.imagePath);
  }

  await supabase
    .from("question_sets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", questionSetId);

  return {
    ...mapQuestion(data),
    options: savedOptions,
  };
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
