"use client";

import { CheckCircle2, Keyboard, ListChecks } from "lucide-react";
import { useState } from "react";

import { hasMathSyntax } from "@/components/ui/math-formula-tools";
import { MathText } from "@/components/ui/math-text";
import type { QuestionType, StoredQuestion } from "@/lib/data/question-bank";
import { CHOICE_LABELS } from "@/lib/game/choice-labels";

const QUESTION_TYPE_OPTIONS: Array<{
  icon: typeof Keyboard;
  label: string;
  value: QuestionType;
}> = [
  { icon: Keyboard, label: "พิมพ์ตอบ", value: "short_text" },
  { icon: CheckCircle2, label: "ถูก / ผิด", value: "true_false" },
  { icon: ListChecks, label: "ปรนัย 4 ตัวเลือก", value: "multiple_choice" },
];

const MULTIPLE_CHOICE_LABELS = CHOICE_LABELS;

type QuestionTypeFieldsProps = {
  idPrefix?: string;
  initialQuestion?: Pick<
    StoredQuestion,
    "questionType" | "correctAnswer" | "options"
  >;
};

export function QuestionTypeFields({
  idPrefix = "add",
  initialQuestion,
}: QuestionTypeFieldsProps) {
  const [questionType, setQuestionType] = useState<QuestionType>(
    initialQuestion?.questionType ?? "short_text",
  );
  const [shortAnswer, setShortAnswer] = useState(
    initialQuestion?.questionType === "short_text"
      ? initialQuestion.correctAnswer
      : "",
  );
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<string>(() => {
    if (initialQuestion?.questionType !== "true_false") return "";
    const trueOpt = initialQuestion.options.find((opt) => opt.optionText === "ถูก");
    if (trueOpt) return trueOpt.isCorrect ? "true" : "false";
    return initialQuestion.correctAnswer === "ถูก" ? "true" : "false";
  });
  const [optionTexts, setOptionTexts] = useState<string[]>(() =>
    Array.from({ length: 4 }, (_, index) =>
      initialQuestion?.questionType === "multiple_choice"
        ? (initialQuestion.options[index]?.optionText ?? "")
        : "",
    ),
  );
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(() => {
    if (initialQuestion?.questionType !== "multiple_choice") return -1;
    return initialQuestion.options.findIndex((opt) => opt.isCorrect);
  });

  const answerInputId = `${idPrefix}_correct_answer`;

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
                  ? "inline-flex h-12 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-3 text-sm font-semibold text-white"
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
          <label className="text-sm font-medium" htmlFor={answerInputId}>
            คำตอบที่ถูก
          </label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
            id={answerInputId}
            name="correct_answer"
            onChange={(event) => setShortAnswer(event.target.value)}
            placeholder="เช่น 42 หรือ \(x=2\)"
            required
            value={shortAnswer}
          />
          <p className="mt-2 text-xs leading-5 text-muted">
            คำตอบและตัวเลือกพิมพ์สูตรได้ เช่น <code>\(\frac{"{1}"}{"{2}"}\)</code>
          </p>
          {hasMathSyntax(shortAnswer) ? (
            <div className="mt-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <span className="mr-2 text-xs text-muted">ตัวอย่างคำตอบ:</span>
              <MathText className="inline font-semibold" inline text={shortAnswer} />
            </div>
          ) : null}
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
                checked={trueFalseAnswer === option.value}
                className="h-5 w-5 accent-primary"
                name="true_false_answer"
                onChange={() => setTrueFalseAnswer(option.value)}
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
              className="space-y-2 rounded-md border border-border bg-surface p-3"
              key={label}
            >
              <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    checked={correctOptionIndex === index}
                    className="h-5 w-5 accent-primary"
                    name="correct_option_index"
                    onChange={() => setCorrectOptionIndex(index)}
                    required={questionType === "multiple_choice"}
                    type="radio"
                    value={index}
                  />
                  เฉลย {label}
                </label>
                <input
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
                  name={`option_${index}`}
                  onChange={(event) => {
                    const next = [...optionTexts];
                    next[index] = event.target.value;
                    setOptionTexts(next);
                  }}
                  placeholder={`ตัวเลือก ${label}`}
                  required={questionType === "multiple_choice"}
                  value={optionTexts[index] ?? ""}
                />
              </div>
              {hasMathSyntax(optionTexts[index] ?? "") ? (
                <div className="border-t border-border/40 pt-1.5 text-sm">
                  <span className="mr-2 text-xs text-muted">ตัวอย่าง {label}:</span>
                  <MathText className="inline" inline text={optionTexts[index] ?? ""} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
