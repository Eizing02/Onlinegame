import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api-session";
import { advanceLocalGameQuestion, endLocalGameSession, getTeacherDashboardSnapshot, lockLocalGameAnswers, showLocalGameAnswer, startLocalGameSession } from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";
import { roomIsRaid } from "@/features/boss-raid/server/config";
const commands = { start: startLocalGameSession, lock: lockLocalGameAnswers, reveal: showLocalGameAnswer, next: advanceLocalGameQuestion, end: endLocalGameSession };
export async function POST(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const auth = await authorizeApi(request, "teacher");
  if (!auth.ok) return auth.response;
  const { roomCode } = await params;
  if (await roomIsRaid(roomCode)) return NextResponse.json({ error: "ใช้คำสั่งเริ่มหรือจบในหน้า Boss Raid", code: "RAID_MODE" }, { status: 409 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.command !== "string" || !Object.hasOwn(commands, body.command)) return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  const result = await commands[body.command as keyof typeof commands]({ teacherCode: auth.session.userCode, roomCode: normalizeRoomCode(roomCode) });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
  return NextResponse.json(await getTeacherDashboardSnapshot(result.session));
}
