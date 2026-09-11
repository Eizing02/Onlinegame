"use server";

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
  type CreateQuestionOptionInput,
  type QuestionType,
} from "@/lib/data/question-bank";
import {
  createLocalGameSession,
  deleteLocalGameSession,
  getActiveTeacherGameSession,
} from "@/lib/data/game-sessions";
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

function isFormFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    "type" in value &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    typeof value.size === "number" &&
    value.size > 0
  );
}

function getFormImageFile(formData: FormData, key: string) {
  const value = formData.get(key);

  return isFormFile(value) ? value : null;
}

function getQuestionType(value: string): QuestionType {
  if (value === "true_false" || value === "multiple_choice") {
    return value;
  }

  return "short_text";
}

function needsQuestionTypeMigration(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "";

  return (
    message.includes("question_type") ||
    message.includes("question_options") ||
    message.includes("image_path") ||
    message.includes("selected_option_id")
  );
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

export async function addQuestionAction(formData: FormData) {
  const session = await requireRole("teacher");
  const questionSetId = getFormString(formData, "question_set_id");
  const questionText = getFormString(formData, "question_text");
  const questionType = getQuestionType(getFormString(formData, "question_type"));
  const shortTextAnswer = getFormString(formData, "correct_answer");
  const trueFalseAnswer = getFormString(formData, "true_false_answer");
  const correctOptionIndex = Number(getFormString(formData, "correct_option_index"));
  const imageFile = getFormImageFile(formData, "image_file");
  const points = Number(getFormString(formData, "points") || "10");
  const timeLimitSeconds = Number(
    getFormString(formData, "time_limit_seconds") || "60",
  );
  const redirectPath = `/teacher/question-sets/${questionSetId}`;

  if (!questionSetId || !questionText) {
    encodedRedirect(redirectPath, "error", "กรุณากรอกคำถามและคำตอบให้ครบ");
  }

  if (
    !Number.isInteger(points) ||
    points < 0 ||
    points > 1000 ||
    !Number.isInteger(timeLimitSeconds) ||
    timeLimitSeconds < 5 ||
    timeLimitSeconds > 600
  ) {
    encodedRedirect(
      redirectPath,
      "error",
      "คะแนนหรือเวลาตอบไม่ถูกต้อง",
    );
  }

  if (imageFile && !imageFile.type.startsWith("image/")) {
    encodedRedirect(redirectPath, "error", "ไฟล์แนบต้องเป็นรูปภาพเท่านั้น");
  }

  let correctAnswer = shortTextAnswer;
  let options: CreateQuestionOptionInput[] = [];

  if (questionType === "short_text") {
    if (!correctAnswer) {
      encodedRedirect(redirectPath, "error", "กรุณากรอกคำตอบที่ถูก");
    }
  }

  if (questionType === "true_false") {
    if (trueFalseAnswer !== "true" && trueFalseAnswer !== "false") {
      encodedRedirect(redirectPath, "error", "กรุณาเลือกคำตอบถูก/ผิด");
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
      encodedRedirect(
        redirectPath,
        "error",
        "กรุณากรอกตัวเลือก 4 ข้อและเลือกคำตอบที่ถูก",
      );
    }

    options = optionTexts.map((optionText, index) => ({
      optionText,
      isCorrect: index === correctOptionIndex,
      orderIndex: index,
    }));
    correctAnswer = optionTexts[correctOptionIndex] ?? "";
  }

  let question = null;

  try {
    question = await addLocalQuestion(session.userCode, questionSetId, {
      questionText,
      correctAnswer,
      questionType,
      options,
      imageFile,
      points,
      timeLimitSeconds,
    });
  } catch (error) {
    if (needsQuestionTypeMigration(error)) {
      encodedRedirect(
        redirectPath,
        "error",
        "กรุณารัน SQL migration 005_question_types_and_images.sql ก่อนใช้คำถามแบบใหม่หรือรูปประกอบ",
      );
    }

    throw error;
  }

  if (!question) {
    encodedRedirect("/teacher/question-sets", "error", "ไม่พบชุดคำถามนี้");
  }

  revalidatePath(redirectPath);
  encodedRedirect(redirectPath, "notice", "เพิ่มคำถามแล้ว");
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
