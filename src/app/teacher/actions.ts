"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import {
  addLocalQuestion,
  createLocalQuestionSet,
  deleteLocalQuestion,
  getLocalQuestionSet,
} from "@/lib/data/question-bank";
import {
  createLocalGameSession,
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
  const correctAnswer = getFormString(formData, "correct_answer");
  const points = Number(getFormString(formData, "points") || "10");
  const timeLimitSeconds = Number(
    getFormString(formData, "time_limit_seconds") || "60",
  );
  const redirectPath = `/teacher/question-sets/${questionSetId}`;

  if (!questionSetId || !questionText || !correctAnswer) {
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

  const question = await addLocalQuestion(session.userCode, questionSetId, {
    questionText,
    correctAnswer,
    points,
    timeLimitSeconds,
  });

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
