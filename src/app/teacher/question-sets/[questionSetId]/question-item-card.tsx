"use client";

import {
  Check,
  Clock,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { deleteQuestionAction, updateQuestionAction } from "@/app/teacher/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { LoadingForm } from "@/components/ui/loading-form";
import {
  insertSnippetAtCursor,
  MathFormulaTools,
} from "@/components/ui/math-formula-tools";
import { MathText } from "@/components/ui/math-text";
import { Panel } from "@/components/ui/panel";
import { QuestionImage } from "@/components/ui/question-image";
import type { StoredQuestion } from "@/lib/data/question-bank";
import { choiceLabel } from "@/lib/game/choice-labels";
import {
  prepareQuestionImage,
  QUESTION_IMAGE_ACCEPT,
} from "@/lib/image/prepare-question-image";
import { QuestionTypeFields } from "./question-type-fields";

const questionTypeLabel = {
  short_text: "พิมพ์ตอบ",
  true_false: "ถูก / ผิด",
  multiple_choice: "ปรนัย",
};

type PreparedImage = Awaited<ReturnType<typeof prepareQuestionImage>>;
type EditImageState =
  | { status: "unchanged" }
  | { status: "removed" }
  | { status: "preparing" }
  | { status: "invalid"; message: string }
  | Exclude<PreparedImage, { status: "ready" }>
  | (Extract<PreparedImage, { status: "ready" }> & { url: string });

function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024).toLocaleString("th-TH")} KB`
    : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function QuestionItemCard({
  questionSetId,
  question,
  index,
}: {
  questionSetId: string;
  question: StoredQuestion;
  index: number;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [questionText, setQuestionText] = useState(question.questionText);
  const [imageState, setImageState] = useState<EditImageState>({
    status: "unchanged",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageJobRef = useRef(0);
  const saveLockRef = useRef(false);

  const previewUrl = imageState.status === "ready" ? imageState.url : null;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function openEdit() {
    setQuestionText(question.questionText);
    setImageState({ status: "unchanged" });
    setErrorMsg(null);
    setSavedNotice(false);
    setIsEditing(true);
  }

  function closeEdit() {
    imageJobRef.current += 1;
    setImageState({ status: "unchanged" });
    setErrorMsg(null);
    setIsEditing(false);
  }

  async function handlePrepareImage(source: File, useStill = false) {
    const job = ++imageJobRef.current;
    setErrorMsg(null);
    setImageState({ status: "preparing" });

    try {
      const result = await prepareQuestionImage(source, useStill);
      if (imageJobRef.current !== job) return;
      setImageState(
        result.status === "ready"
          ? { ...result, url: URL.createObjectURL(result.file) }
          : result,
      );
    } catch (error) {
      if (imageJobRef.current !== job) return;
      setImageState({
        status: "invalid",
        message:
          error instanceof Error && !(error instanceof DOMException)
            ? error.message
            : "เตรียมรูปนี้ไม่ได้ ลองเลือกไฟล์ PNG หรือ JPG",
      });
    }
  }

  const canSubmit =
    imageState.status === "unchanged" ||
    imageState.status === "removed" ||
    imageState.status === "ready";

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLockRef.current || !canSubmit) return;

    const form = event.currentTarget;
    const payload = new FormData(form);
    payload.set("question_set_id", questionSetId);
    payload.set("question_id", question.id);
    if (imageState.status === "removed") {
      payload.set("remove_image", "true");
    }
    if (imageState.status === "ready") {
      payload.set("image_file", imageState.file);
    }

    saveLockRef.current = true;
    setSaving(true);
    setErrorMsg(null);

    try {
      const result = await updateQuestionAction(payload);
      if (result.ok) {
        setIsEditing(false);
        setImageState({ status: "unchanged" });
        setSavedNotice(true);
        router.refresh();
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setErrorMsg("บันทึกการแก้ไขไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองอีกครั้ง");
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }

  if (isEditing) {
    const buttonClass =
      "inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-primary hover:border-primary";
    const imageInputId = `edit_image_${question.id}`;
    const showExistingImage =
      imageState.status === "unchanged" && Boolean(question.imageUrl);

    return (
      <Panel className="space-y-4 border-primary/50">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-primary">
            แก้ไขคำถามข้อ {index + 1}
          </h2>
          <button
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-panel-strong"
            disabled={saving}
            onClick={closeEdit}
            type="button"
          >
            <X size={16} />
            ยกเลิก
          </button>
        </div>

        <LoadingForm
          busy={saving}
          className="grid gap-4"
          loadingLabel="กำลังบันทึกการแก้ไข…"
          method="post"
          onSubmit={handleSaveEdit}
        >
          <div>
            <label
              className="text-sm font-medium"
              htmlFor={`edit_text_${question.id}`}
            >
              คำถาม
            </label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-3 outline-none focus:border-primary"
              id={`edit_text_${question.id}`}
              name="question_text"
              onChange={(event) => setQuestionText(event.target.value)}
              ref={textareaRef}
              required
              value={questionText}
            />
            <MathFormulaTools
              onInsert={(snippet) => {
                const { nextValue, caret } = insertSnippetAtCursor(
                  textareaRef.current,
                  questionText,
                  snippet,
                );
                setQuestionText(nextValue);
                requestAnimationFrame(() => {
                  textareaRef.current?.focus();
                  textareaRef.current?.setSelectionRange(caret, caret);
                });
              }}
              value={questionText}
            />
          </div>

          <QuestionTypeFields
            idPrefix={`edit_${question.id}`}
            initialQuestion={question}
          />

          <fieldset className="min-w-0 rounded-md border border-border bg-surface p-4">
            <legend className="px-1 text-sm font-semibold">รูปประกอบ</legend>
            <div className="relative flex flex-wrap items-center gap-2">
              <input
                accept={QUESTION_IMAGE_ACCEPT}
                className="peer sr-only"
                id={imageInputId}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void handlePrepareImage(file);
                }}
                type="file"
              />
              <label
                className={`${buttonClass} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary`}
                htmlFor={imageInputId}
              >
                <ImagePlus aria-hidden="true" size={18} />
                {showExistingImage || imageState.status === "ready"
                  ? "เปลี่ยนรูป"
                  : "เพิ่มรูปภาพ"}
              </label>
              {showExistingImage || imageState.status === "ready" ? (
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/15"
                  onClick={() => {
                    imageJobRef.current += 1;
                    setImageState({ status: "removed" });
                  }}
                  type="button"
                >
                  <Trash2 size={16} />
                  ลบรูป
                </button>
              ) : null}
              {imageState.status === "removed" && question.imageUrl ? (
                <button
                  className={buttonClass}
                  onClick={() => setImageState({ status: "unchanged" })}
                  type="button"
                >
                  คืนรูปเดิม
                </button>
              ) : null}
            </div>

            {imageState.status === "preparing" ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold" role="status">
                <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" size={18} />
                กำลังเตรียมรูปภาพ…
              </p>
            ) : null}

            {imageState.status === "invalid" ? (
              <p className="mt-3 rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger" role="alert">
                {imageState.message}
              </p>
            ) : null}

            {imageState.status === "still" ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm" role="status">
                  GIF นี้มีขนาดหรือความละเอียดเกินที่ส่งได้ ใช้ภาพนิ่งหรือเลือกรูปใหม่ได้
                </p>
                <button
                  className={buttonClass}
                  onClick={() => void handlePrepareImage(imageState.source, true)}
                  type="button"
                >
                  ใช้ภาพนิ่ง
                </button>
              </div>
            ) : null}

            {imageState.status === "ready" ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted" role="status">
                  รูปใหม่พร้อมบันทึก ·{" "}
                  {imageState.file.size === imageState.originalBytes
                    ? fileSize(imageState.file.size)
                    : `${fileSize(imageState.originalBytes)} → ${fileSize(imageState.file.size)}`}{" "}
                  ({imageState.format})
                </p>
                <QuestionImage
                  alt="ตัวอย่างรูปใหม่"
                  className="max-w-md"
                  key={imageState.url}
                  src={imageState.url}
                />
              </div>
            ) : null}

            {showExistingImage && question.imageUrl ? (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted">รูปปัจจุบัน:</p>
                <QuestionImage
                  alt={`รูปปัจจุบันข้อ ${index + 1}`}
                  className="max-w-md"
                  src={question.imageUrl}
                />
              </div>
            ) : null}

            {imageState.status === "removed" ? (
              <p className="mt-2 text-xs text-warning">
                จะลบรูปประกอบเมื่อกดบันทึกการแก้ไข
              </p>
            ) : null}
          </fieldset>

          <div className="grid gap-4 md:grid-cols-[140px_200px]">
            <div>
              <label
                className="text-sm font-medium"
                htmlFor={`edit_points_${question.id}`}
              >
                คะแนน
              </label>
              <input
                className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
                defaultValue={question.points}
                id={`edit_points_${question.id}`}
                max={1000}
                min={0}
                name="points"
                type="number"
              />
            </div>
            <div>
              <label
                className="text-sm font-medium"
                htmlFor={`edit_time_${question.id}`}
              >
                เวลาตอบต่อข้อ (วินาที)
              </label>
              <input
                className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
                defaultValue={question.timeLimitSeconds}
                id={`edit_time_${question.id}`}
                max={600}
                min={5}
                name="time_limit_seconds"
                type="number"
              />
            </div>
          </div>

          {errorMsg ? (
            <p
              className="rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger"
              role="alert"
            >
              {errorMsg}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit || saving}
              type="submit"
            >
              <Check size={18} />
              บันทึกการแก้ไข
            </button>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-panel-strong"
              disabled={saving}
              onClick={closeEdit}
              type="button"
            >
              ยกเลิก
            </button>
          </div>
        </LoadingForm>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-4">
      {savedNotice ? (
        <p className="text-xs font-semibold text-success" role="status">
          บันทึกการแก้ไขข้อ {index + 1} แล้ว
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <input
            aria-label={`เลือกข้อ ${index + 1}`}
            className="mt-1 h-5 w-5 rounded border-border bg-background"
            form="bulk-delete-questions"
            name="question_ids"
            type="checkbox"
            value={question.id}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">
              ข้อ {index + 1}
              <span className="ml-2 rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-xs text-cyan">
                {questionTypeLabel[question.questionType]}
              </span>
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-7">
              <MathText text={question.questionText} />
            </h2>
            {question.imageUrl ? (
              <QuestionImage
                alt={`รูปประกอบคำถามข้อ ${index + 1}`}
                className="mt-4 max-w-xl bg-surface"
                src={question.imageUrl}
              />
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label={`แก้ไขข้อ ${index + 1}`}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            onClick={openEdit}
            title="แก้ไขคำถาม"
            type="button"
          >
            <Pencil size={16} />
            <span className="hidden sm:inline">แก้ไข</span>
          </button>
          <LoadingForm action={deleteQuestionAction}>
            <input name="question_set_id" type="hidden" value={questionSetId} />
            <input name="question_id" type="hidden" value={question.id} />
            <ConfirmSubmitButton
              aria-label={`ลบข้อ ${index + 1}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-danger bg-danger/10 text-danger transition hover:bg-danger/15"
              message={`ลบคำถามข้อ ${index + 1}? การลบนี้ย้อนกลับไม่ได้`}
              title="ลบคำถาม"
            >
              <Trash2 size={18} />
            </ConfirmSubmitButton>
          </LoadingForm>
        </div>
      </div>
      <div className="grid gap-3 border-t border-border pt-4 text-sm md:grid-cols-3">
        <div>
          <p className="text-muted">คำตอบที่ถูก</p>
          <MathText className="mt-1 font-semibold" text={question.correctAnswer} />
        </div>
        <div>
          <p className="text-muted">คะแนน</p>
          <p className="mt-1 font-semibold">{question.points}</p>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-1 text-muted" size={16} />
          <div>
            <p className="text-muted">เวลาตอบ</p>
            <p className="mt-1 font-semibold">
              {question.timeLimitSeconds} วินาที
            </p>
          </div>
        </div>
        {question.options.length > 0 ? (
          <div className="md:col-span-3">
            <p className="text-muted">ตัวเลือก</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <div
                  className={
                    option.isCorrect
                      ? "rounded-md border border-success bg-success/10 px-3 py-2 font-semibold text-success"
                      : "rounded-md border border-border bg-surface px-3 py-2"
                  }
                  key={option.id}
                >
                  <span className="mr-2 text-xs font-semibold text-muted">
                    {choiceLabel(optionIndex)}
                  </span>
                  <MathText className="inline" inline text={option.optionText} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
