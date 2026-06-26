import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getSessionFromTeacherRoomAccessToken } from "@/lib/auth/teacher-room-access";
import {
  getLocalGameSessionByRoomCode,
  getLocalTeacherGameSession,
  getTeacherDashboardSnapshot,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type DashboardApiProps = {
  params: Promise<{ roomCode: string }>;
};

export async function GET(_request: Request, { params }: DashboardApiProps) {
  const { roomCode } = await params;
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const teacher = await getSession();
  const token = new URL(_request.url).searchParams.get("teacher_access_token");
  const session =
    teacher?.role === "teacher"
      ? await getLocalTeacherGameSession(teacher.userCode, normalizedRoomCode)
      : await getSessionFromTeacherRoomAccessToken({
          roomCode: normalizedRoomCode,
          token,
        });

  if (!session && teacher?.role === "teacher") {
    const tokenSession = await getSessionFromTeacherRoomAccessToken({
      roomCode: normalizedRoomCode,
      token,
    });

    if (tokenSession) {
      return NextResponse.json(await getTeacherDashboardSnapshot(tokenSession));
    }
  }

  const publicSession = session
    ? null
    : await getLocalGameSessionByRoomCode(normalizedRoomCode);

  if (!session) {
    return NextResponse.json(
      {
        error: publicSession
          ? "สิทธิ์ครูของห้องนี้หมดอายุ กรุณารีเฟรชหน้า dashboard ครู"
          : "ไม่พบห้องนี้",
      },
      { status: publicSession ? 401 : 404 },
    );
  }

  return NextResponse.json(await getTeacherDashboardSnapshot(session));
}
