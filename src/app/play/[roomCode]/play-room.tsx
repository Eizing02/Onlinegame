"use client";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { AudioControl } from "@/components/audio/audio-control";
import { useAppAudio, useBackgroundMusic } from "@/components/audio/audio-provider";
import { RevealMoment } from "@/components/game/reveal-moment";
import { TeamStandings } from "@/components/game/team-standings";
import { GameRules } from "@/components/game/game-rules";
import { fetchRoom, newestSnapshot } from "@/lib/game/client-response";

import {
  CheckCircle2,
  Clock,
  LogOut,
  Lock,
  Pencil,
  Maximize2,
  PartyPopper,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";
import { Scene3D } from "@/components/game/scene-3d";
import { Modal } from "@/components/ui/modal";
import { useCallback, useEffect, useRef, useState } from "react";

import { MathText } from "@/components/ui/math-text";
import { RoomTabs } from "@/components/game/room-tabs";
import { QuestionImage } from "@/components/ui/question-image";
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

const AUDIO_ASSETS = {
  background: "/assets/audio/bg-sci-fi.wav",
  answer: "/assets/audio/answer-sci-fi.wav",
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

function getStudentPollInterval(status: StudentPlaySnapshot["status"]) {
  return status === "ended" ? 10000 : 3000;
}


export function PlayRoom({
  initialSnapshot,
  initialNow,
  authSessionId,
}: {
  initialSnapshot: StudentPlaySnapshot;
  initialNow: number;
  authSessionId: string;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [answerDraft, setAnswerDraft] = useState({
    questionIndex: initialSnapshot.currentQuestionIndex,
    selectedOptionId: "",
    text: "",
  });
  const [teamName, setTeamName] = useState(initialSnapshot.team.teamName);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTeamUpdating, setIsTeamUpdating] = useState(false);
  const { engine: audioEngine } = useAppAudio();
  useBackgroundMusic(snapshot.status === "ended" ? null : AUDIO_ASSETS.background);
  const [isPowerPending, setIsPowerPending] = useState(false);
  const [isCaptainNoticeOpen, setIsCaptainNoticeOpen] = useState(false);
  const [closedResultSessionId, setClosedResultSessionId] = useState<
    string | null
  >(null);
  const [questionExpanded, setQuestionExpanded] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(initialNow);
  const answerText =
    answerDraft.questionIndex === snapshot.currentQuestionIndex
      ? answerDraft.text
      : "";
  const selectedOptionId =
    answerDraft.questionIndex === snapshot.currentQuestionIndex
      ? answerDraft.selectedOptionId
      : "";
  const refreshTimerRef = useRef<number | null>(null);
  const revealedAnswerKeyRef = useRef<string | null>(initialSnapshot.status === "showing_answer" && initialSnapshot.currentAnswer ? `${initialSnapshot.sessionId}:${initialSnapshot.currentQuestionIndex}:${initialSnapshot.currentAnswer.id}:${initialSnapshot.currentAnswer.isCorrect}` : null);
  const teamNameSnapshotRef = useRef(initialSnapshot.team.teamName);
  const pollIntervalMs = getStudentPollInterval(snapshot.status);
  const remainingSeconds = getRemainingSeconds({
    endsAt: snapshot.currentQuestionEndsAt,
    nowMs,
    startedAt: snapshot.currentQuestionStartedAt,
    timeLimitSeconds: snapshot.currentQuestion?.timeLimitSeconds,
  });
  const isTimerExpired =
    snapshot.status === "question_active" &&
    remainingSeconds !== null &&
    remainingSeconds <= 0;
  const isChoiceQuestion =
    snapshot.currentQuestion !== null &&
    snapshot.currentQuestion.questionType !== "short_text";
  const canSubmit =
    snapshot.canSubmitAnswer &&
    !isTimerExpired &&
    (isChoiceQuestion
      ? selectedOptionId.length > 0
      : answerText.trim().length > 0) &&
    !isSubmitting && !isPowerPending;
  const showCorrectAnswer =
    snapshot.status === "showing_answer" || snapshot.status === "ended";
  const ownRank = snapshot.rankedTeams.find(
    (team) => team.id === snapshot.team.id,
  );
  const isResultOpen =
    snapshot.status === "ended" && closedResultSessionId !== snapshot.sessionId;
  const playApiUrl = `/api/play/${encodeURIComponent(snapshot.roomCode)}`;
  const applySnapshot = useCallback((nextSnapshot: StudentPlaySnapshot) => {
    setSnapshot(previous => newestSnapshot(previous, nextSnapshot));
    setNowMs(Date.now());
  }, []);
  const playAnswerAudio = useCallback((durationMs = 2400) => audioEngine.playEffect(AUDIO_ASSETS.answer, durationMs), [audioEngine]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const currentAnswer = snapshot.currentAnswer;

    if (
      snapshot.status !== "showing_answer" ||
      !snapshot.isAnswerRevealed ||
      !currentAnswer
    ) {
      return;
    }

    const revealedAnswerKey = `${snapshot.sessionId}:${snapshot.currentQuestionIndex}:${currentAnswer.id}:${currentAnswer.isCorrect}`;

    if (revealedAnswerKeyRef.current === revealedAnswerKey) {
      return;
    }

    revealedAnswerKeyRef.current = revealedAnswerKey;

    if (currentAnswer.isCorrect) playAnswerAudio(2800);

  }, [
    playAnswerAudio,
    snapshot.currentAnswer,
    snapshot.currentQuestionIndex,
    snapshot.isAnswerRevealed,
    snapshot.sessionId,
    snapshot.status,
  ]);

  useEffect(() => {
    if (teamNameSnapshotRef.current !== snapshot.team.teamName) {
      teamNameSnapshotRef.current = snapshot.team.teamName;
      setTeamName(snapshot.team.teamName);
    }
  }, [snapshot.team.teamName]);

  useEffect(() => {
    if (!snapshot.isTeamCaptain || !snapshot.canRenameTeam) {
      return;
    }

    const storageKey = `captain-notice:${snapshot.sessionId}:${snapshot.team.id}`;
    let shouldOpenNotice = false;

    try {
      if (window.localStorage.getItem(storageKey)) {
        return;
      }

      window.localStorage.setItem(storageKey, "seen");
      shouldOpenNotice = true;
    } catch {
      shouldOpenNotice = true;
    }

    if (!shouldOpenNotice) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsCaptainNoticeOpen(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [
    snapshot.canRenameTeam,
    snapshot.isTeamCaptain,
    snapshot.sessionId,
    snapshot.team.id,
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadSnapshot() {
      if (document.hidden) return;
      try {
        const response = await fetchRoom(playApiUrl, { cache: "no-store", headers: { "x-client-session": authSessionId } });

        if (!response.ok) {
          return;
        }

        const nextSnapshot = (await response.json()) as StudentPlaySnapshot;

        if (isActive) {
          applySnapshot(nextSnapshot);
        }
      } catch {
        if (isActive) {
          setMessage("กำลังรอเชื่อมต่อห้องอีกครั้ง");
        }
      }
    }

    const intervalId = window.setInterval(loadSnapshot, pollIntervalMs);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [applySnapshot, playApiUrl, pollIntervalMs, authSessionId]);

  const requestRealtimeRefresh = useCallback(() => {
    if (document.hidden) return;
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(async () => {
      refreshTimerRef.current = null;

      try {
        const response = await fetchRoom(playApiUrl, { cache: "no-store", headers: { "x-client-session": authSessionId } });

        if (!response.ok) {
          return;
        }

        const nextSnapshot = (await response.json()) as StudentPlaySnapshot;
        applySnapshot(nextSnapshot);
      } catch {
        setMessage("รอเชื่อมต่อห้องอีกครั้ง");
      }
    }, 80);
  }, [applySnapshot, playApiUrl, authSessionId]);

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

    playAnswerAudio(1800);

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetchRoom(
        playApiUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-client-session": authSessionId },
          body: JSON.stringify(
            { ...(isChoiceQuestion ? { selectedOptionId } : { answerText }), expectedQuestionId: snapshot.currentQuestion?.id, expectedSessionId: snapshot.sessionId },
          ),
        },
      );
      const data = (await response.json()) as StudentPlaySnapshot | {
        error?: string;
      };

      if (!response.ok) {
        setMessage("error" in data && data.error ? data.error : "ส่งคำตอบไม่ได้");
        return;
      }

      applySnapshot(data as StudentPlaySnapshot);
      setAnswerDraft({
        questionIndex: (data as StudentPlaySnapshot).currentQuestionIndex,
        selectedOptionId: "",
        text: "",
      });
      setMessage("ส่งคำตอบแล้ว");
    } catch {
      setMessage("เชื่อมต่อการส่งคำตอบไม่ได้ ลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function activatePower() {
    if (!snapshot.teamPower.canActivate || isPowerPending || isSubmitting) return;
    setIsPowerPending(true); setMessage(null);
    try {
      const response = await fetchRoom(playApiUrl, { method: "POST", headers: {"Content-Type":"application/json","x-client-session":authSessionId}, body:JSON.stringify({action:"boost",expectedSessionId:snapshot.sessionId,expectedQuestionId:snapshot.currentQuestion?.id}) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "ใช้พลังไม่ได้"); return; }
      applySnapshot(data); setMessage("เปิดพลังทีมแล้ว ข้อนี้คะแนนเพิ่ม 50%");
    } catch { setMessage("เชื่อมต่อไม่ได้ ลองตรวจสถานะพลังอีกครั้ง"); }
    finally { setIsPowerPending(false); }
  }

  async function renameTeam() {
    if (!snapshot.canRenameTeam || isTeamUpdating) {
      return;
    }

    setIsTeamUpdating(true);
    setMessage(null);

    try {
      const response = await fetchRoom(playApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-session": authSessionId },
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

      applySnapshot(data as StudentPlaySnapshot);
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
      const response = await fetchRoom(playApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-session": authSessionId },
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

      applySnapshot(data as StudentPlaySnapshot);
    } catch {
      setMessage("เชื่อมต่อการออกจากทีมไม่ได้ ลองอีกครั้ง");
    } finally {
      setIsTeamUpdating(false);
    }
  }

  return (
    <>
      {(isSubmitting||isTeamUpdating||isPowerPending)&&<LoadingIndicator overlay label="กำลังบันทึก…"/>}
      <RevealMoment eventKey={snapshot.status === "showing_answer" ? snapshot.sessionId + ":" + snapshot.currentQuestionIndex : null} correct={Boolean(snapshot.currentAnswer?.isCorrect)} title={snapshot.currentAnswer?.isCorrect ? "ตอบถูก!" : "เฉลยแล้ว ลุยข้อต่อไป"} detail={snapshot.currentAnswer?.isCorrect && snapshot.contribution ? "คำตอบนี้ช่วยทีม +" + formatScore(snapshot.contribution.total) + " คะแนน" : "ดูคำตอบที่ถูก แล้วเตรียมพร้อมไปด้วยกัน"} />
      <RoomTabs defaultIndex={snapshot.status === 'ended' ? 2 : 0} resetKey={snapshot.sessionId + ':' + snapshot.currentQuestionIndex + ':' + (snapshot.status === 'lobby' ? 'lobby' : snapshot.status === 'ended' ? 'ended' : 'game')} header={<>
        <div className="room-identity"><h1>{snapshot.team.teamName}</h1><p>ห้อง {snapshot.roomCode} · {snapshot.activityName || snapshot.questionSetTitle}</p></div>
        <div className="room-live-status">{snapshot.currentQuestion && <span>ข้อ {snapshot.currentQuestion.questionNumber}/{snapshot.currentQuestion.totalQuestions} · {snapshot.currentQuestion.points} คะแนน</span>}{remainingSeconds !== null && snapshot.status === 'question_active' && <strong className={remainingSeconds <= 10 ? 'text-warning' : 'text-cyan'}><Clock size={16} />{formatRemainingTime(remainingSeconds)}</strong>}</div>
        <AudioControl />
      </>} tabs={[
        {label:'เล่น', content:<div className="student-play-screen">
          <div className="question-toolbar"><h2>{statusLabel[snapshot.status]}</h2>{snapshot.currentQuestion && <button type="button" onClick={()=>setQuestionExpanded(snapshot.currentQuestion!.id)}><Maximize2 size={16}/>ขยายโจทย์</button>}</div>
          {snapshot.currentQuestion?.roundMultiplier === 1.5 && <p className="final-round-banner">รอบสุดท้าย ×1.5 {snapshot.teamPower.active ? '· รวมพลังทีม ×2.25' : ''}</p>}
                  {message && message !== "ส่งคำตอบแล้ว" && (message !== "เปิดพลังทีมแล้ว ข้อนี้คะแนนเพิ่ม 50%" || snapshot.teamPower.active) ? (
          <div
            role="status"
            className={
              message.includes("ไม่ได้") || message.includes("ไม่")
                ? "rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
                : "rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-medium text-success"
            }
          >
            {message}
          </div>
        ) : null}

          {snapshot.currentQuestion ? <div className="student-arena question-surface" key={snapshot.currentQuestion.id}>
            <div className="question-reading" tabIndex={0} role="region" aria-label="โจทย์และรูปประกอบ">
              <MathText text={snapshot.currentQuestion.questionText}/>
              {snapshot.currentQuestion.imageUrl && <QuestionImage className="room-question-image" src={snapshot.currentQuestion.imageUrl} alt={'รูปประกอบคำถามข้อ ' + snapshot.currentQuestion.questionNumber}/>}
                            {showCorrectAnswer && snapshot.currentQuestion.correctAnswer ? (
                <div className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                  เฉลย:{" "}
                  <MathText
                    className="inline"
                    inline
                    text={snapshot.currentQuestion.correctAnswer}
                  />
                </div>
              ) : null}

              {isTimerExpired && <p className="text-warning">หมดเวลาตอบคำถามข้อนี้แล้ว</p>}
            </div>
            <div className="answer-zone">
              <div className="answer-options">              {snapshot.currentQuestion.options.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {snapshot.currentQuestion.options.map((option, optionIndex) => {
                    const isSelected =
                      snapshot.currentAnswer?.selectedOptionId === option.id ||
                      selectedOptionId === option.id;
                    const isCorrectOption = showCorrectAnswer && option.isCorrect;
                    const isWrongSelection =
                      showCorrectAnswer && isSelected && option.isCorrect === false;

                    return (
                      <button
                        className={
                          isCorrectOption
                            ? "min-h-14 rounded-md border border-success bg-success/10 px-4 py-3 text-left font-semibold text-success shadow-sm"
                            : isWrongSelection
                              ? "min-h-14 rounded-md border border-danger bg-danger/10 px-4 py-3 text-left font-semibold text-danger shadow-sm"
                              : isSelected
                                ? "min-h-14 rounded-md border border-primary bg-primary/10 px-4 py-3 text-left font-semibold text-primary shadow-sm"
                                : "min-h-14 rounded-md border border-border bg-surface px-4 py-3 text-left font-semibold transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
                        }
                        disabled={
                          !snapshot.canSubmitAnswer ||
                          isTimerExpired ||
                          Boolean(snapshot.currentAnswer)
                        }
                        key={option.id}
                        onClick={() =>
                          setAnswerDraft({
                            questionIndex: snapshot.currentQuestionIndex,
                            selectedOptionId: option.id,
                            text: "",
                          })
                        }
                        type="button"
                      >
                        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded bg-white/80 text-sm text-muted">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <MathText className="inline" inline text={option.optionText} />
                      </button>
                    );
                  })}
                </div>
              ) : null}
</div>
                            {snapshot.currentAnswer ? (
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {!snapshot.isAnswerRevealed ? (
                      <Lock className="text-cyan" size={18} />
                    ) : snapshot.currentAnswer.isCorrect ? (
                      <CheckCircle2 className="text-success" size={18} />
                    ) : (
                      <XCircle className="text-danger" size={18} />
                    )}
                    {snapshot.isAnswerRevealed
                      ? snapshot.currentAnswer.isCorrect
                        ? "ตอบถูก"
                        : "ยังไม่ถูก"
                      : "ส่งคำตอบแล้ว รอครูเฉลย"}
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    คำตอบของคุณ:{" "}
                    <MathText
                      className="inline"
                      inline
                      text={snapshot.currentAnswer.answerText}
                    />
                  </p>
                  {showCorrectAnswer ? (
                    <p className="mt-1 text-sm text-muted">
                      คะแนนที่ได้: {snapshot.currentAnswer.scoreAwarded}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="answer-entry">
                  {!isChoiceQuestion ? (
                    <textarea
                      aria-label="คำตอบของคุณ"
                      rows={2}
                      maxLength={2000}
                      className="student-answer-input w-full rounded-md border border-border bg-surface p-3 outline-none focus:border-primary disabled:bg-surface"
                      disabled={!snapshot.canSubmitAnswer || isTimerExpired}
                      onChange={(event) =>
                        setAnswerDraft({
                          questionIndex: snapshot.currentQuestionIndex,
                          selectedOptionId: "",
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
                  ) : null}
                  <button
                    className="answer-submit inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-muted"
                    disabled={!canSubmit}
                    onClick={() => void submitAnswer()}
                    type="button"
                  >
                    <Send size={18} />
                    {isSubmitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
                  </button>
                </div>
              )}
                      {snapshot.contribution && <div className="contribution-result" role="status"><strong>คำตอบนี้ช่วยทีม +{formatScore(snapshot.contribution.total)} คะแนน</strong><p>คะแนนคำตอบเฉลี่ย {formatScore(snapshot.contribution.base)}{snapshot.contribution.bonus > 0 ? " + พลังทีม " + formatScore(snapshot.contribution.bonus) : ""}{!snapshot.participant.isScoreEligible ? " · เข้าหลังเริ่ม จึงไม่ร่วมคะแนน" : ""}</p></div>}
            </div>
          </div> : <div className="room-lobby"><Scene3D variant="planet"/><h2>พร้อมออกเดินทาง</h2><p>คุณเข้าห้องแล้วในชื่อ {snapshot.participant.displayName}</p><p>เมื่อครูเริ่มเกม คำถามจะแสดงตรงนี้</p><p className="text-muted">ดูสมาชิกและกติกาได้ที่เมนูทีม</p></div>}
          {snapshot.rulesVersion === 2 && snapshot.status !== 'ended' && <div className="play-power">
            <span>{snapshot.teamPower.active ? 'พลังทีมทำงาน · คะแนน ×1.5' : snapshot.teamPower.available ? 'พลังทีม +50% · ใช้ได้ 1 ข้อ' : 'ใช้พลังทีมไปแล้ว'}</span>
            {snapshot.teamPower.available && snapshot.isTeamCaptain && <button type="button" className="power-button" disabled={!snapshot.teamPower.canActivate || isPowerPending || isSubmitting} onClick={()=>void activatePower()}>{isPowerPending ? 'กำลังเปิดพลัง…' : 'ใช้พลังทีม +50%'}</button>}
          </div>}
          {!snapshot.participant.isScoreEligible && <p className="room-eligibility text-warning">เข้าหลังเริ่ม · ร่วมตอบได้แต่ไม่นับคะแนน</p>}
        </div>},
        {label:'ทีม',content:<div className="room-scroll team-details">
          <h2>ทีมของเรา</h2>          <div className="w-full rounded-md border border-border bg-success/10 p-3 sm:max-w-sm">
            {snapshot.canRenameTeam ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">
                  {snapshot.team.teamName}
                </p>
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
          <h3>สมาชิกในทีม</h3><ul className="team-member-list">{snapshot.teamMembers.map(member=><li key={member.id}><span>{member.displayName}{member.isCaptain ? ' · หัวหน้าทีม' : ''}</span><small>{member.isScoreEligible ? 'ร่วมคะแนน' : 'ร่วมเล่น ไม่นับคะแนน'}</small></li>)}</ul>
          <GameRules version={snapshot.rulesVersion}/>        {snapshot.rulesVersion === 2 && snapshot.status !== "ended" && <div className={"team-power " + (snapshot.teamPower.active ? "team-power-active" : "")}>
          <div><strong>{snapshot.teamPower.active ? "พลังทีมทำงาน · คะแนน ×1.5" : snapshot.teamPower.available ? "พลังทีม +50%" : "ใช้พลังทีมไปแล้ว"}</strong>
          <p>{snapshot.teamPower.active ? "ทุกคำตอบที่ถูกของทีมในข้อนี้ได้คะแนนเพิ่ม" : snapshot.teamPower.available ? (snapshot.status === "lobby" ? "ใช้ได้ 1 ข้อ หัวหน้าทีมกดหลังเริ่ม ก่อนคำตอบแรกของทีม" : !snapshot.teamPower.canActivate && snapshot.isTeamCaptain ? "ข้อนี้ใช้ไม่ได้แล้ว ต้องใช้ก่อนคำตอบแรกของทีมและก่อนหมดเวลา" : "ใช้ได้ 1 ข้อ หัวหน้าทีมกดก่อนคำตอบแรกของทีม") : "ใช้ในข้อ " + ((snapshot.teamPower.usedQuestionIndex ?? 0) + 1)}</p></div>
          {snapshot.teamPower.available && snapshot.isTeamCaptain && <button type="button" className="power-button" onClick={() => void activatePower()} disabled={!snapshot.teamPower.canActivate || isPowerPending || isSubmitting}>{isPowerPending ? "กำลังเปิดพลัง…" : "ใช้พลังทีม +50%"}</button>}
        </div>}
                  <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-sm text-muted">สถานะผู้เล่น</p>
            <p className="mt-1 font-semibold text-success">
              {snapshot.participant.isScoreEligible
                ? "ร่วมคะแนน"
                : "ร่วมเล่น ไม่นับคะแนน"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-sm text-muted">คะแนนเฉลี่ยทีม</p>
            <p className="mt-1 font-semibold">
              {formatScore(snapshot.teamScore.averageScore)} คะแนน
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-sm text-muted">ตอบแล้ว</p>
            <p className="mt-1 font-semibold">
              {snapshot.answerProgress.answeredCount}/
              {snapshot.answerProgress.totalParticipantCount} คน
            </p>
          </div>
        </div>
        </div>},
        {label:'อันดับ',content:<div className="room-scroll"><h2>{snapshot.status === 'ended' ? 'สรุปอันดับ' : 'อันดับทีมล่าสุด'}</h2><p className="text-muted">{snapshot.isAnswerRevealed ? 'รวมคะแนนข้อนี้แล้ว' : 'รอเฉลยเพื่อเปิดคะแนนข้อนี้'}</p><TeamStandings teams={snapshot.rankedTeams}/>
          <details className="score-details"><summary>ดูคะแนนรวมและตัวหารแต่ละทีม</summary>{snapshot.rankedTeams.map(team=><p key={team.id}>{team.teamName} · เฉลี่ย {formatScore(team.averageScore)} · รวม {team.rawScore} · ตัวหาร {team.lockedMemberCount}</p>)}</details>
          {snapshot.status === 'ended' && <a className="room-return" href="/join">กลับหน้าเข้าห้อง</a>}
        </div>}
      ]}/>
      {questionExpanded === snapshot.currentQuestion?.id && snapshot.currentQuestion && <Modal title="โจทย์เต็ม" onClose={()=>setQuestionExpanded(null)}><div className="expanded-question"><h2>ข้อ {snapshot.currentQuestion.questionNumber}/{snapshot.currentQuestion.totalQuestions}</h2><MathText text={snapshot.currentQuestion.questionText}/>{snapshot.currentQuestion.imageUrl && <QuestionImage src={snapshot.currentQuestion.imageUrl} alt="รูปประกอบคำถาม"/>}              {showCorrectAnswer && snapshot.currentQuestion.correctAnswer ? (
                <div className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                  เฉลย:{" "}
                  <MathText
                    className="inline"
                    inline
                    text={snapshot.currentQuestion.correctAnswer}
                  />
                </div>
              ) : null}
</div></Modal>}

      {isCaptainNoticeOpen ? (
        <div className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-cyan/35 bg-panel p-4 text-center shadow-sm">
          <div className="flex items-start gap-3 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-warning/40 bg-warning/15 text-warning">
              <Trophy size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">หัวหน้ากลุ่ม</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                คุณเป็นหัวหน้าทีม เปลี่ยนชื่อได้ที่เมนูทีมก่อนครูเริ่มเกม และใช้พลังได้ที่หน้าเล่น
              </p>
              <button
                className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-cyan/40 bg-cyan/10 px-3 text-sm font-semibold text-cyan transition hover:border-cyan hover:bg-cyan/20"
                onClick={() => setIsCaptainNoticeOpen(false)}
                type="button"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {snapshot.status === "ended" && isResultOpen ? (
        <Modal title="ผลการแข่งขัน" onClose={() => setClosedResultSessionId(snapshot.sessionId)}>
          <div className="result-summary relative w-full max-w-md text-center">
            <p className="text-sm font-semibold text-cyan">จบเกมแล้ว</p>
            <div className="mt-4">
              <Scene3D variant="trophy" />
            </div>
            <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <PartyPopper size={24} />
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
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
            <a
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-cyan/40 bg-cyan/10 px-4 text-sm font-semibold text-cyan transition hover:bg-cyan/15"
              href="/join"
            >
              กลับหน้าเข้าห้อง
            </a>
          </div>
        </Modal>
      ) : null}

    </>
  );
}
