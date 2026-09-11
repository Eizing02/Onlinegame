import { NextResponse } from "next/server";

import { authorizeApi } from "@/lib/auth/api-session";
import {
  getStudentPlaySnapshot,
  leaveLocalTeam,
  renameLocalTeam,
  submitLocalAnswer,
  activateLocalTeamPower,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type PlayApiProps = {
  params: Promise<{ roomCode: string }>;
};

export async function GET(request: Request, { params }: PlayApiProps) {
  const auth = await authorizeApi(request, "student");

  if (!auth.ok) {
    return auth.response;
  }

  const { roomCode } = await params;
  const result = await getStudentPlaySnapshot({
    roomCode: normalizeRoomCode(roomCode),
    studentCode: auth.session.userCode,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 404 });
  }

  return NextResponse.json(result.snapshot);
}

export async function POST(request: Request, { params }: PlayApiProps) {
  const auth = await authorizeApi(request, "student");

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as {
    expectedQuestionId?: unknown;
    expectedSessionId?: unknown;
    action?: unknown;
    answerText?: unknown;
    selectedOptionId?: unknown;
    teamName?: unknown;
  } | null;
  const action = typeof body?.action === "string" ? body.action : "answer";
  const answerText =
    typeof body?.answerText === "string" ? body.answerText.trim() : "";
  const selectedOptionId =
    typeof body?.selectedOptionId === "string"
      ? body.selectedOptionId.trim()
      : "";

  const { roomCode } = await params;
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const result =
    action === "rename_team"
      ? await renameLocalTeam({
          roomCode: normalizedRoomCode,
          studentCode: auth.session.userCode,
          teamName: typeof body?.teamName === "string" ? body.teamName : "",
        })
      : action === "leave_team"
        ? await leaveLocalTeam({
            roomCode: normalizedRoomCode,
            studentCode: auth.session.userCode,
          })
        : action === "boost"
          ? await activateLocalTeamPower({ roomCode: normalizedRoomCode, studentCode: auth.session.userCode, expectedSessionId: typeof body?.expectedSessionId === "string" ? body.expectedSessionId : "", expectedQuestionId: typeof body?.expectedQuestionId === "string" ? body.expectedQuestionId : "" })
        : action === "answer"
          ? await submitLocalAnswer({
              roomCode: normalizedRoomCode,
              studentCode: auth.session.userCode,
              answerText,
              selectedOptionId,
              expectedQuestionId: typeof body?.expectedQuestionId === "string" ? body.expectedQuestionId : "",
              expectedSessionId: typeof body?.expectedSessionId === "string" ? body.expectedSessionId : "",
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
    studentCode: auth.session.userCode,
  });

  if (!snapshotResult.ok) {
    return NextResponse.json({ error: snapshotResult.reason }, { status: 404 });
  }

  return NextResponse.json(snapshotResult.snapshot);
}
