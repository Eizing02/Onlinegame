import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  getLocalTeacherGameSession,
  getTeacherDashboardSnapshot,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type DashboardApiProps = {
  params: Promise<{ roomCode: string }>;
};

export async function GET(_request: Request, { params }: DashboardApiProps) {
  const teacher = await getSession();

  if (!teacher || teacher.role !== "teacher") {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบครูก่อน" },
      { status: 401 },
    );
  }

  const { roomCode } = await params;
  const session = await getLocalTeacherGameSession(
    teacher.userCode,
    normalizeRoomCode(roomCode),
  );

  if (!session) {
    return NextResponse.json({ error: "ไม่พบห้องนี้" }, { status: 404 });
  }

  return NextResponse.json(await getTeacherDashboardSnapshot(session));
}
