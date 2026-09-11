import { getActiveTeacherGameSession, getActiveStudentGameSession } from "@/lib/data/game-sessions";
import type { AppSession } from "@/types/auth";
export async function getSessionLanding(session: Pick<AppSession, "role" | "userCode">) {
  if (session.role === "teacher") {
    const room = await getActiveTeacherGameSession(session.userCode);
    return room ? `/teacher/rooms/${room.roomCode}/dashboard` : "/teacher/question-sets";
  }
  const room = await getActiveStudentGameSession(session.userCode);
  return room ? `/play/${room.roomCode}` : "/join";
}
