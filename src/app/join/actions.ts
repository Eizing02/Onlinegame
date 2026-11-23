"use server";

import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { getJoinableGameSession, joinLocalGameSession, leaveLocalTeam } from "@/lib/data/game-sessions";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/game/room-code";

function normalizeThaiDigits(value: string) {
  return value.replace(/[\u0E50-\u0E59]/g, (digit) =>
    String(digit.charCodeAt(0) - 0x0e50),
  );
}

export type CheckRoomResult =
  | { ok: true; roomCode: string }
  | { ok: false; error: string };

export async function checkRoomAction(
  rawRoomCode: string,
): Promise<CheckRoomResult> {
  await requireRole("student");
  const roomCode = normalizeRoomCode(normalizeThaiDigits(rawRoomCode ?? ""));

  if (!isValidRoomCode(roomCode)) {
    return { ok: false, error: "รหัสห้องต้องเป็นตัวเลข 4 หลัก" };
  }

  const game = await getJoinableGameSession(roomCode);
  if (!game) {
    return { ok: false, error: "ไม่พบห้องนี้ หรือห้องจบเกมแล้ว" };
  }

  return { ok: true, roomCode: game.roomCode };
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function encodedRedirect(
  path: string,
  key: "error" | "notice",
  message: string,
): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`);
}

export async function findRoomAction(formData: FormData) {
  await requireRole("student");
  const roomCode = normalizeRoomCode(getFormString(formData, "room_code"));

  if (!isValidRoomCode(roomCode)) {
    encodedRedirect("/join", "error", "กรุณากรอกรหัสห้องเป็นตัวเลข 4 หลัก");
  }

  redirect(`/join?room_code=${roomCode}`);
}

export async function chooseTeamAction(formData: FormData) {
  const student = await requireRole("student");
  const roomCode = normalizeRoomCode(getFormString(formData, "room_code"));
  const teamId = getFormString(formData, "team_id");

  if (!isValidRoomCode(roomCode)) {
    encodedRedirect("/join", "error", "รหัสห้องไม่ถูกต้อง");
  }

  if (!teamId) {
    encodedRedirect(`/join?room_code=${roomCode}`, "error", "กรุณาเลือกทีม");
  }

  const result = await joinLocalGameSession({
    roomCode,
    studentCode: student.userCode,
    displayName: student.displayName,
    authUserId: student.authUserId,
    teamId,
  });

  if (!result.ok) {
    encodedRedirect(`/join?room_code=${roomCode}`, "error", result.reason);
  }

  redirect(`/play/${result.roomCode}`);
}

export async function leaveTeamAction(formData: FormData) {
  const student = await requireRole("student");
  const roomCode = normalizeRoomCode(getFormString(formData, "room_code"));

  if (!isValidRoomCode(roomCode)) {
    encodedRedirect("/join", "error", "รหัสห้องไม่ถูกต้อง");
  }

  const result = await leaveLocalTeam({
    roomCode,
    studentCode: student.userCode,
  });

  if (!result.ok) {
    encodedRedirect(`/join?room_code=${roomCode}`, "error", result.reason);
  }

  encodedRedirect(`/join?room_code=${roomCode}`, "notice", "ออกจากทีมแล้ว เลือกทีมใหม่ได้เลย");
}
