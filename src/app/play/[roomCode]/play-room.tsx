"use client";

import {
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Panel } from "@/components/ui/panel";
import type { StudentPlaySnapshot } from "@/lib/data/game-sessions";

const statusLabel = {
  lobby: "รอครูเริ่มเกม",
  playing: "กำลังเล่น",
  question_active: "เปิดรับคำตอบ",
  answer_locked: "ปิดรับคำตอบ",
  showing_answer: "เฉลยคำตอบ",
  ended: "จบเกม",
};

function formatScore(score: number) {
  return Number.isInteger(score) ? score.toString() : score.toFixed(2);
}

export function PlayRoom({
  initialSnapshot,
}: {
  initialSnapshot: StudentPlaySnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [answerText, setAnswerText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit =
    snapshot.canSubmitAnswer && answerText.trim().length > 0 && !isSubmitting;
  const showCorrectAnswer =
    snapshot.status === "showing_answer" || snapshot.status === "ended";

  useEffect(() => {
    let isActive = true;

    async function loadSnapshot() {
      try {
        const response = await fetch(
          `/api/play/${encodeURIComponent(snapshot.roomCode)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const nextSnapshot = (await response.json()) as StudentPlaySnapshot;

        if (isActive) {
          setSnapshot(nextSnapshot);
        }
      } catch {
        if (isActive) {
          setMessage("กำลังรอเชื่อมต่อห้องอีกครั้ง");
        }
      }
    }

    const intervalId = window.setInterval(loadSnapshot, 1000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [snapshot.roomCode]);

  async function submitAnswer() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/play/${encodeURIComponent(snapshot.roomCode)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answerText }),
        },
      );
      const data = (await response.json()) as StudentPlaySnapshot | {
        error?: string;
      };

      if (!response.ok) {
        setMessage("error" in data && data.error ? data.error : "ส่งคำตอบไม่ได้");
        return;
      }

      setSnapshot(data as StudentPlaySnapshot);
      setAnswerText("");
      setMessage("ส่งคำตอบแล้ว");
    } catch {
      setMessage("เชื่อมต่อการส่งคำตอบไม่ได้ ลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Panel className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-sm font-medium text-muted">ห้องที่เข้าร่วม</p>
            <h1 className="mt-1 text-3xl font-semibold">
              {snapshot.roomCode}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {snapshot.activityName || snapshot.questionSetTitle}
            </p>
          </div>
          <div className="rounded-md bg-blue-50 px-4 py-3 text-sm font-semibold text-primary">
            {snapshot.team.teamName}
          </div>
        </div>

        {!snapshot.participant.isScoreEligible ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            คุณเข้าหลังเริ่มเกม จึงร่วมตอบได้แต่คะแนนจะไม่ถูกนำไปรวมในรอบนี้
          </div>
        ) : null}

        {message ? (
          <div
            className={
              message.includes("ไม่ได้") || message.includes("ไม่")
                ? "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                : "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
            }
          >
            {message}
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted">สถานะ</p>
              <h2 className="mt-2 text-2xl font-semibold leading-9">
                {statusLabel[snapshot.status]}
              </h2>
            </div>
            {snapshot.status === "question_active" ? (
              <Clock className="text-primary" size={24} />
            ) : snapshot.status === "showing_answer" ? (
              <Eye className="text-emerald-700" size={24} />
            ) : (
              <Lock className="text-muted" size={24} />
            )}
          </div>

          {snapshot.currentQuestion ? (
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted">
                  ข้อ {snapshot.currentQuestion.questionNumber}/
                  {snapshot.currentQuestion.totalQuestions} •{" "}
                  {snapshot.currentQuestion.points} คะแนน
                </p>
                <h3 className="mt-2 text-2xl font-semibold leading-9">
                  {snapshot.currentQuestion.questionText}
                </h3>
              </div>

              {showCorrectAnswer && snapshot.currentQuestion.correctAnswer ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  เฉลย: {snapshot.currentQuestion.correctAnswer}
                </div>
              ) : null}

              {snapshot.currentAnswer ? (
                <div className="rounded-md border border-border bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {snapshot.currentAnswer.isCorrect ? (
                      <CheckCircle2 className="text-emerald-700" size={18} />
                    ) : (
                      <XCircle className="text-red-700" size={18} />
                    )}
                    ส่งคำตอบแล้ว
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    คำตอบของคุณ: {snapshot.currentAnswer.answerText}
                  </p>
                  {showCorrectAnswer ? (
                    <p className="mt-1 text-sm text-muted">
                      คะแนนที่ได้: {snapshot.currentAnswer.scoreAwarded}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    className="min-h-32 w-full rounded-md border border-border bg-white p-3 outline-none focus:border-primary disabled:bg-slate-50"
                    disabled={!snapshot.canSubmitAnswer}
                    onChange={(event) => setAnswerText(event.target.value)}
                    placeholder={
                      snapshot.status === "question_active"
                        ? "พิมพ์คำตอบ..."
                        : "รอคำถามจากครู..."
                    }
                    value={answerText}
                  />
                  <button
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={!canSubmit}
                    onClick={() => void submitAnswer()}
                    type="button"
                  >
                    <Send size={18} />
                    {isSubmitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-muted">
              คุณเข้าห้องแล้วในชื่อ {snapshot.participant.displayName}
              เมื่อครูเริ่มเกม คำถามจะแสดงตรงนี้
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border p-4">
            <p className="text-sm text-muted">สถานะผู้เล่น</p>
            <p className="mt-1 font-semibold text-emerald-700">
              {snapshot.participant.isScoreEligible
                ? "ร่วมคะแนน"
                : "ร่วมเล่น ไม่นับคะแนน"}
            </p>
          </div>
          <div className="rounded-md border border-border p-4">
            <p className="text-sm text-muted">คะแนนเฉลี่ยทีม</p>
            <p className="mt-1 font-semibold">
              {formatScore(snapshot.teamScore.averageScore)} คะแนน
            </p>
          </div>
          <div className="rounded-md border border-border p-4">
            <p className="text-sm text-muted">ตอบแล้ว</p>
            <p className="mt-1 font-semibold">
              {snapshot.answerProgress.answeredCount}/
              {snapshot.answerProgress.totalParticipantCount} คน
            </p>
          </div>
        </div>
      </Panel>

      {snapshot.status === "ended" ? (
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-emerald-700" />
            <h2 className="font-semibold">สรุปอันดับ</h2>
          </div>
          <div className="space-y-3">
            {snapshot.rankedTeams.map((team) => (
              <div
                className="rounded-md border border-border p-3 text-sm"
                key={team.id}
              >
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{team.teamName}</span>
                  <span className="text-muted">
                    {team.rank
                      ? team.isTied
                        ? `อันดับร่วม ${team.rank}`
                        : `อันดับ ${team.rank}`
                      : "ไม่จัดอันดับ"}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  เฉลี่ย {formatScore(team.averageScore)} • รวม {team.rawScore}{" "}
                  • ตัวหาร {team.lockedMemberCount}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
