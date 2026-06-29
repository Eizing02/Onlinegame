"use client";

import {
  BarChart3,
  ClipboardList,
  Clock,
  Eye,
  FastForward,
  Lock,
  Play,
  Square,
  Trophy,
  UsersRound,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";
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
  lobby: "border-amber-200 bg-amber-50 text-amber-700",
  playing: "border-cyan/40 bg-cyan/10 text-cyan",
  question_active: "border-cyan/40 bg-cyan/10 text-cyan",
  answer_locked: "border-amber-200 bg-amber-50 text-amber-700",
  showing_answer: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ended: "border-red-200 bg-red-50 text-red-700",
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
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary/50 bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:border-cyan/60 hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          : variant === "danger"
            ? "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
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
  teacherAccessToken,
}: {
  initialSnapshot: TeacherDashboardSnapshot;
  teacherAccessToken: string;
}) {
  const roomCode = initialSnapshot.roomCode;
  const dashboardApiUrl = `/api/teacher/rooms/${encodeURIComponent(
    roomCode,
  )}/dashboard?teacher_access_token=${encodeURIComponent(
    teacherAccessToken,
  )}`;
  const controlApiUrl = `/api/teacher/rooms/${encodeURIComponent(
    roomCode,
  )}/control`;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [syncLabel, setSyncLabel] = useState("กำลังเชื่อมต่อข้อมูลห้อง...");
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const [pendingCommand, setPendingCommand] = useState<TeacherCommand | null>(
    null,
  );
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const refreshTimerRef = useRef<number | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
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
      try {
        const response = await fetch(dashboardApiUrl, { cache: "no-store" });

        if (!response.ok) {
          if (isActive) {
            setSyncLabel("อัปเดตข้อมูลห้องไม่ได้");
          }
          return;
        }

        const nextSnapshot =
          (await response.json()) as TeacherDashboardSnapshot;

        if (isActive) {
          setSnapshot(nextSnapshot);
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
  }, [dashboardApiUrl, pollIntervalMs]);

  const requestRealtimeRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(async () => {
      refreshTimerRef.current = null;

      try {
        const response = await fetch(dashboardApiUrl, { cache: "no-store" });

        if (!response.ok) {
          setSyncLabel("อัปเดตห้องไม่ได้");
          return;
        }

        const nextSnapshot =
          (await response.json()) as TeacherDashboardSnapshot;

        setSnapshot(nextSnapshot);
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
  }, [dashboardApiUrl]);

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

  function toggleSound() {
    const backgroundAudio = backgroundAudioRef.current;

    if (isSoundEnabled) {
      backgroundAudio?.pause();
      setIsSoundEnabled(false);
      return;
    }

    setIsSoundEnabled(true);

    if (backgroundAudio) {
      backgroundAudio.volume = 0.14;
      backgroundAudio.loop = true;
      void backgroundAudio.play().catch(() => {
        setIsSoundEnabled(false);
      });
    }
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isSoundEnabled) {
      return;
    }

    const backgroundAudio = backgroundAudioRef.current;

    if (!backgroundAudio) {
      return;
    }

    backgroundAudio.volume = 0.14;
    backgroundAudio.loop = true;
    void backgroundAudio.play().catch(() => {
      setIsSoundEnabled(false);
    });
  }, [isSoundEnabled]);

  useEffect(() => {
    const backgroundAudio = backgroundAudioRef.current;

    return () => {
      backgroundAudio?.pause();
    };
  }, []);

  async function runCommand(command: TeacherCommand) {
    setPendingCommand(command);
    setControlMessage(null);

    try {
      const response = await fetch(controlApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-teacher-access-token": teacherAccessToken,
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

      setSnapshot(data as TeacherDashboardSnapshot);
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
      <audio ref={backgroundAudioRef} preload="auto" src={AUDIO_ASSETS.background} />
      <div className="grid gap-5 xl:grid-cols-[280px_1fr_320px]">
      <Panel className="space-y-5">
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
            <h2 className="text-sm font-semibold">นักเรียนในห้อง</h2>
            <span className="text-xs text-muted">{syncLabel}</span>
          </div>
          {visibleParticipants.length > 0 ? (
            visibleParticipants.map((participant) => (
              <div
                className="flex items-start gap-3 text-sm"
                key={participant.id}
              >
                <span className="mt-1 h-8 w-8 shrink-0 rounded-full bg-blue-50" />
                <span>
                  <span>{participant.displayName}</span>
                  <span className="ml-2 text-muted">
                    {participant.teamId
                      ? teamNameById.get(participant.teamId)
                      : "ยังไม่เลือกทีม"}
                  </span>
                  {participant.joinedAfterStart ? (
                    <span className="block text-xs text-amber-700">
                      เข้าหลังเริ่มเกม ไม่นับคะแนน
                    </span>
                  ) : null}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-border bg-surface p-3 text-sm text-muted">
              ยังไม่มีนักเรียนเข้าห้อง
            </p>
          )}
        </div>
      </Panel>

      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">สถานะห้อง</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {statusLabel[snapshot.status]}
            </h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              aria-label={isSoundEnabled ? "ปิดเสียงเพลง" : "เปิดเสียงเพลง"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-cyan/40 bg-cyan/10 px-3 text-sm font-semibold text-cyan transition hover:border-cyan hover:bg-cyan/20"
              onClick={toggleSound}
              title={isSoundEnabled ? "ปิดเสียงเพลง" : "เปิดเสียงเพลง"}
              type="button"
            >
              {isSoundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              <span className="hidden sm:inline">
                {isSoundEnabled ? "ปิดเสียง" : "เปิดเสียง"}
              </span>
            </button>
            <span
              className={`inline-flex h-11 items-center rounded-md border px-3 text-sm font-semibold ${statusBadgeClassName[snapshot.status]}`}
            >
              {snapshot.status.toUpperCase()}
            </span>
          </div>
        </div>

        {snapshot.status === "lobby" ? (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
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

        {controlMessage ? (
          <div
            className={
              controlMessage.includes("ไม่") || controlMessage.includes("ไม่ได้")
                ? "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                : "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
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

        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
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

          <div className="mt-5 rounded-md border border-cyan/25 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted">คำถามปัจจุบัน</p>
              {showQuestionTimer ? (
                <span
                  className={
                    remainingSeconds <= 10
                      ? "inline-flex h-11 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
                      : "inline-flex h-11 items-center gap-2 rounded-md border border-cyan/40 bg-cyan/10 px-3 text-sm font-semibold text-cyan"
                  }
                >
                  <Clock size={17} />
                  {formatRemainingTime(remainingSeconds)}
                </span>
              ) : null}
            </div>
            {snapshot.currentQuestion ? (
              <>
                <h3 className="mt-2 text-lg font-semibold leading-7">
                  ข้อ {snapshot.currentQuestion.questionNumber}/
                  {snapshot.currentQuestion.totalQuestions}:{" "}
                  {snapshot.currentQuestion.questionText}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {snapshot.currentQuestion.points} คะแนน •{" "}
                  {snapshot.currentQuestion.timeLimitSeconds} วินาที
                </p>
                {snapshot.currentQuestion.correctAnswer ? (
                  <p className="mt-2 text-sm font-semibold text-emerald-700">
                    เฉลย: {snapshot.currentQuestion.correctAnswer}
                  </p>
                ) : null}
              </>
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ControlButton
              command="start"
              disabled={snapshot.status !== "lobby" || !snapshot.canStart}
              icon={Play}
              label="เริ่มเกม"
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
              variant="primary"
            />
            <ControlButton
              command="lock"
              disabled={!isQuestionActive}
              icon={Lock}
              label="ล็อกคำตอบ"
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
            />
            <ControlButton
              command="reveal"
              disabled={!canReveal}
              icon={Eye}
              label="เฉลย"
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
            />
            <ControlButton
              command="next"
              disabled={!canGoNext}
              icon={isLastQuestion ? Square : FastForward}
              label={isLastQuestion ? "จบเกม" : "ข้อถัดไป"}
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
            />
            <ControlButton
              command="end"
              disabled={snapshot.status === "ended"}
              icon={Square}
              label="จบเกมทันที"
              pendingCommand={pendingCommand}
              runCommand={(command) => void runCommand(command)}
              variant="danger"
            />
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <UsersRound size={20} className="text-primary" />
            <h2 className="font-semibold">รายชื่อกลุ่ม</h2>
          </div>
          <div className="space-y-3">
            {showAnswerStatus ? (
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  ตอบแล้ว
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">
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
                    ตัวหารคะแนนเฉลี่ย {team.lockedMemberCount} คน
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
                                  ? "inline-flex w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700"
                                  : "inline-flex w-full items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700"
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
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-amber-600" />
            <h2 className="font-semibold">คะแนนแต่ละกลุ่ม</h2>
          </div>
          <div className="space-y-3">
            {snapshot.teamSummaries.map((team) => (
              <div
                key={team.id}
                className="rounded-md border border-border bg-surface p-3"
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span>{team.teamName}</span>
                  <span>
                    เฉลี่ย {formatScore(team.averageScore)} • รวม{" "}
                    {team.rawScore}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${Math.min(team.averageScore * 10, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-emerald-700" />
            <h2 className="font-semibold">อันดับ</h2>
          </div>
          <div className="space-y-3">
            {snapshot.rankedTeams.map((team) => (
              <div
                className="rounded-md border border-border bg-surface p-3 text-sm"
                key={team.id}
              >
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{team.teamName}</span>
                  <span className="text-muted">
                    {team.rank
                      ? team.isTied
                        ? `อันดับร่วม ${team.rank}`
                        : `อันดับ ${team.rank}`
                      : "ยังไม่จัดอันดับ"}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  เฉลี่ย {formatScore(team.averageScore)} จากสมาชิกที่ล็อก{" "}
                  {team.lockedMemberCount} คน
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      </div>
    </>
  );
}
