import { serverClockAnchor } from "@/lib/game/server-clock";
import { notFound, redirect } from "next/navigation";

import { LiveRoomPanels } from "@/app/teacher/rooms/[roomCode]/dashboard/live-room-panels";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import {
  getLocalTeacherGameSession,
  getTeacherDashboardSnapshot,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type DashboardPageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function TeacherDashboardPage({
  params,
}: DashboardPageProps) {
  const teacher = await requireRole("teacher");
  const { roomCode } = await params;
  const session = await getLocalTeacherGameSession(
    teacher.userCode,
    normalizeRoomCode(roomCode),
  );

  if (!session) {
    notFound();
  }

  if (session.gameMode === "boss_raid") redirect(`/teacher/rooms/${session.roomCode}/raid/dashboard`);

  const snapshot = await getTeacherDashboardSnapshot(session);

  return (
    <AppShell room>
      <section className="room-route teacher-room-route">
        <LiveRoomPanels initialNow={serverClockAnchor()}
          initialSnapshot={snapshot}
          authSessionId={teacher.sessionId}
        />
      </section>
    </AppShell>
  );
}
