"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import {
  addLocalQuestion,
  createLocalQuestionSet,
  deleteLocalQuestion,
  deleteLocalQuestions,
  deleteLocalQuestionSet,
  getLocalQuestionSet,
  updateLocalQuestion,
  type CreateQuestionOptionInput,
  type QuestionType,
} from "@/lib/data/question-bank";
import { QuestionImageStorageError } from "@/lib/data/supabase-question-bank";
import { QuestionImageError } from "@/lib/image/read-question-image";
import { QUESTION_IMAGE_TYPE_MESSAGE } from "@/lib/image/question-image-policy";
import {
  createLocalGameSession,
  deleteLocalGameSession,
  getActiveTeacherGameSession,
} from "@/lib/data/game-sessions";
import { createRaid } from "@/features/boss-raid/server/raid-service";
import { createRoomSchema } from "@/lib/validations/room";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function encodedRedirect(
  path: string,
  key: "error" | "notice",
  message: string,
): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function getSafeTeacherReturnPath(formData: FormData, fallbackPath: string) {
  const returnTo = getFormString(formData, "return_to");

  if (
    returnTo.startsWith("/teacher/") &&
    !returnTo.startsWith("//") &&
    !returnTo.includes("://")
  ) {
    return returnTo;
  }

  return fallbackPath;
}

function getQuestionType(value: string): QuestionType {
  if (value === "true_false" || value === "multiple_choice") {
    return value;
  }

  return "short_text";
}

function needsQuestionTypeMigration(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error) || !("message" in error)) return false;
  return ["42703", "42P01", "PGRST204", "PGRST205"].includes(String(error.code)) &&
    /question_type|question_options|image_path|selected_option_id/i.test(String(error.message));
}

type AddQuestionResult =
  | { ok: true }
  | { ok: false; message: string; field?: "image" };

function questionDraftId(teacherCode: string, questionSetId: string, draft: string) {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(draft)) return undefined;
  // Scope retry keys to this teacher and set before using them as a primary key.
  const hash = createHash("sha256").update(JSON.stringify([teacherCode, questionSetId, draft])).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function createQuestionSetAction(formData: FormData) {
  const session = await requireRole("teacher");
  const title = getFormString(formData, "title");
  const description = getFormString(formData, "description");

  if (!title) {
    encodedRedirect("/teacher/question-sets", "error", "กรุณากรอกชื่อชุดคำถาม");
  }

  const questionSet = await createLocalQuestionSet(
    session.userCode,
    title,
    description || null,
  );

  revalidatePath("/teacher/question-sets");
  redirect(`/teacher/question-sets/${questionSet.id}`);
}

export async function addQuestionAction(formData: FormData): Promise<AddQuestionResult> {
  const session = await requireRole("teacher");
  const questionSetId = getFormString(formData, "question_set_id");
  const questionText = getFormString(formData, "question_text");
  const questionType = getQuestionType(getFormString(formData, "question_type"));
  const shortTextAnswer = getFormString(formData, "correct_answer");
  const trueFalseAnswer = getFormString(formData, "true_false_answer");
  const selectedOption = getFormString(formData, "correct_option_index");
  const correctOptionIndex = selectedOption ? Number(selectedOption) : -1;
  const imageEntry = formData.get("image_file");
  const points = Number(getFormString(formData, "points") || "10");
  const timeLimitSeconds = Number(
    getFormString(formData, "time_limit_seconds") || "60",
  );
  if (!questionSetId || !questionText) {
    return { ok: false, message: "กรุณากรอกคำถามและคำตอบให้ครบ" };
  }

  if (
    !Number.isInteger(points) ||
    points < 0 ||
    points > 1000 ||
    !Number.isInteger(timeLimitSeconds) ||
    timeLimitSeconds < 5 ||
    timeLimitSeconds > 600
  ) {
    return { ok: false, message: "คะแนนหรือเวลาตอบไม่ถูกต้อง" };
  }

  if (typeof imageEntry === "string") {
    return { ok: false, field: "image", message: QUESTION_IMAGE_TYPE_MESSAGE };
  }
  const imageFile = imageEntry?.size === 0 && !imageEntry.name ? null : imageEntry;

  let correctAnswer = shortTextAnswer;
  let options: CreateQuestionOptionInput[] = [];

  if (questionType === "short_text") {
    if (!correctAnswer) {
      return { ok: false, message: "กรุณากรอกคำตอบที่ถูก" };
    }
  }

  if (questionType === "true_false") {
    if (trueFalseAnswer !== "true" && trueFalseAnswer !== "false") {
      return { ok: false, message: "กรุณาเลือกคำตอบถูก/ผิด" };
    }

    options = [
      {
        optionText: "ถูก",
        isCorrect: trueFalseAnswer === "true",
        orderIndex: 0,
      },
      {
        optionText: "ผิด",
        isCorrect: trueFalseAnswer === "false",
        orderIndex: 1,
      },
    ];
    correctAnswer = trueFalseAnswer === "true" ? "ถูก" : "ผิด";
  }

  if (questionType === "multiple_choice") {
    const optionTexts = Array.from({ length: 4 }, (_, index) =>
      getFormString(formData, `option_${index}`),
    );

    if (
      optionTexts.some((optionText) => !optionText) ||
      !Number.isInteger(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex > 3
    ) {
      return { ok: false, message: "กรุณากรอกตัวเลือก 4 ข้อและเลือกคำตอบที่ถูก" };
    }

    options = optionTexts.map((optionText, index) => ({
      optionText,
      isCorrect: index === correctOptionIndex,
      orderIndex: index,
    }));
    correctAnswer = optionTexts[correctOptionIndex] ?? "";
  }

  try {
    const question = await addLocalQuestion(session.userCode, questionSetId, {
      id: questionDraftId(session.userCode, questionSetId, getFormString(formData, "draft_id")),
      questionText,
      correctAnswer,
      questionType,
      options,
      imageFile,
      points,
      timeLimitSeconds,
    });
    if (!question) return { ok: false, message: "ไม่พบชุดคำถามนี้ หรือคุณไม่มีสิทธิ์เพิ่มคำถาม" };
  } catch (error) {
    if (error instanceof QuestionImageError) {
      return { ok: false, field: "image", message: error.message };
    }
    const reference = randomUUID().slice(0, 8);
    console.error("Question save failed", { reference, questionSetId, error });
    if (error instanceof QuestionImageStorageError) {
      return { ok: false, field: "image", message: `อัปโหลดรูปไม่สำเร็จ ลองบันทึกอีกครั้ง (อ้างอิง ${reference})` };
    }
    if (needsQuestionTypeMigration(error)) {
      return { ok: false, message: `ฐานข้อมูลยังไม่รองรับคำถามประเภทนี้หรือรูปประกอบ กรุณาแจ้งผู้ดูแลให้ตรวจ migration 005 (อ้างอิง ${reference})` };
    }
    return { ok: false, message: `บันทึกคำถามไม่สำเร็จ ลองอีกครั้ง (อ้างอิง ${reference})` };
  }

  revalidatePath(`/teacher/question-sets/${questionSetId}`);
  revalidatePath("/teacher/question-sets");
  return { ok: true };
}

export async function updateQuestionAction(formData: FormData): Promise<AddQuestionResult> {
  const session = await requireRole("teacher");
  const questionSetId = getFormString(formData, "question_set_id");
  const questionId = getFormString(formData, "question_id");
  const questionText = getFormString(formData, "question_text");
  const questionType = getQuestionType(getFormString(formData, "question_type"));
  const shortTextAnswer = getFormString(formData, "correct_answer");
  const trueFalseAnswer = getFormString(formData, "true_false_answer");
  const selectedOption = getFormString(formData, "correct_option_index");
  const correctOptionIndex = selectedOption ? Number(selectedOption) : -1;
  const imageEntry = formData.get("image_file");
  const removeImage = getFormString(formData, "remove_image") === "true";
  const points = Number(getFormString(formData, "points") || "10");
  const timeLimitSeconds = Number(
    getFormString(formData, "time_limit_seconds") || "60",
  );

  if (!questionSetId || !questionId || !questionText) {
    return { ok: false, message: "กรุณากรอกคำถามและคำตอบให้ครบ" };
  }

  if (
    !Number.isInteger(points) ||
    points < 0 ||
    points > 1000 ||
    !Number.isInteger(timeLimitSeconds) ||
    timeLimitSeconds < 5 ||
    timeLimitSeconds > 600
  ) {
    return { ok: false, message: "คะแนนหรือเวลาตอบไม่ถูกต้อง" };
  }

  if (typeof imageEntry === "string") {
    return { ok: false, field: "image", message: QUESTION_IMAGE_TYPE_MESSAGE };
  }
  const imageFile = imageEntry?.size === 0 && !imageEntry.name ? null : imageEntry;

  let correctAnswer = shortTextAnswer;
  let options: CreateQuestionOptionInput[] = [];

  if (questionType === "short_text") {
    if (!correctAnswer) {
      return { ok: false, message: "กรุณากรอกคำตอบที่ถูก" };
    }
  }

  if (questionType === "true_false") {
    if (trueFalseAnswer !== "true" && trueFalseAnswer !== "false") {
      return { ok: false, message: "กรุณาเลือกคำตอบถูก/ผิด" };
    }

    options = [
      {
        optionText: "ถูก",
        isCorrect: trueFalseAnswer === "true",
        orderIndex: 0,
      },
      {
        optionText: "ผิด",
        isCorrect: trueFalseAnswer === "false",
        orderIndex: 1,
      },
    ];
    correctAnswer = trueFalseAnswer === "true" ? "ถูก" : "ผิด";
  }

  if (questionType === "multiple_choice") {
    const optionTexts = Array.from({ length: 4 }, (_, index) =>
      getFormString(formData, `option_${index}`),
    );

    if (
      optionTexts.some((optionText) => !optionText) ||
      !Number.isInteger(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex > 3
    ) {
      return { ok: false, message: "กรุณากรอกตัวเลือก 4 ข้อและเลือกคำตอบที่ถูก" };
    }

    options = optionTexts.map((optionText, index) => ({
      optionText,
      isCorrect: index === correctOptionIndex,
      orderIndex: index,
    }));
    correctAnswer = optionTexts[correctOptionIndex] ?? "";
  }

  try {
    const updated = await updateLocalQuestion(session.userCode, questionSetId, questionId, {
      questionText,
      correctAnswer,
      questionType,
      options,
      imageFile,
      removeImage,
      points,
      timeLimitSeconds,
    });
    if (!updated) {
      return { ok: false, message: "ไม่พบคำถามนี้ หรือคุณไม่มีสิทธิ์แก้ไข" };
    }
  } catch (error) {
    if (error instanceof QuestionImageError) {
      return { ok: false, field: "image", message: error.message };
    }
    const reference = randomUUID().slice(0, 8);
    console.error("Question update failed", { reference, questionSetId, questionId, error });
    if (error instanceof QuestionImageStorageError) {
      return { ok: false, field: "image", message: `อัปโหลดรูปไม่สำเร็จ ลองบันทึกอีกครั้ง (อ้างอิง ${reference})` };
    }
    if (needsQuestionTypeMigration(error)) {
      return { ok: false, message: `ฐานข้อมูลยังไม่รองรับคำถามประเภทนี้หรือรูปประกอบ กรุณาแจ้งผู้ดูแลให้ตรวจ migration 005 (อ้างอิง ${reference})` };
    }
    return { ok: false, message: `บันทึกการแก้ไขไม่สำเร็จ ลองอีกครั้ง (อ้างอิง ${reference})` };
  }

  revalidatePath(`/teacher/question-sets/${questionSetId}`);
  revalidatePath("/teacher/question-sets");
  return { ok: true };
}

export async function deleteQuestionAction(formData: FormData) {
  const session = await requireRole("teacher");
  const questionSetId = getFormString(formData, "question_set_id");
  const questionId = getFormString(formData, "question_id");
  const redirectPath = `/teacher/question-sets/${questionSetId}`;

  if (!questionSetId || !questionId) {
    encodedRedirect("/teacher/question-sets", "error", "ข้อมูลคำถามไม่ครบ");
  }

  const deleted = await deleteLocalQuestion(
    session.userCode,
    questionSetId,
    questionId,
  );

  if (!deleted) {
    encodedRedirect(redirectPath, "error", "ไม่พบคำถามที่ต้องการลบ");
  }

  revalidatePath(redirectPath);
  encodedRedirect(redirectPath, "notice", "ลบคำถามแล้ว");
}

export async function deleteSelectedQuestionsAction(formData: FormData) {
  const session = await requireRole("teacher");
  const questionSetId = getFormString(formData, "question_set_id");
  const questionIds = formData
    .getAll("question_ids")
    .filter((value): value is string => typeof value === "string");
  const redirectPath = `/teacher/question-sets/${questionSetId}`;

  if (!questionSetId || questionIds.length === 0) {
    encodedRedirect(redirectPath, "error", "กรุณาเลือกคำถามที่ต้องการลบ");
  }

  const deleted = await deleteLocalQuestions(
    session.userCode,
    questionSetId,
    questionIds,
  );

  if (!deleted) {
    encodedRedirect(redirectPath, "error", "ไม่พบคำถามที่ต้องการลบ");
  }

  revalidatePath(redirectPath);
  encodedRedirect(redirectPath, "notice", "ลบคำถามที่เลือกแล้ว");
}

export async function deleteQuestionSetAction(formData: FormData) {
  const session = await requireRole("teacher");
  const questionSetId = getFormString(formData, "question_set_id");

  if (!questionSetId) {
    encodedRedirect("/teacher/question-sets", "error", "ข้อมูลชุดคำถามไม่ครบ");
  }

  const deleted = await deleteLocalQuestionSet(session.userCode, questionSetId);

  if (!deleted.ok) {
    const message =
      deleted.reason === "active_room"
        ? `ชุดคำถามนี้กำลังถูกใช้กับห้อง ${deleted.activeRoomCode ?? ""} กรุณาปิดห้องก่อนลบชุดคำถาม`
        : "ไม่พบชุดคำถามที่ต้องการลบ";

    encodedRedirect(
      `/teacher/question-sets/${questionSetId}`,
      "error",
      message,
    );
  }

  revalidatePath("/teacher/question-sets");
  encodedRedirect("/teacher/question-sets", "notice", "ลบชุดคำถามแล้ว");
}

export async function deleteRoomAction(formData: FormData) {
  const session = await requireRole("teacher");
  const roomCode = getFormString(formData, "room_code");
  const fallbackPath = roomCode
    ? `/teacher/rooms/${roomCode}/results`
    : "/teacher/rooms/new";
  const returnPath = getSafeTeacherReturnPath(formData, fallbackPath);

  if (!roomCode) {
    encodedRedirect("/teacher/rooms/new", "error", "ข้อมูลห้องไม่ครบ");
  }

  const deleted = await deleteLocalGameSession({
    teacherCode: session.userCode,
    roomCode,
  });

  if (!deleted.ok) {
    encodedRedirect(
      returnPath,
      "error",
      deleted.reason,
    );
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/rooms/new");
  encodedRedirect(
    "/teacher/rooms/new",
    "notice",
    "ปิดห้องและลบข้อมูลรอบเล่นนี้แล้ว",
  );
}

export async function createRoomAction(formData: FormData) {
  const session = await requireRole("teacher");
  const activeRoom = await getActiveTeacherGameSession(session.userCode);

  if (activeRoom) {
    redirect(
      `/teacher/rooms/new?error=${encodeURIComponent(
        "คุณมีห้องที่ยังไม่จบอยู่แล้ว กรุณากลับไปใช้ห้องเดิมหรือจบเกมก่อนสร้างห้องใหม่",
      )}&active_room=${activeRoom.roomCode}`,
    );
  }

  const parsed = createRoomSchema.safeParse({
    questionSetId: getFormString(formData, "question_set_id"),
    activityName: getFormString(formData, "activity_name"),
    teamCount: getFormString(formData, "team_count"),
    maxMembersPerTeam: getFormString(formData, "max_members_per_team"),
  });

  if (!parsed.success) {
    encodedRedirect("/teacher/rooms/new", "error", "ข้อมูลสร้างห้องไม่ถูกต้อง");
  }

  const questionSet = await getLocalQuestionSet(
    session.userCode,
    parsed.data.questionSetId,
  );

  if (!questionSet) {
    encodedRedirect("/teacher/rooms/new", "error", "ไม่พบชุดคำถามนี้");
  }

  if (questionSet.questions.length === 0) {
    encodedRedirect(
      "/teacher/rooms/new",
      "error",
      "ชุดคำถามนี้ยังไม่มีคำถาม เพิ่มคำถามก่อนสร้างห้อง",
    );
  }

  const mode = getFormString(formData, "game_mode") || "classic";
  if (!["classic", "boss_raid"].includes(mode)) encodedRedirect("/teacher/rooms/new", "error", "รูปแบบเกมไม่ถูกต้อง");
  if (mode === "boss_raid") {
    const minutes = Number(getFormString(formData, "raid_minutes"));
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60 || parsed.data.maxMembersPerTeam > 6) encodedRedirect("/teacher/rooms/new", "error", "Boss Raid ใช้เวลา 1–60 นาที และสมาชิก 1–6 คนต่อทีม");
    let roomCode: string;
    try {
      const result = await createRaid(session, { ...parsed.data, activityName: parsed.data.activityName || "", durationSeconds: minutes * 60, visibilityEnabled: formData.get("raid_visibility") === "on" });
      roomCode = result.roomCode;
    } catch (e) { encodedRedirect("/teacher/rooms/new", "error", e instanceof Error ? e.message : "สร้างห้องไม่สำเร็จ"); }
    revalidatePath("/teacher/rooms/new");
    redirect(`/teacher/rooms/${roomCode}/raid/dashboard`);
  }

  const gameSession = await createLocalGameSession({
    teacherCode: session.userCode,
    questionSetId: questionSet.id,
    questionSetTitle: questionSet.title,
    questionCount: questionSet.questions.length,
    activityName: parsed.data.activityName || null,
    teamCount: parsed.data.teamCount,
    maxMembersPerTeam: parsed.data.maxMembersPerTeam,
  });

  revalidatePath("/teacher/rooms/new");
  redirect(`/teacher/rooms/${gameSession.roomCode}/dashboard`);
}
