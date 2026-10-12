"use client";

import { CheckCircle2, ImagePlus, Keyboard, ListChecks } from "lucide-react";
import { useState } from "react";

import type { QuestionType } from "@/lib/data/question-bank";

const QUESTION_TYPE_OPTIONS: Array<{
  icon: typeof Keyboard;
  label: string;
  value: QuestionType;
}> = [
  { icon: Keyboard, label: "พิมพ์ตอบ", value: "short_text" },
  { icon: CheckCircle2, label: "ถูก / ผิด", value: "true_false" },
  { icon: ListChecks, label: "ปรนัย 4 ตัวเลือก", value: "multiple_choice" },
];

const MULTIPLE_CHOICE_LABELS = ["A", "B", "C", "D"];

export function QuestionTypeFields() {
  const [questionType, setQuestionType] = useState<QuestionType>("short_text");

  return (
    <div className="space-y-5 rounded-lg border border-cyan/25 bg-cyan/5 p-4">
      <input name="question_type" type="hidden" value={questionType} />
      <div className="grid gap-2 sm:grid-cols-3">
        {QUESTION_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = questionType === option.value;

          return (
            <button
              className={
                selected
                  ? "inline-flex h-12 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-3 text-sm font-semibold text-white shadow-sm"
                  : "inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              }
              key={option.value}
              onClick={() => setQuestionType(option.value)}
              type="button"
            >
              <Icon size={18} />
              {option.label}
            </button>
          );
        })}
      </div>

      {questionType === "short_text" ? (
        <div>
          <label className="text-sm font-medium" htmlFor="correct_answer">
            คำตอบที่ถูก
          </label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
            id="correct_answer"
            name="correct_answer"
            placeholder="เช่น 42 หรือ \\(x=2\\)"
            required
          />
          <p className="mt-2 text-xs leading-5 text-muted">
            คำตอบและตัวเลือกพิมพ์สูตรได้ เช่น <code>\(\frac{"{1}"}{"{2}"}\)</code>
          </p>
        </div>
      ) : null}

      {questionType === "true_false" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "ถูก", value: "true" },
            { label: "ผิด", value: "false" },
          ].map((option) => (
            <label
              className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-surface p-3 font-semibold transition hover:border-primary"
              key={option.value}
            >
              <input
                className="h-5 w-5 accent-primary"
                name="true_false_answer"
                required={questionType === "true_false"}
                type="radio"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}

      {questionType === "multiple_choice" ? (
        <div className="space-y-3">
          {MULTIPLE_CHOICE_LABELS.map((label, index) => (
            <div
              className="grid gap-2 rounded-md border border-border bg-surface p-3 sm:grid-cols-[auto_1fr]"
              key={label}
            >
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  className="h-5 w-5 accent-primary"
                  name="correct_option_index"
                  required={questionType === "multiple_choice"}
                  type="radio"
                  value={index}
                />
                เฉลย {label}
              </label>
              <input
                className="h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                name={`option_${index}`}
                placeholder={`ตัวเลือก ${label}`}
                required={questionType === "multiple_choice"}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium" htmlFor="image_file">
          รูปประกอบ
        </label>
        <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-primary/50 bg-surface px-3 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5">
          <span className="inline-flex items-center gap-2">
            <ImagePlus size={18} />
            เลือกรูปภาพ
          </span>
          <input
            accept="image/*"
            className="max-w-52 text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            id="image_file"
            name="image_file"
            type="file"
          />
        </label>
      </div>
    </div>
  );
}
