import { notFound, redirect } from "next/navigation";

import { PlayRoom } from "@/app/play/[roomCode]/play-room";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { getStudentPlaySnapshot } from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type PlayPageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function PlayPage({ params }: PlayPageProps) {
  const student = await requireRole("student");
  const { roomCode } = await params;
  const normalizedRoomCode = normalizeRoomCode(roomCode);
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
    <AppShell>
      <section className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 lg:px-8">
        <PlayRoom initialSnapshot={result.snapshot} />
      </section>
    </AppShell>
  );
}
