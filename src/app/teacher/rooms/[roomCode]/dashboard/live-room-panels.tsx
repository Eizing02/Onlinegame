"use client";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { AudioControl } from "@/components/audio/audio-control";
import { useBackgroundMusic } from "@/components/audio/audio-provider";
import { RevealMoment } from "@/components/game/reveal-moment";
import { TeamStandings } from "@/components/game/team-standings";
import { GameRules } from "@/components/game/game-rules";
import { fetchRoom, newestSnapshot } from "@/lib/game/client-response";
import { choiceLabel } from "@/lib/game/choice-labels";

import {
  BarChart3,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  FastForward,
  Lock,
  Play,
  Square,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { MathText } from "@/components/ui/math-text";
import { RoomTabs } from "@/components/game/room-tabs";
import { Panel } from "@/components/ui/panel";
import { QuestionImage } from "@/components/ui/question-image";
import type { TeacherDashboardSnapshot } from "@/lib/data/game-sessions";
import { subscribeToGameSessionChanges } from "@/lib/supabase/realtime-game";

type TeacherCommand = "start" | "lock" | "reveal" | "next" | "end";

type ControlButtonProps = {
  command: TeacherCommand;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  pendingCommand: TeacherCommand | null;
  runCommand: (command: TeacherCommand) => void;
  variant?: "primary" | "secondary" | "danger";
};

const statusLabel = {
  lobby: "รอเริ่มเกม",
  playing: "กำลังเล่น",
  question_active: "เปิดรับคำตอบ",
  answer_locked: "ปิดรับคำตอบ",
  showing_answer: "กำลังเฉลย",
  ended: "จบเกม",
};

const statusBadgeClassName: Record<
  TeacherDashboardSnapshot["status"],
  string
> = {
  lobby: "border-warning bg-warning/10 text-warning",
  playing: "border-cyan/40 bg-cyan/10 text-cyan",
  question_active: "border-cyan/40 bg-cyan/10 text-cyan",
  answer_locked: "border-warning bg-warning/10 text-warning",
  showing_answer: "border-success bg-success/10 text-success",
  ended: "border-danger bg-danger/10 text-danger",
};

const AUDIO_ASSETS = {
  background: "/assets/audio/bg-sci-fi.wav",
} as const;

function formatScore(score: number) {
  return Number.isInteger(score) ? score.toString() : score.toFixed(2);
}

function formatRemainingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getRemainingSeconds({
  endsAt,
  nowMs,
  startedAt,
  timeLimitSeconds,
}: {
  endsAt: string | null;
  nowMs: number;
  startedAt: string | null;
  timeLimitSeconds?: number;
}) {
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : NaN;

  if (Number.isFinite(endsAtMs)) {
    return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
  }

  const startedAtMs = startedAt ? new Date(startedAt).getTime() : NaN;

  if (Number.isFinite(startedAtMs) && typeof timeLimitSeconds === "number") {
    return Math.max(
      0,
      Math.ceil((startedAtMs + timeLimitSeconds * 1000 - nowMs) / 1000),
    );
  }

  return null;
}

function getTeacherPollInterval(status: TeacherDashboardSnapshot["status"]) {
  return status === "ended" ? 10000 : 3000;
}

function ControlButton({
  command,
  disabled,
  icon: Icon,
  label,
  pendingCommand,
  runCommand,
  variant = "secondary",
}: ControlButtonProps) {
  const isPending = pendingCommand === command;

  return (
    <button
      className={
        variant === "primary"
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary/50 bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:border-cyan/60 hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-muted"
          : variant === "danger"
            ? "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-danger bg-danger/10 px-4 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-cyan/35 bg-cyan/10 px-4 text-sm font-semibold text-cyan transition hover:border-cyan hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
      }
      disabled={disabled || pendingCommand !== null}
      onClick={() => runCommand(command)}
      type="button"
    >
      <Icon size={17} />
      {isPending ? "กำลังทำงาน..." : label}
    </button>
  );
}

export function LiveRoomPanels({
  initialSnapshot,
  initialNow,
  authSessionId,
}: {
  initialSnapshot: TeacherDashboardSnapshot;
  initialNow: number;
  authSessionId: string;
}) {
  const roomCode = initialSnapshot.roomCode;
  const dashboardApiUrl = `/api/teacher/rooms/${encodeURIComponent(
    roomCode,
  )}/dashboard`;
  const controlApiUrl = `/api/teacher/rooms/${encodeURIComponent(
    roomCode,
  )}/control`;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [syncLabel, setSyncLabel] = useState("กำลังเชื่อมต่อข้อมูลห้อง...");
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const [pendingCommand, setPendingCommand] = useState<TeacherCommand | null>(
    null,
  );
  const [revealedAnswerKey, setRevealedAnswerKey] = useState<string | null>(null);
  const [confirmEndNow, setConfirmEndNow] = useState(false);
  useBackgroundMusic(snapshot.status === "ended" ? null : AUDIO_ASSETS.background);
  const currentAnswerKey = `${snapshot.currentQuestionIndex}:${snapshot.status}`;
  const showTeacherAnswer = revealedAnswerKey === currentAnswerKey;
  const [nowMs, setNowMs] = useState(initialNow);
  const refreshTimerRef = useRef<number | null>(null);
  const pollIntervalMs = getTeacherPollInterval(snapshot.status);
  const remainingSeconds = getRemainingSeconds({
    endsAt: snapshot.currentQuestionEndsAt,
    nowMs,
    startedAt: snapshot.currentQuestionStartedAt,
    timeLimitSeconds: snapshot.currentQuestion?.timeLimitSeconds,
  });
  const showQuestionTimer =
    remainingSeconds !== null && snapshot.status === "question_active";
  const showAnswerStatus =
    Boolean(snapshot.currentQuestion) &&
    snapshot.status !== "lobby" &&
    snapshot.status !== "ended";
  const visibleParticipants = useMemo(
    () =>
      snapshot.participants.filter(
        (participant) => participant.connectionStatus !== "left",
      ),
    [snapshot.participants],
  );
  const teamNameById = useMemo(
    () =>
      new Map(
        snapshot.teamSummaries.map((team) => [team.id, team.teamName] as const),
      ),
    [snapshot.teamSummaries],
  );
  const isQuestionActive = snapshot.status === "question_active";
  const canReveal =
    snapshot.status === "question_active" || snapshot.status === "answer_locked";
  const canGoNext =
    snapshot.status === "showing_answer" ||
    snapshot.status === "answer_locked" ||
    snapshot.status === "question_active";
  const isLastQuestion =
    snapshot.currentQuestionIndex >= snapshot.questionCount - 1;

  useEffect(() => {
    let isActive = true;

    async function loadSnapshot() {
      if (document.hidden) return;
      try {
        const response = await fetchRoom(dashboardApiUrl, { cache: "no-store", headers: { "x-client-session": authSessionId } });

        if (!response.ok) {
          if (isActive) {
            setSyncLabel("อัปเดตข้อมูลห้องไม่ได้");
          }
          return;
        }

        const nextSnapshot =
          (await response.json()) as TeacherDashboardSnapshot;

        if (isActive) {
          setSnapshot(previous => newestSnapshot(previous, nextSnapshot));
          setNowMs(Date.now());
          setSyncLabel(
            `อัปเดตล่าสุด ${new Date(
              nextSnapshot.updatedAt,
            ).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`,
          );
        }
      } catch {
        if (isActive) {
          setSyncLabel("รอเชื่อมต่อข้อมูลห้องอีกครั้ง");
        }
      }
    }

    void loadSnapshot();
    const intervalId = window.setInterval(loadSnapshot, pollIntervalMs);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [dashboardApiUrl, pollIntervalMs, authSessionId]);

  const requestRealtimeRefresh = useCallback(() => {
    if (document.hidden) return;
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(async () => {
      refreshTimerRef.current = null;

      try {
        const response = await fetchRoom(dashboardApiUrl, { cache: "no-store", headers: { "x-client-session": authSessionId } });

        if (!response.ok) {
          setSyncLabel("อัปเดตห้องไม่ได้");
          return;
        }

        const nextSnapshot =
          (await response.json()) as TeacherDashboardSnapshot;

        setSnapshot(previous => newestSnapshot(previous, nextSnapshot));
        setNowMs(Date.now());
        setSyncLabel(
          `Realtime • ${new Date(nextSnapshot.updatedAt).toLocaleTimeString(
            "th-TH",
            {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            },
          )}`,
        );
      } catch {
        setSyncLabel("รอเชื่อมต่อห้องอีกครั้ง");
      }
    }, 80);
  }, [dashboardApiUrl, authSessionId]);

  useEffect(() => {
    const unsubscribe = subscribeToGameSessionChanges({
      roomCode,
      sessionId: snapshot.sessionId,
      onChange: requestRealtimeRefresh,
      onStatusChange(status) {
        if (status === "SUBSCRIBED") {
          setSyncLabel("Realtime พร้อมใช้งาน");
          return;
        }

        if (status === "fallback") {
          setSyncLabel("ใช้โหมดสำรอง");
        }
      },
    });

    return () => {
      unsubscribe();

      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [requestRealtimeRefresh, roomCode, snapshot.sessionId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function runCommand(command: TeacherCommand) {
    setPendingCommand(command);
    setControlMessage(null);

    try {
      const response = await fetchRoom(controlApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-session": authSessionId,
        },
        body: JSON.stringify({ command }),
      });
      const data = (await response.json()) as
        | TeacherDashboardSnapshot
        | { error?: string };

      if (!response.ok) {
        setControlMessage(
          "error" in data && data.error ? data.error : "ทำรายการไม่สำเร็จ",
        );
        return;
      }

      setSnapshot(previous => newestSnapshot(previous, data as TeacherDashboardSnapshot));
      setNowMs(Date.now());
      setControlMessage("อัปเดตสถานะเกมแล้ว");
    } catch {
      setControlMessage("เชื่อมต่อคำสั่งไม่ได้ ลองอีกครั้ง");
    } finally {
      setPendingCommand(null);
    }
  }

  return (
    <>
      {(pendingCommand!==null)&&<LoadingIndicator overlay label="กำลังเปลี่ยนสถานะเกม…"/>}
      <RevealMoment eventKey={snapshot.status === "showing_answer" ? snapshot.sessionId + ":" + snapshot.currentQuestionIndex : null} correct={(snapshot.revealSummary?.correctCount ?? 0) > 0} title="เปิดผลคำตอบแล้ว!" detail={snapshot.revealSummary ? "ตอบถูก " + snapshot.revealSummary.correctCount + " คน · อัปเดตคะแนนและอันดับพร้อมกัน" : "ดูผลคำตอบของทุกทีม"} />
      <RoomTabs header={<><div className="room-identity"><h1>ห้อง {snapshot.roomCode} · ครูคุมเกม</h1><p>{snapshot.activityName || snapshot.questionSetTitle}</p></div><div className="room-live-status"><span>ตอบแล้ว {snapshot.answerProgress.answeredCount}/{snapshot.answerProgress.totalParticipantCount} คน</span>{showQuestionTimer && <strong className="text-cyan">{formatRemainingTime(remainingSeconds)}</strong>}</div><a className="room-results-link" href={'/teacher/rooms/' + snapshot.roomCode + '/results'}>ดูสรุปผล</a></>} tabs={[
        {label:'คุมเกม',content:<>      <Panel className="teacher-controls">
        {snapshot.status === "lobby" && <details className="teacher-rules"><summary>กติกาห้องนี้</summary><GameRules version={snapshot.rulesVersion}/></details>}
        {snapshot.currentQuestion?.roundMultiplier === 1.5 && <p className="final-round-banner">รอบสุดท้าย · คะแนนข้อนี้ ×1.5</p>}
        {(snapshot.status === "question_active" || snapshot.status === "answer_locked") && <p className="text-sm text-muted">คะแนนและอันดับยังไม่รวมข้อนี้ จะเปิดพร้อมกันเมื่อเฉลย</p>}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-11 items-center rounded-md border px-3 text-sm font-semibold ${statusBadgeClassName[snapshot.status]}`}
            >
              สถานะ: {statusLabel[snapshot.status]}
            </span>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <AudioControl />
          </div>
        </div>

        {snapshot.status === "lobby" ? (
          <div className="space-y-3">
            <div className="flex flex-col justify-between gap-2 rounded-xl border border-primary/35 bg-surface px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold text-muted">
                  รหัสเข้าห้องเรียน (แสดงหน้าห้อง)
                </p>
                <p className="mt-1 font-mono text-4xl font-bold tracking-[0.18em] text-primary sm:text-5xl">
                  {snapshot.roomCode}
                </p>
              </div>
              <p className="text-sm text-muted sm:text-right">
                ให้นักเรียนกรอกเลข 4 หลักนี้ที่หน้าเข้าห้อง
                <span className="mt-1 block font-semibold text-foreground">
                  เข้าร่วมแล้ว {snapshot.answerProgress.totalParticipantCount} คน ·{" "}
                  {snapshot.teamCount} ทีม
                </span>
              </p>
            </div>
            {!snapshot.canStart ||
            snapshot.emptyTeamCount > 0 ||
            snapshot.incompleteTeamCount > 0 ? (
              <div className="space-y-2 rounded-md border border-warning bg-warning/10 p-4 text-sm text-warning">
                {!snapshot.canStart ? (
                  <p>ต้องมีนักเรียนอย่างน้อย 1 คนก่อนเริ่มเกม</p>
                ) : null}
                {snapshot.emptyTeamCount > 0 ? (
                  <p>มีทีมว่าง {snapshot.emptyTeamCount} ทีม แต่ยังเริ่มเกมได้</p>
                ) : null}
                {snapshot.incompleteTeamCount > 0 ? (
                  <p>
                    มีทีมที่ยังไม่ครบ {snapshot.incompleteTeamCount} ทีม
                    ระบบจะล็อกจำนวนสมาชิกตอนเริ่มเกม
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {controlMessage ? (
          <div
            className={
              controlMessage.includes("ไม่") || controlMessage.includes("ไม่ได้")
                ? "rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
                : "rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-medium text-success"
            }
          >
            {controlMessage}
          </div>
        ) : null}

        {snapshot.status === "ended" ? (
          <ButtonLink
            className="w-full"
            href={`/teacher/rooms/${snapshot.roomCode}/results`}
          >
            ดูสรุปผล
          </ButtonLink>
        ) : null}

        <div className="teacher-question-layout">
          <div className="teacher-bank-title">
            <ClipboardList className="mt-1 text-primary" size={22} />
            <div>
              <p className="text-sm font-medium text-muted">ชุดคำถาม</p>
              <h3 className="mt-1 text-xl font-semibold">
                {snapshot.questionSetTitle}
              </h3>
              <p className="mt-2 text-sm text-muted">
                ทั้งหมด {snapshot.questionCount} ข้อ
                {snapshot.activityName ? ` • ${snapshot.activityName}` : ""}
              </p>
            </div>
          </div>

          <div className="teacher-question-area" tabIndex={0} role="region" aria-label="คำถามของครู">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted">คำถามปัจจุบัน</p>
              <div className="flex flex-wrap items-center gap-2">
                {snapshot.currentQuestion &&
                snapshot.status !== "showing_answer" &&
                snapshot.status !== "ended" ? (
                  <button
                    aria-pressed={showTeacherAnswer}
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                    onClick={() =>
                      setRevealedAnswerKey((prev) =>
                        prev === currentAnswerKey ? null : currentAnswerKey,
                      )
                    }
                    type="button"
                  >
                    {showTeacherAnswer ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showTeacherAnswer ? "ซ่อนคำตอบ (จอโปรเจกเตอร์)" : "แอบดูคำตอบ (เฉพาะครู)"}
                  </button>
                ) : null}
                {showQuestionTimer ? (
                  <span
                    className={
                      remainingSeconds <= 10
                        ? "inline-flex h-11 items-center gap-2 rounded-md border border-danger bg-danger/10 px-3 text-sm font-semibold text-danger"
                        : "inline-flex h-11 items-center gap-2 rounded-md border border-cyan/40 bg-cyan/10 px-3 text-sm font-semibold text-cyan"
                    }
                  >
                    <Clock size={17} />
                    {formatRemainingTime(remainingSeconds)}
                  </span>
                ) : null}
              </div>
            </div>
            {snapshot.currentQuestion ? (
              (() => {
                const isAnswerRevealed =
                  snapshot.status === "showing_answer" ||
                  snapshot.status === "ended" ||
                  showTeacherAnswer;

                return (
                  <>
                    <div className="mt-2 text-lg font-semibold leading-7">
                      <span>
                        ข้อ {snapshot.currentQuestion.questionNumber}/
                        {snapshot.currentQuestion.totalQuestions}:{" "}
                      </span>
                      <MathText
                        className="inline"
                        inline
                        text={snapshot.currentQuestion.questionText}
                      />
                    </div>
                    {snapshot.currentQuestion.imageUrl ? (
                      <QuestionImage
                        alt={`รูปประกอบคำถามข้อ ${snapshot.currentQuestion.questionNumber}`}
                        className="mt-4 bg-surface"
                        src={snapshot.currentQuestion.imageUrl}
                      />
                    ) : null}
                    <p className="mt-2 text-sm text-muted">
                      {snapshot.currentQuestion.points} คะแนน •{" "}
                      {snapshot.currentQuestion.timeLimitSeconds} วินาที
                    </p>
                    {snapshot.currentQuestion.options.length > 0 ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {snapshot.currentQuestion.options.map((option, optionIndex) => (
                          <div
                            className={
                              isAnswerRevealed && option.isCorrect
                                ? "rounded-md border border-success bg-success/10 px-3 py-2 text-sm font-semibold text-success"
                                : "rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold"
                            }
                            key={option.id}
                          >
                            <span className="mr-2 rounded bg-white/80 px-2 py-0.5 text-xs text-muted">
                              {choiceLabel(optionIndex)}
                            </span>
                            <MathText className="inline" inline text={option.optionText} />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {snapshot.currentQuestion.correctAnswer && isAnswerRevealed ? (
                      <div className="mt-2 text-sm font-semibold text-success">
                        เฉลย:{" "}
                        <MathText
                          className="inline"
                          inline
                          text={snapshot.currentQuestion.correctAnswer}
                        />
                      </div>
                    ) : snapshot.currentQuestion.correctAnswer ? (
                      <p className="mt-2 text-xs text-muted">
                        ซ่อนเฉลยอยู่เพื่อความปลอดภัยบนจอโปรเจกเตอร์ · จะเปิดอัตโนมัติเมื่อกดเฉลย
                      </p>
                    ) : null}
                  </>
                );
              })()
            ) : (
              <p className="mt-2 text-sm text-muted">ยังไม่มีคำถามที่เปิดอยู่</p>
            )}
            <p className="mt-3 text-sm text-muted">
              ตอบแล้ว {snapshot.answerProgress.answeredCount}/
              {snapshot.answerProgress.totalParticipantCount} คน
              {snapshot.answerProgress.eligibleCount > 0
                ? ` • ผู้มีสิทธิ์คะแนน ${snapshot.answerProgress.eligibleCount} คน`
                : ""}
            </p>
          </div>

          <div className="teacher-command-bar">
            <ControlButton
              command="start"
              disabled={snapshot.status !== "lobby" || !snapshot.canStart}
              icon={Play}
              label="เริ่มเกม"
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
              variant={snapshot.status === "lobby" ? "primary" : "secondary"}
            />
            <ControlButton
              command="lock"
              disabled={!isQuestionActive}
              icon={Lock}
              label="ล็อกคำตอบ"
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
              variant={isQuestionActive ? "primary" : "secondary"}
            />
            <ControlButton
              command="reveal"
              disabled={!canReveal}
              icon={Eye}
              label="เฉลย"
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
              variant={canReveal && !isQuestionActive ? "primary" : "secondary"}
            />
            <ControlButton
              command="next"
              disabled={!canGoNext}
              icon={isLastQuestion ? Square : FastForward}
              label={isLastQuestion ? "จบเกม" : "ข้อถัดไป"}
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
              variant={canGoNext ? "primary" : "secondary"}
            />
            {confirmEndNow && snapshot.status !== "ended" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-danger bg-danger px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pendingCommand !== null}
                  onClick={() => {
                    setConfirmEndNow(false);
                    void runCommand("end");
                  }}
                  type="button"
                >
                  <Square size={17} />
                  {pendingCommand === "end" ? "กำลังจบเกม..." : "ยืนยันจบเกมทันที"}
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-panel-strong disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pendingCommand !== null}
                  onClick={() => setConfirmEndNow(false)}
                  type="button"
                >
                  เล่นต่อ
                </button>
              </div>
            ) : (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-danger bg-danger/10 px-4 text-sm font-semibold text-danger transition hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={snapshot.status === "ended" || pendingCommand !== null}
                onClick={() => setConfirmEndNow(true)}
                type="button"
              >
                <Square size={17} />
                จบเกมทันที
              </button>
            )}
          </div>
        </div>
      </Panel>
</>},
        {label:'ผู้เล่น',content:<div className="room-scroll teacher-players" tabIndex={0} role="region" aria-label="รายชื่อผู้เล่นและทีม">      <Panel className="teacher-roster space-y-5">
        <div>
          <p className="text-sm font-medium text-muted">รหัสห้อง</p>
          <p className="mt-2 text-5xl font-semibold tracking-normal">
            {snapshot.roomCode}
          </p>
          <p className="mt-2 text-sm text-muted">
            ให้นักเรียนกรอกเลข 4 หลักนี้เพื่อเข้าห้อง
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-muted">จำนวนทีม</p>
            <p className="mt-1 text-xl font-semibold">{snapshot.teamCount}</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-muted">คนต่อทีม</p>
            <p className="mt-1 text-xl font-semibold">
              {snapshot.maxMembersPerTeam}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              นักเรียนในห้อง ({visibleParticipants.length} คน)
            </h2>
            <span className="text-xs text-muted">{syncLabel}</span>
          </div>
          {(() => {
            const unassigned = visibleParticipants.filter((p) => !p.teamId);
            const assignedCount = visibleParticipants.length - unassigned.length;
            return visibleParticipants.length > 0 ? (
              <div className="space-y-3">
                <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
                  เข้าทีมแล้ว{" "}
                  <strong className="text-foreground">{assignedCount}</strong> /{" "}
                  {visibleParticipants.length} คน
                  {unassigned.length > 0
                    ? ` · ยังไม่เลือกทีม ${unassigned.length} คน`
                    : " · ทุกคนเข้าทีมครบแล้ว"}
                </p>
                {unassigned.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-warning">
                      ยังไม่เลือกทีม
                    </p>
                    {unassigned.map((participant) => (
                      <div
                        className="flex items-center gap-2.5 rounded-md border border-warning/40 bg-surface px-3 py-2 text-sm"
                        key={participant.id}
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel text-xs font-bold text-primary">
                          {participant.displayName.slice(0, 1)}
                        </span>
                        <span className="font-medium">{participant.displayName}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <details
                  className="rounded-md border border-border bg-surface px-3 py-1"
                  open={visibleParticipants.length <= 12}
                >
                  <summary className="text-xs font-semibold">
                    ดูรายชื่อนักเรียนทั้งหมด ({visibleParticipants.length} คน)
                  </summary>
                  <div className="mt-2 space-y-2 pb-2">
                    {visibleParticipants.map((participant) => (
                      <div
                        className="flex items-center gap-2.5 text-sm"
                        key={participant.id}
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel text-xs font-bold text-primary">
                          {participant.displayName.slice(0, 1)}
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium">{participant.displayName}</span>
                          <span className="ml-2 text-xs text-muted">
                            {participant.teamId
                              ? teamNameById.get(participant.teamId)
                              : "ยังไม่เลือกทีม"}
                          </span>
                          {participant.joinedAfterStart ? (
                            <span className="block text-xs text-warning">
                              เข้าหลังเริ่มเกม ไม่นับคะแนน
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border bg-surface p-3 text-sm text-muted">
                ยังไม่มีนักเรียนเข้าห้อง
              </p>
            );
          })()}
        </div>
      </Panel>
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <UsersRound size={20} className="text-primary" />
            <h2 className="font-semibold">รายชื่อทีม</h2>
          </div>
          <div className="space-y-3">
            {showAnswerStatus ? (
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full border border-success bg-success/10 px-2.5 py-1 text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  ตอบแล้ว
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-danger bg-danger/10 px-2.5 py-1 text-danger">
                  <span className="h-2 w-2 rounded-full bg-danger" />
                  ยังไม่ตอบ
                </span>
              </div>
            ) : null}
            {snapshot.teamSummaries.map((team) => (
              <div
                className="rounded-md border border-cyan/20 bg-surface p-3"
                key={team.id}
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold">{team.teamName}</span>
                  <span className="text-muted">
                    {team.memberCount}/{team.maxMembers} คน
                  </span>
                </div>
                {team.lockedMemberCount !== null ? (
                  <p className="mt-1 text-xs text-muted">
                    สมาชิกที่นับคะแนน {team.lockedMemberCount} คน
                  </p>
                ) : null}
                {team.participants.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {team.participants.map((participant) => {
                      const answered = participant.hasAnsweredCurrentQuestion;

                      return (
                        <div className="text-sm" key={participant.id}>
                          {showAnswerStatus ? (
                            <span
                              className={
                                answered
                                  ? "inline-flex w-full items-center gap-2 rounded-md border border-success bg-success/10 px-3 py-2 font-semibold text-success"
                                  : "inline-flex w-full items-center gap-2 rounded-md border border-danger bg-danger/10 px-3 py-2 font-semibold text-danger"
                              }
                            >
                              <span
                                className={
                                  answered
                                    ? "h-2.5 w-2.5 rounded-full bg-success"
                                    : "h-2.5 w-2.5 rounded-full bg-danger"
                                }
                              />
                              {participant.displayName}
                            </span>
                          ) : (
                            <span className="text-muted">
                              {participant.displayName}
                            </span>
                          )}
                          {!participant.isScoreEligible ? (
                            <span className="mt-1 block text-xs text-warning">
                              ไม่นับคะแนน
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">ยังไม่มีสมาชิก</p>
                )}
              </div>
            ))}
          </div>
        </Panel></div>},
        {label:'คะแนน',content:<div className="room-scroll teacher-scores" tabIndex={0} role="region" aria-label="คะแนนและอันดับทีม">        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-warning" />
            <h2 className="font-semibold">คะแนนแต่ละทีม</h2>
          </div>
          <div className="space-y-3">
            {(() => {
              const maxAvgScore = Math.max(
                1,
                ...snapshot.teamSummaries.map((item) => item.averageScore),
              );
              return snapshot.teamSummaries.map((team) => {
                const widthPct =
                  team.averageScore > 0
                    ? Math.max(4, Math.min(100, Math.round((team.averageScore / maxAvgScore) * 100)))
                    : 0;
                return (
                  <div
                    key={team.id}
                    className="rounded-md border border-border bg-surface p-3"
                  >
                    <div className="flex justify-between gap-3 text-sm font-medium">
                      <span>{team.teamName}</span>
                      <span className="font-mono text-foreground">
                        เฉลี่ย {formatScore(team.averageScore)} • รวม{" "}
                        {team.rawScore}
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-panel">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-success" />
            <h2 className="font-semibold">อันดับ</h2>
          </div>
          <TeamStandings teams={snapshot.rankedTeams} />
        </Panel></div>}
      ]}/>
    </>
  );
}
