"use client";

import { ImagePlus, ListPlus, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { addQuestionAction } from "@/app/teacher/actions";
import { LoadingForm } from "@/components/ui/loading-form";
import {
  insertSnippetAtCursor,
  MathFormulaTools,
} from "@/components/ui/math-formula-tools";
import { QuestionImage } from "@/components/ui/question-image";
import { prepareQuestionImage, QUESTION_IMAGE_ACCEPT } from "@/lib/image/prepare-question-image";
import { QuestionTypeFields } from "./question-type-fields";

type PreparedImage = Awaited<ReturnType<typeof prepareQuestionImage>>;
type ImageSelection =
  | { status: "empty" | "preparing" }
  | { status: "invalid"; message: string }
  | Exclude<PreparedImage, { status: "ready" }>
  | (Extract<PreparedImage, { status: "ready" }> & { url: string });

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024).toLocaleString("th-TH")} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function AddQuestionForm({ questionSetId }: { questionSetId: string }) {
  const [image, setImage] = useState<ImageSelection>({ status: "empty" });
  const [feedback, setFeedback] = useState<Awaited<ReturnType<typeof addQuestionAction>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [questionText, setQuestionText] = useState("");
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const imageJob = useRef(0);
  const draftId = useRef<string | null>(null);
  const saveLock = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  const saveError = useRef<HTMLParagraphElement>(null);
  const url = image.status === "ready" ? image.url : null;
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => () => { imageJob.current += 1; }, []);
  useEffect(() => {
    if (saving || feedback?.ok !== false) return;
    // The shared loading form releases inert in an effect when saving ends.
    const frame = requestAnimationFrame(() => saveError.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [feedback, saving]);

  async function prepare(source: File, useStill = false) {
    const job = ++imageJob.current;
    setFeedback(null);
    setImage({ status: "preparing" });
    try {
      const result = await prepareQuestionImage(source, useStill);
      if (imageJob.current !== job) return;
      setImage(result.status === "ready" ? { ...result, url: URL.createObjectURL(result.file) } : result);
    } catch (error) {
      if (imageJob.current !== job) return;
      setImage({
        status: "invalid",
        message: error instanceof Error && !(error instanceof DOMException)
          ? error.message
          : "เตรียมรูปนี้ไม่ได้ ลองเลือกไฟล์ PNG หรือ JPG",
      });
    }
  }

  function removeImage() {
    imageJob.current += 1;
    setImage({ status: "empty" });
    setFeedback(null);
    picker.current?.focus();
  }

  const canSubmit = image.status === "empty" || image.status === "ready";
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current || !canSubmit) return;
    const form = event.currentTarget;
    const payload = new FormData(form);
    payload.set("question_set_id", questionSetId);
    draftId.current ??= crypto.randomUUID();
    payload.set("draft_id", draftId.current);
    if (image.status === "ready") payload.set("image_file", image.file);

    saveLock.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await addQuestionAction(payload);
      setFeedback(result);
      if (result.ok) {
        draftId.current = null;
        setImage({ status: "empty" });
        setQuestionText("");
        form.reset();
        setFormVersion(version => version + 1);
      }
    } catch {
      setFeedback({ ok: false, message: "ส่งคำถามไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองอีกครั้ง" });
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  const formError = feedback?.ok === false && feedback.field !== "image" ? feedback.message : null;
  const imageError = feedback?.ok === false && feedback.field === "image" ? feedback.message : null;
  const pickerError = image.status === "invalid" ? image.message : imageError;
  const buttonClass = "inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-primary hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <LoadingForm className="grid gap-5" method="post" busy={saving} onSubmit={save}>
      <div>
        <label className="text-sm font-medium" htmlFor="question_text">คำถาม</label>
        <textarea
          ref={questionInputRef}
          id="question_text"
          name="question_text"
          className="mt-2 min-h-28 w-full rounded-md border border-border bg-surface px-3 py-3 outline-none focus:border-primary"
          placeholder="พิมพ์คำถามที่ต้องการให้นักเรียนตอบ"
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          required
        />
        <MathFormulaTools
          value={questionText}
          onInsert={(snippet) => {
            const { nextValue, caret } = insertSnippetAtCursor(
              questionInputRef.current,
              questionText,
              snippet,
            );
            setQuestionText(nextValue);
            requestAnimationFrame(() => {
              questionInputRef.current?.focus();
              questionInputRef.current?.setSelectionRange(caret, caret);
            });
          }}
        />
      </div>
      <QuestionTypeFields key={formVersion} />
      <fieldset className="min-w-0 rounded-md border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">รูปประกอบ</legend>
        <div className="relative flex flex-wrap items-center gap-2">
          <input
            ref={picker}
            id="image_file"
            type="file"
            accept={QUESTION_IMAGE_ACCEPT}
            aria-describedby={pickerError ? "question-image-help question-image-error" : "question-image-help"}
            aria-invalid={pickerError ? true : undefined}
            className="peer sr-only"
            onChange={event => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void prepare(file);
            }}
          />
          <label
            htmlFor="image_file"
            className={`${buttonClass} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary`}
          >
            <ImagePlus aria-hidden="true" size={18} />
            {image.status === "empty" ? "เลือกรูปภาพ" : "เปลี่ยนรูป"}
          </label>
          {image.status !== "empty" && (
            <button type="button" className={buttonClass} onClick={removeImage}>ลบรูป</button>
          )}
        </div>
        <p id="question-image-help" className="mt-2 text-sm text-muted">
          แนบรูปได้ 1 รูป ระบบจะเตรียมรูปให้ก่อนส่ง (สูงสุด 2.5 MB)
        </p>
        {image.status === "preparing" && (
          <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true" />
            กำลังเตรียมรูปภาพ…
          </p>
        )}
        {pickerError && (
          <p id="question-image-error" ref={imageError ? saveError : undefined} tabIndex={-1} role="alert" className="mt-3 rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger">
            {pickerError}
          </p>
        )}
        {image.status === "still" && (
          <div className="mt-3 space-y-2">
            <p role="status" className="text-sm">GIF นี้มีขนาดหรือความละเอียดเกินที่ส่งได้ คุณสามารถใช้ภาพนิ่งหรือเลือกรูปใหม่</p>
            <button type="button" className={buttonClass} onClick={() => void prepare(image.source, true)}>ใช้ภาพนิ่ง</button>
          </div>
        )}
        {image.status === "ready" && (
          <div className="mt-3 space-y-2">
            <p role="status" className="text-sm text-muted">
              รูปพร้อมส่ง · {image.file.size === image.originalBytes
                ? fileSize(image.file.size)
                : `${fileSize(image.originalBytes)} → ${fileSize(image.file.size)}`} ({image.format})
            </p>
            <p className="wrap-anywhere text-sm font-medium">{image.originalName}</p>
            <p className="text-xs text-muted">{image.width} × {image.height} px</p>
            <QuestionImage key={image.url} src={image.url} alt="ตัวอย่างรูปประกอบ" className="max-w-xl" />
          </div>
        )}
      </fieldset>
      <div className="grid gap-4 md:grid-cols-[140px_200px]">
        <div>
          <label className="text-sm font-medium" htmlFor="points">คะแนน</label>
          <input
            id="points" name="points" defaultValue={10} min={0} max={1000} type="number"
            className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="time_limit_seconds">เวลาตอบต่อข้อ (วินาที)</label>
          <input
            id="time_limit_seconds" name="time_limit_seconds" defaultValue={60} min={5} max={600} type="number"
            className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          />
        </div>
      </div>
      {formError && (
        <p ref={saveError} tabIndex={-1} role="alert" className="rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger">{formError}</p>
      )}
      {feedback?.ok && (
        <p role="status" className="text-sm font-medium text-success">เพิ่มคำถามแล้ว</p>
      )}
      <div>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={!canSubmit || saving}
        >
          <ListPlus size={18} aria-hidden="true" />
          เพิ่มคำถาม
        </button>
      </div>
    </LoadingForm>
  );
}
