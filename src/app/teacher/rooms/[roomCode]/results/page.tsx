import { LoadingForm } from "@/components/ui/loading-form";
import { Award, Crown, Trophy } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { deleteRoomAction } from "@/app/teacher/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/session";
import {
  getParticipantScoreSummaries,
  getLocalTeacherGameSession,
  getRankedTeams,
} from "@/lib/data/game-sessions";
import { normalizeRoomCode } from "@/lib/game/room-code";
import { ClassicCsvButton } from "./classic-csv-button";

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

  if (session.gameMode === "boss_raid") {
    redirect(`/teacher/rooms/${session.roomCode}/raid/results`);
  }

  const results = getRankedTeams(session);
  const participantScores = getParticipantScoreSummaries(session);
  const topTeams = results.filter((row) => row.rank !== null).slice(0, 3);

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold">
              สรุปผลห้อง {session.roomCode}
            </h1>
            <p className="mt-2 text-muted">
              คะแนนเฉลี่ยและอันดับของแต่ละทีมในรอบนี้
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClassicCsvButton
              roomCode={session.roomCode}
              rows={participantScores.map((row) => ({
                roomCode: session.roomCode,
                teamName: row.teamName,
                displayName: row.displayName,
                studentCode: row.studentCode,
                answeredCount: row.answeredCount,
                correctCount: row.correctCount,
                rawScore: row.rawScore,
                isScoreEligible: row.isScoreEligible,
              }))}
            />
            <ButtonLink
              href={`/teacher/rooms/${session.roomCode}/dashboard`}
              variant="secondary"
            >
              กลับหน้าคุมเกม
            </ButtonLink>
          </div>
        </div>

        {query.error ? (
          <div className="rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {query.error}
          </div>
        ) : null}
        {query.notice ? (
          <div className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-medium text-success">
            {query.notice}
          </div>
        ) : null}

        {topTeams.length > 0 ? (
          <Panel className="space-y-4 border-primary/35">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                <Trophy size={24} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  ทีมยอดเยี่ยมประจำรอบ
                </h2>
                <p className="text-sm text-muted">
                  จัดอันดับจากคะแนนเฉลี่ยต่อสมาชิกที่ล็อกไว้ตอนเริ่มเกม
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {topTeams.map((row, idx) => (
                <div
                  className={
                    idx === 0
                      ? "rounded-xl border-2 border-[var(--selection-gold)] bg-surface p-4"
                      : "rounded-xl border border-border bg-surface p-4"
                  }
                  key={row.id}
                >
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                    {idx === 0 ? (
                      <Crown size={16} aria-hidden="true" />
                    ) : (
                      <Award size={15} aria-hidden="true" />
                    )}
                    {row.isTied ? `อันดับร่วม ${row.rank}` : `อันดับ ${row.rank}`}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {row.teamName}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-primary">
                    {formatScore(row.averageScore)}
                  </p>
                  <p className="text-xs text-muted">
                    รวม {row.rawScore} คะแนน ÷ {row.lockedMemberCount} คน
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel>
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="ตารางคะแนนทีม เลื่อนแนวนอนได้"
            tabIndex={0}
          >
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="py-3 font-semibold">อันดับ</th>
                  <th className="py-3 font-semibold">ทีม</th>
                  <th className="py-3 font-semibold">คะแนนเฉลี่ย</th>
                  <th className="py-3 font-semibold">คะแนนรวม</th>
                  <th className="py-3 font-semibold">สมาชิกที่นับคะแนน</th>
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
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="ตารางคะแนนรายคน เลื่อนแนวนอนได้"
            tabIndex={0}
          >
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
              <h2 className="text-lg font-semibold">ปิดห้องนี้</h2>
              <p className="mt-1 text-sm text-muted">
                ลบข้อมูลรอบเล่นนี้ เช่น ผู้เข้าห้อง ทีม คำตอบ และ event โดยเก็บชุดคำถามไว้
              </p>
            </div>
            <LoadingForm action={deleteRoomAction}>
              <input name="room_code" type="hidden" value={session.roomCode} />
              <input
                name="return_to"
                type="hidden"
                value={`/teacher/rooms/${session.roomCode}/results`}
              />
              <ConfirmSubmitButton
                className="inline-flex h-11 items-center justify-center rounded-md border border-danger bg-danger/10 px-4 text-sm font-semibold text-danger transition hover:bg-danger/15"
                message={`ปิดห้อง ${session.roomCode} และลบข้อมูลรอบเล่นทั้งหมด? หลังปิดห้องจะดูสรุปย้อนหลังไม่ได้`}
              >
                ปิดห้อง
              </ConfirmSubmitButton>
            </LoadingForm>
          </Panel>
        ) : null}
      </section>
    </AppShell>
  );
}
