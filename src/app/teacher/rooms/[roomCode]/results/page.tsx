import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/session";
import {
  getLocalTeacherGameSession,
  getRankedTeams,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type ResultsPageProps = {
  params: Promise<{ roomCode: string }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const teacher = await requireRole("teacher");
  const { roomCode } = await params;
  const session = await getLocalTeacherGameSession(
    teacher.userCode,
    normalizeRoomCode(roomCode),
  );

  if (!session) {
    notFound();
  }

  const results = getRankedTeams(session);

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold">
              สรุปผลห้อง {session.roomCode}
            </h1>
            <p className="mt-2 text-muted">
              คะแนนเฉลี่ยและอันดับของแต่ละกลุ่มในรอบนี้
            </p>
          </div>
          <ButtonLink
            href={`/teacher/rooms/${session.roomCode}/dashboard`}
            variant="secondary"
          >
            กลับ Dashboard
          </ButtonLink>
        </div>
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="py-3 font-semibold">อันดับ</th>
                  <th className="py-3 font-semibold">กลุ่ม</th>
                  <th className="py-3 font-semibold">คะแนนเฉลี่ย</th>
                  <th className="py-3 font-semibold">คะแนนรวม</th>
                  <th className="py-3 font-semibold">ตัวหาร</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-4 font-semibold">
                      {row.rank
                        ? row.isTied
                          ? `อันดับร่วม ${row.rank}`
                          : row.rank
                        : "ไม่จัดอันดับ"}
                    </td>
                    <td className="py-4">{row.teamName}</td>
                    <td className="py-4">{row.averageScore}</td>
                    <td className="py-4">{row.rawScore}</td>
                    <td className="py-4">{row.lockedMemberCount} คน</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </AppShell>
  );
}
