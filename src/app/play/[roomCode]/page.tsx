import { notFound, redirect } from "next/navigation";

import { PlayRoom } from "@/app/play/[roomCode]/play-room";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { getStudentPlaySnapshot } from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";
import { roomIsRaid } from "@/features/boss-raid/server/config";

type PlayPageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function PlayPage({ params }: PlayPageProps) {
  const student = await requireRole("student");
  const { roomCode } = await params;
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  if (await roomIsRaid(normalizedRoomCode)) redirect(`/play/${normalizedRoomCode}/raid`);
  const result = await getStudentPlaySnapshot({
    roomCode: normalizedRoomCode,
    studentCode: student.userCode,
  });

  if (!result.ok) {
    if (result.reason.includes("เลือกทีม")) {
      redirect(
        `/join?room_code=${normalizedRoomCode}&error=${encodeURIComponent(
          result.reason,
        )}`,
      );
    }

    notFound();
  }

  return (
    <AppShell room>
      <section className="room-route student-room-route">
        <PlayRoom initialSnapshot={result.snapshot} authSessionId={student.sessionId} />
      </section>
    </AppShell>
  );
}
