"use client";

import {
  CheckCircle2,
  Clock,
  Eye,
  LogOut,
  Lock,
  Pencil,
  PartyPopper,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Panel } from "@/components/ui/panel";
import type { StudentPlaySnapshot } from "@/lib/data/game-sessions";
import { subscribeToGameSessionChanges } from "@/lib/supabase/realtime-game";

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

function formatRemainingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PlayRoom({
  initialSnapshot,
}: {
  initialSnapshot: StudentPlaySnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [answerDraft, setAnswerDraft] = useState({
    questionIndex: initialSnapshot.currentQuestionIndex,
    text: "",
  });
  const [teamName, setTeamName] = useState(initialSnapshot.team.teamName);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTeamUpdating, setIsTeamUpdating] = useState(false);
  const [closedResultSessionId, setClosedResultSessionId] = useState<
    string | null
  >(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const answerText =
    answerDraft.questionIndex === snapshot.currentQuestionIndex
      ? answerDraft.text
      : "";
  const refreshTimerRef = useRef<number | null>(null);
  const remainingSeconds = snapshot.currentQuestionEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(snapshot.currentQuestionEndsAt).getTime() - nowMs) / 1000),
      )
    : null;
  const isTimerExpired =
    snapshot.status === "question_active" &&
    remainingSeconds !== null &&
    remainingSeconds <= 0;
  const canSubmit =
    snapshot.canSubmitAnswer &&
    !isTimerExpired &&
    answerText.trim().length > 0 &&
    !isSubmitting;
  const showCorrectAnswer =
    snapshot.status === "showing_answer" || snapshot.status === "ended";
  const ownRank = snapshot.rankedTeams.find(
    (team) => team.id === snapshot.team.id,
  );
  const isResultOpen =
    snapshot.status === "ended" && closedResultSessionId !== snapshot.sessionId;
  const playApiUrl = `/api/play/${encodeURIComponent(snapshot.roomCode)}`;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadSnapshot() {
      try {
        const response = await fetch(playApiUrl, { cache: "no-store" });

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

    const intervalId = window.setInterval(loadSnapshot, 10000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [playApiUrl]);

  const requestRealtimeRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(async () => {
      refreshTimerRef.current = null;

      try {
        const response = await fetch(playApiUrl, { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const nextSnapshot = (await response.json()) as StudentPlaySnapshot;
        setSnapshot(nextSnapshot);
      } catch {
        setMessage("รอเชื่อมต่อห้องอีกครั้ง");
      }
    }, 80);
  }, [playApiUrl]);

  useEffect(() => {
    const unsubscribe = subscribeToGameSessionChanges({
      roomCode: snapshot.roomCode,
      sessionId: snapshot.sessionId,
      onChange: requestRealtimeRefresh,
    });

    return () => {
      unsubscribe();

      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [requestRealtimeRefresh, snapshot.roomCode, snapshot.sessionId]);

  async function submitAnswer() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        playApiUrl,
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
      setAnswerDraft({
        questionIndex: (data as StudentPlaySnapshot).currentQuestionIndex,
        text: "",
      });
      setMessage("ส่งคำตอบแล้ว");
    } catch {
      setMessage("เชื่อมต่อการส่งคำตอบไม่ได้ ลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function renameTeam() {
    if (!snapshot.canRenameTeam || isTeamUpdating) {
      return;
    }

    setIsTeamUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(playApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename_team", teamName }),
      });
      const data = (await response.json()) as
        | StudentPlaySnapshot
        | { error?: string };

      if (!response.ok) {
        setMessage(
          "error" in data && data.error ? data.error : "เปลี่ยนชื่อทีมไม่ได้",
        );
        return;
      }

      setSnapshot(data as StudentPlaySnapshot);
      setMessage("เปลี่ยนชื่อทีมแล้ว");
    } catch {
      setMessage("เชื่อมต่อการเปลี่ยนชื่อทีมไม่ได้ ลองอีกครั้ง");
    } finally {
      setIsTeamUpdating(false);
    }
  }

  async function leaveTeam() {
    if (!snapshot.canChangeTeam || isTeamUpdating) {
      return;
    }

    setIsTeamUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(playApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave_team" }),
      });
      const data = (await response.json()) as
        | { redirectTo?: string; error?: string }
        | StudentPlaySnapshot;

      if (!response.ok) {
        setMessage(
          "error" in data && data.error ? data.error : "ออกจากทีมไม่ได้",
        );
        return;
      }

      if ("redirectTo" in data && data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }

      setSnapshot(data as StudentPlaySnapshot);
    } catch {
      setMessage("เชื่อมต่อการออกจากทีมไม่ได้ ลองอีกครั้ง");
    } finally {
      setIsTeamUpdating(false);
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
          <div className="w-full rounded-md border border-border bg-blue-50 p-3 sm:max-w-sm">
            {snapshot.canRenameTeam ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted" htmlFor="team_name">
                  ชื่อทีม
                </label>
                <div className="flex gap-2">
                  <input
                    id="team_name"
                    className="h-11 min-w-0 flex-1 rounded-md border border-border bg-background/70 px-3 text-sm outline-none focus:border-cyan"
                    maxLength={30}
                    onChange={(event) => setTeamName(event.target.value)}
                    value={teamName}
                  />
                  <button
                    aria-label="เปลี่ยนชื่อทีม"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isTeamUpdating || teamName.trim() === snapshot.team.teamName}
                    onClick={() => void renameTeam()}
                    title="เปลี่ยนชื่อทีม"
                    type="button"
                  >
                    <Pencil size={17} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted">ทีม</p>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {snapshot.team.teamName}
                </p>
              </div>
            )}
            {snapshot.canChangeTeam ? (
              <button
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-panel px-3 text-sm font-semibold transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isTeamUpdating}
                onClick={() => void leaveTeam()}
                type="button"
              >
                <LogOut size={16} />
                ออกจากทีม
              </button>
            ) : null}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted">
                    ข้อ {snapshot.currentQuestion.questionNumber}/
                    {snapshot.currentQuestion.totalQuestions} •{" "}
                    {snapshot.currentQuestion.points} คะแนน
                  </p>
                  {remainingSeconds !== null &&
                  snapshot.status === "question_active" ? (
                    <span
                      className={
                        remainingSeconds <= 10
                          ? "inline-flex h-11 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
                          : "inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background/70 px-3 text-sm font-semibold text-cyan"
                      }
                    >
                      <Clock size={17} />
                      {formatRemainingTime(remainingSeconds)}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-2xl font-semibold leading-9">
                  {snapshot.currentQuestion.questionText}
                </h3>
                {isTimerExpired ? (
                  <p className="mt-3 text-sm font-semibold text-warning">
                    หมดเวลาตอบคำถามข้อนี้แล้ว
                  </p>
                ) : null}
              </div>

              {showCorrectAnswer && snapshot.currentQuestion.correctAnswer ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  เฉลย: {snapshot.currentQuestion.correctAnswer}
                </div>
              ) : null}

              {snapshot.currentAnswer ? (
                <div className="rounded-md border border-border bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {!snapshot.isAnswerRevealed ? (
                      <Lock className="text-cyan" size={18} />
                    ) : snapshot.currentAnswer.isCorrect ? (
                      <CheckCircle2 className="text-emerald-700" size={18} />
                    ) : (
                      <XCircle className="text-red-700" size={18} />
                    )}
                    {snapshot.isAnswerRevealed
                      ? snapshot.currentAnswer.isCorrect
                        ? "ตอบถูก"
                        : "ยังไม่ถูก"
                      : "ส่งคำตอบแล้ว รอครูเฉลย"}
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
                    disabled={!snapshot.canSubmitAnswer || isTimerExpired}
                    onChange={(event) =>
                      setAnswerDraft({
                        questionIndex: snapshot.currentQuestionIndex,
                        text: event.target.value,
                      })
                    }
                    placeholder={
                      isTimerExpired
                        ? "หมดเวลาตอบแล้ว"
                        : snapshot.status === "question_active"
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

      {snapshot.status === "ended" && isResultOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-panel p-6 text-center shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary-blue" />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <PartyPopper size={28} />
            </div>
            <p className="mt-5 text-sm font-semibold text-cyan">จบเกมแล้ว</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {snapshot.team.teamName}
            </h2>
            <p className="mt-3 text-lg font-semibold">
              {ownRank?.rank
                ? ownRank.isTied
                  ? `อันดับร่วม ${ownRank.rank}`
                  : `อันดับ ${ownRank.rank}`
                : "ยังไม่จัดอันดับ"}
            </p>
            <p className="mt-2 text-sm text-muted">
              คะแนนเฉลี่ย {formatScore(snapshot.teamScore.averageScore)} • รวม{" "}
              {snapshot.teamScore.rawScore}
            </p>
            <button
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
              onClick={() => setClosedResultSessionId(snapshot.sessionId)}
              type="button"
            >
              ดูสรุปเต็ม
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
