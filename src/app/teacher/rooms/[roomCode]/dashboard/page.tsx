import { notFound } from "next/navigation";

import { LiveRoomPanels } from "@/app/teacher/rooms/[roomCode]/dashboard/live-room-panels";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
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

  const snapshot = await getTeacherDashboardSnapshot(session);

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8 lg:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard ครู</h1>
            <p className="mt-2 text-muted">
              ห้อง {session.roomCode} ใช้ชุดคำถาม {session.questionSetTitle}
            </p>
          </div>
          <ButtonLink
            href={`/teacher/rooms/${session.roomCode}/results`}
            variant="secondary"
          >
            ดูสรุปผล
          </ButtonLink>
        </div>

        <LiveRoomPanels initialSnapshot={snapshot} />
      </section>
    </AppShell>
  );
}
