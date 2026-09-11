import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/api-session";
import { getLocalTeacherGameSession, getTeacherDashboardSnapshot } from "@/lib/data/game-sessions";
export async function GET(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const auth = await authorizeApi(request, "teacher");
  if (!auth.ok) return auth.response;
  const room = await getLocalTeacherGameSession(auth.session.userCode, (await params).roomCode);
  if (!room) return NextResponse.json({ error: "ห้องนี้ปิดแล้วหรือคุณไม่มีสิทธิ์เข้าถึง", redirectTo: "/teacher/rooms/new" }, { status: 404 });
  return NextResponse.json(await getTeacherDashboardSnapshot(room), { headers: { "Cache-Control": "no-store" } });
}
