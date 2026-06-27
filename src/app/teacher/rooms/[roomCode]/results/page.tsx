import { notFound } from "next/navigation";

import { deleteRoomAction } from "@/app/teacher/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/session";
import {
  getParticipantScoreSummaries,
  getLocalTeacherGameSession,
  getRankedTeams,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";

type ResultsPageProps = {
  params: Promise<{ roomCode: string }>;
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

function formatScore(score: number) {
  return Number.isInteger(score) ? score.toString() : score.toFixed(2);
}

export default async function ResultsPage({
  params,
  searchParams,
}: ResultsPageProps) {
  const teacher = await requireRole("teacher");
  const { roomCode } = await params;
  const query = await searchParams;
  const session = await getLocalTeacherGameSession(
    teacher.userCode,
    normalizeRoomCode(roomCode),
  );

  if (!session) {
    notFound();
  }

  const results = getRankedTeams(session);
  const participantScores = getParticipantScoreSummaries(session);

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

        {query.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {query.error}
          </div>
        ) : null}
        {query.notice ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {query.notice}
          </div>
        ) : null}

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
                    <td className="py-4">{formatScore(row.averageScore)}</td>
                    <td className="py-4">{row.rawScore}</td>
                    <td className="py-4">{row.lockedMemberCount} คน</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">คะแนนรายคน</h2>
            <p className="mt-1 text-sm text-muted">
              ใช้ดูว่าใครตอบครบ ตอบถูก และทำคะแนนให้ทีมเท่าไรในรอบนี้
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="py-3 font-semibold">นักเรียน</th>
                  <th className="py-3 font-semibold">ทีม</th>
                  <th className="py-3 font-semibold">ตอบแล้ว</th>
                  <th className="py-3 font-semibold">ถูก</th>
                  <th className="py-3 font-semibold">คะแนนที่ทำได้</th>
                  <th className="py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {participantScores.map((row) => (
                  <tr
                    key={row.participantId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-4">
                      <span className="font-semibold">{row.displayName}</span>
                      <span className="ml-2 text-muted">{row.studentCode}</span>
                    </td>
                    <td className="py-4">{row.teamName}</td>
                    <td className="py-4">{row.answeredCount}</td>
                    <td className="py-4">{row.correctCount}</td>
                    <td className="py-4">{row.rawScore}</td>
                    <td className="py-4">
                      {row.isScoreEligible ? "นับคะแนน" : "ไม่นับคะแนน"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {session.status === "ended" ? (
          <Panel className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">ลบห้องนี้</h2>
              <p className="mt-1 text-sm text-muted">
                ลบข้อมูลรอบเล่นนี้ เช่น ผู้เข้าห้อง ทีม คำตอบ และ event โดยเก็บชุดคำถามไว้
              </p>
            </div>
            <form action={deleteRoomAction}>
              <input name="room_code" type="hidden" value={session.roomCode} />
              <button
                className="inline-flex h-11 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                type="submit"
              >
                ลบห้อง
              </button>
            </form>
          </Panel>
        ) : null}
      </section>
    </AppShell>
  );
}
