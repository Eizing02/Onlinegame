"use client";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { AudioControl } from "@/components/audio/audio-control";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ShieldAlert, Timer, X } from "lucide-react";
import { MathText } from "@/components/ui/math-text";
import { QuestionImage } from "@/components/ui/question-image";
import type { BossType } from "../assets/boss-definitions";
import type { RaidHero, RaidQuestion } from "../types";
import { BossIdentity } from "./BossIdentity";
import { RaidStudentHud } from "./RaidStudentHud";
import { CHOICE_LABELS } from "@/lib/game/choice-labels";
import { useRaidClock } from "../hooks/use-raid-clock";

export type QuestionState = "open" | "resolving" | "presenting" | "error" | "expired";
const LETTERS = CHOICE_LABELS;

export function RaidQuestionModal({
  question,
  total,
  state,
  warnings,
  visibilityEnabled,
  feedback,
  error,
  onSubmit,
  onRetry,
  deadline,
  serverNow,
  score,
  heroes = [],
  ownId,
  partyOpen = false,
  onPartyToggle = () => {},
  bossType,
  bossHp,
  bossMaxHp,
  autoConfirm = true,
  syncing = false,
}: {
  question: RaidQuestion;
  total: number;
  state: QuestionState;
  warnings: number;
  visibilityEnabled: boolean;
  feedback: string;
  error: string;
  onSubmit: (answerText: string | null, selectedOptionId: string | null) => void;
  onRetry: () => void;
  deadline: string | null;
  serverNow: string;
  score: number;
  heroes?: RaidHero[];
  ownId?: string;
  partyOpen?: boolean;
  onPartyToggle?: () => void;
  bossType?: BossType;
  bossHp?: number;
  bossMaxHp?: number;
  autoConfirm?: boolean;
  syncing?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const draft = useRef({ answer: "", option: "", sent: false, end: 0 });
  const [answer, setAnswer] = useState("");
  const [option, setOption] = useState("");
  const [confirmation, setConfirmation] = useState<{ end: number } | null>(null);
  const [left, setLeft] = useState(5000);
  const { seconds, remaining } = useRaidClock(deadline, serverNow);
  const canEdit = state === "open" && (!deadline || seconds > 0);
  const valid =
    question.questionType === "short_text" ? Boolean(answer.trim()) : Boolean(option);
  const submitRef = useRef(onSubmit);
  const editable = useRef(canEdit);

  useEffect(() => {
    submitRef.current = onSubmit;
    editable.current = canEdit;
  }, [onSubmit, canEdit]);

  const send = useCallback(() => {
    const d = draft.current;
    if (d.sent || !editable.current || (deadline && remaining() <= 0)) return;
    if (question.questionType === "short_text" ? !d.answer.trim() : !d.option) return;
    d.sent = true;
    setConfirmation(null);
    submitRef.current(
      question.questionType === "short_text" ? d.answer.trim() : null,
      question.questionType === "short_text" ? null : d.option,
    );
  }, [deadline, remaining, question.questionType]);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    const element = dialog.current;
    const viewport = window.visualViewport;
    let frame = 0;
    const sync = () => {
      if (!element || (viewport && viewport.scale > 1.05)) return;
      element.style.setProperty("--raid-dialog-height", `${viewport?.height ?? innerHeight}px`);
      element.style.setProperty("--raid-dialog-top", `${viewport?.offsetTop ?? 0}px`);
    };
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    sync();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!confirmation || !canEdit || !autoConfirm) return;
    const update = () => {
      if (document.hidden || draft.current.end !== confirmation.end) return;
      const ms = Math.max(0, confirmation.end - performance.now());
      setLeft(ms);
      if (ms === 0) send();
    };
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, [confirmation, canEdit, send, autoConfirm]);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        draft.current.end = 0;
        setConfirmation(null);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  const begin = useCallback(() => {
    setLeft(5000);
    const end = autoConfirm ? performance.now() + 5000 : Infinity;
    draft.current.end = end;
    setConfirmation({ end });
  }, [autoConfirm]);

  const clear = () => {
    draft.current.option = "";
    draft.current.end = 0;
    setOption("");
    setConfirmation(null);
  };

  const letter = LETTERS[question.options.findIndex((o) => o.id === option)] ?? "";
  const showBossBar = typeof bossHp === "number" && typeof bossMaxHp === "number" && bossMaxHp > 0;
  const bossPct = showBossBar ? Math.max(0, Math.round((bossHp / bossMaxHp) * 100)) : 0;

  return (
    <dialog
      ref={dialog}
      className="raid-question-dialog"
      data-state={state}
      aria-labelledby="raid-question-title"
      onCancel={(e) => {
        e.preventDefault();
        if (partyOpen) onPartyToggle();
      }}
    >
      {(state === "resolving" || syncing) && (
        <LoadingIndicator overlay label="กำลังบันทึกคำตอบ…" />
      )}
      <div className="raid-question-shell">
        <div className="raid-question-hud">
          <RaidStudentHud
            heroes={heroes}
            ownId={ownId}
            deadline={deadline}
            serverNow={serverNow}
            open={partyOpen}
            onToggle={onPartyToggle}
            id="raid-question-party"
          />
        </div>
        <form
          className="raid-question-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canEdit || !valid) return;
            if (!confirmation && question.questionType === "short_text") {
              begin();
              return;
            }
            send();
          }}
        >
          <div className="raid-question-heading">
            <div className="raid-question-info">
              <div className="raid-question-title-row">
                <h2 id="raid-question-title">
                  ข้อ {question.displayIndex + 1} / {total}
                </h2>
                {visibilityEnabled && (
                  <span
                    className="raid-visibility-chip"
                    data-warn={warnings > 0}
                    title="ออกจากหน้าเกมเกิน 3 วินาที เตือนได้ 2 ครั้ง ครั้งที่ 3 ข้ามข้อนี้"
                  >
                    <ShieldAlert size={13} aria-hidden="true" />
                    เตือนสลับหน้า {Math.min(2, warnings)}/2
                  </span>
                )}
              </div>
              <p className="raid-question-points">
                <span>ข้อนี้ {question.points} คะแนน</span>
                <strong>คะแนนสะสม {score.toLocaleString()}</strong>
              </p>
            </div>
            <AudioControl />
          </div>

          {showBossBar && (
            <div className="raid-question-boss-strip" aria-label="พลังชีวิตบอสของทีม">
              <div className="raid-question-boss-meta">
                <BossIdentity type={bossType} />
                <span>
                  HP {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()} ({bossPct}%)
                </span>
              </div>
              <progress max={bossMaxHp} value={bossHp} />
            </div>
          )}

          <div
            className="raid-question-body"
            tabIndex={0}
            role="region"
            aria-label="โจทย์คำถาม"
          >
            <MathText text={question.questionText} />
            {question.imageUrl && (
              <QuestionImage
                src={question.imageUrl}
                alt={`รูปประกอบคำถามข้อ ${question.displayIndex + 1}`}
              />
            )}
          </div>

          <div className="raid-answer-area">
            {question.questionType === "short_text" ? (
              <label className="raid-text-answer">
                คำตอบของคุณ
                <input
                  autoFocus
                  value={answer}
                  maxLength={2000}
                  disabled={!canEdit}
                  onChange={(e) => {
                    draft.current.answer = e.target.value;
                    draft.current.end = 0;
                    setAnswer(e.target.value);
                    setConfirmation(null);
                  }}
                  placeholder="พิมพ์คำตอบ"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
                  }}
                />
              </label>
            ) : (
              <fieldset className="raid-options">
                <legend>เลือกคำตอบเพื่อโจมตีบอส</legend>
                {question.options.map((o, i) => (
                  <label key={o.id} data-selected={option === o.id}>
                    <input
                      type="radio"
                      name="raid_option"
                      value={o.id}
                      checked={option === o.id}
                      disabled={!canEdit}
                      onChange={() => {
                        draft.current.option = o.id;
                        setOption(o.id);
                        if (autoConfirm) begin();
                        else setConfirmation({ end: Infinity });
                      }}
                      autoFocus={i === 0}
                    />
                    <span className="raid-option-letter">{LETTERS[i]}</span>
                    <MathText inline text={o.optionText} />
                    {option === o.id && confirmation && autoConfirm && (
                      <span
                        className="raid-choice-sweep"
                        style={{ transform: `scaleX(${left / 5000})` }}
                        aria-hidden="true"
                      />
                    )}
                  </label>
                ))}
              </fieldset>
            )}
          </div>

          <div className="raid-question-footer">
            <p
              role="status"
              aria-live="polite"
              className="raid-feedback"
              data-guidance={!error && !feedback && !confirmation}
            >
              {error ||
                feedback ||
                (seconds === 0 && deadline
                  ? "หมดเวลาตอบคำถามแล้ว"
                  : confirmation
                    ? autoConfirm
                      ? `จะโจมตีด้วยคำตอบ ${letter ? `${letter}.` : "นี้"} ใน 5 วินาที หรือกดยืนยันเลย`
                      : "ตรวจคำตอบแล้ว กดยืนยันเพื่อส่ง"
                    : question.questionType === "short_text"
                      ? "พิมพ์คำตอบแล้วกดตรวจคำตอบก่อนส่ง"
                      : "แตะช้อยเพื่อเลือก · เปลี่ยนใจหรือกดยกเลิกได้ภายใน 5 วินาที")}
            </p>
            {state === "error" ? (
              <button type="button" className="raid-primary" onClick={onRetry}>
                ส่งคำตอบเดิมอีกครั้ง
              </button>
            ) : (
              <button
                className="raid-primary raid-confirm-answer"
                type="submit"
                disabled={!valid || !canEdit}
                data-counting={Boolean(confirmation)}
              >
                {confirmation ? (
                  <>
                    <Check size={18} aria-hidden="true" />
                    ยืนยันคำตอบ{letter ? ` ${letter}.` : ""}
                    {autoConfirm && (
                      <span className="raid-confirm-seconds" aria-hidden="true">
                        <Timer size={16} />
                        {Math.ceil(left / 1000)}
                      </span>
                    )}
                  </>
                ) : state === "resolving" ? (
                  "กำลังบันทึก…"
                ) : question.questionType === "short_text" ? (
                  "ตรวจคำตอบก่อนส่ง"
                ) : (
                  "ยืนยันคำตอบ"
                )}
                {confirmation && autoConfirm && (
                  <span
                    className="raid-confirm-sweep"
                    style={{ transform: `scaleX(${left / 5000})` }}
                    aria-hidden="true"
                  />
                )}
              </button>
            )}
            {option && canEdit && (
              <button className="raid-clear-choice" type="button" onClick={clear}>
                <X size={15} aria-hidden="true" />
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </div>
    </dialog>
  );
}
