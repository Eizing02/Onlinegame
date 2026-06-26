import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  advanceLocalGameQuestion,
  endLocalGameSession,
  getTeacherDashboardSnapshot,
  lockLocalGameAnswers,
  showLocalGameAnswer,
  startLocalGameSession,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type ControlApiProps = {
  params: Promise<{ roomCode: string }>;
};

type TeacherCommand = "start" | "lock" | "reveal" | "next" | "end";

function isTeacherCommand(command: unknown): command is TeacherCommand {
  return (
    command === "start" ||
    command === "lock" ||
    command === "reveal" ||
    command === "next" ||
    command === "end"
  );
}

export async function POST(request: Request, { params }: ControlApiProps) {
  const teacher = await getSession();

  if (!teacher || teacher.role !== "teacher") {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบครูก่อน" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    command?: unknown;
  } | null;
  const command = body?.command;

  if (!isTeacherCommand(command)) {
    return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  }

  const { roomCode } = await params;
  const payload = {
    teacherCode: teacher.userCode,
    roomCode: normalizeRoomCode(roomCode),
  };
  const result =
    command === "start"
      ? await startLocalGameSession(payload)
      : command === "lock"
        ? await lockLocalGameAnswers(payload)
        : command === "reveal"
          ? await showLocalGameAnswer(payload)
          : command === "next"
            ? await advanceLocalGameQuestion(payload)
            : await endLocalGameSession(payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json(await getTeacherDashboardSnapshot(result.session));
}
