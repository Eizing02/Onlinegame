import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  getStudentPlaySnapshot,
  leaveLocalTeam,
  renameLocalTeam,
  submitLocalAnswer,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type PlayApiProps = {
  params: Promise<{ roomCode: string }>;
};

async function requireStudentResponse() {
  const student = await getSession();

  if (!student || student.role !== "student") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบนักเรียนก่อน" },
        { status: 401 },
      ),
    };
  }

  return { ok: true as const, student };
}

export async function GET(_request: Request, { params }: PlayApiProps) {
  const auth = await requireStudentResponse();

  if (!auth.ok) {
    return auth.response;
  }

  const { roomCode } = await params;
  const result = await getStudentPlaySnapshot({
    roomCode: normalizeRoomCode(roomCode),
    studentCode: auth.student.userCode,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }

  return NextResponse.json(result.snapshot);
}

export async function POST(request: Request, { params }: PlayApiProps) {
  const auth = await requireStudentResponse();

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    answerText?: unknown;
    teamName?: unknown;
  } | null;
  const action = typeof body?.action === "string" ? body.action : "answer";
  const answerText =
    typeof body?.answerText === "string" ? body.answerText.trim() : "";

  const { roomCode } = await params;
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const result =
    action === "rename_team"
      ? await renameLocalTeam({
          roomCode: normalizedRoomCode,
          studentCode: auth.student.userCode,
          teamName: typeof body?.teamName === "string" ? body.teamName : "",
        })
      : action === "leave_team"
        ? await leaveLocalTeam({
            roomCode: normalizedRoomCode,
            studentCode: auth.student.userCode,
          })
        : action === "answer"
          ? await submitLocalAnswer({
              roomCode: normalizedRoomCode,
              studentCode: auth.student.userCode,
              answerText,
            })
          : { ok: false as const, reason: "คำสั่งไม่ถูกต้อง" };

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  if (action === "leave_team") {
    return NextResponse.json({
      redirectTo: `/join?room_code=${normalizedRoomCode}`,
    });
  }

  const snapshotResult = await getStudentPlaySnapshot({
    roomCode: normalizedRoomCode,
    studentCode: auth.student.userCode,
  });

  if (!snapshotResult.ok) {
    return NextResponse.json({ error: snapshotResult.reason }, { status: 404 });
  }

  return NextResponse.json(snapshotResult.snapshot);
}
