import {
  getLocalGameSessionByRoomCode,
  type StoredGameSession,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type TeacherRoomAccessPayload = {
  roomCode: string;
  sessionId: string;
};

function decodeTeacherRoomAccessToken(token: string) {
  try {
    const payload = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as Partial<TeacherRoomAccessPayload>;

    if (!payload.roomCode || !payload.sessionId) {
      return null;
    }

    return {
      roomCode: normalizeRoomCode(payload.roomCode),
      sessionId: payload.sessionId,
    };
  } catch {
    return null;
  }
}

export function createTeacherRoomAccessToken(
  session: Pick<StoredGameSession, "id" | "roomCode">,
) {
  const payload: TeacherRoomAccessPayload = {
    roomCode: normalizeRoomCode(session.roomCode),
    sessionId: session.id,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export async function getSessionFromTeacherRoomAccessToken({
  roomCode,
  token,
}: {
  roomCode: string;
  token: string | null;
}) {
  if (!token) {
    return null;
  }

  const payload = decodeTeacherRoomAccessToken(token);
  const normalizedRoomCode = normalizeRoomCode(roomCode);

  if (!payload || payload.roomCode !== normalizedRoomCode) {
    return null;
  }

  const session = await getLocalGameSessionByRoomCode(normalizedRoomCode);

  if (!session || session.id !== payload.sessionId) {
    return null;
  }

  return session;
}
