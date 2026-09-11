import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
export async function GET() {
  const session = await getSession();
  return NextResponse.json(session ? { sessionId: session.sessionId, role: session.role } : null, { headers: { "Cache-Control": "no-store" } });
}
