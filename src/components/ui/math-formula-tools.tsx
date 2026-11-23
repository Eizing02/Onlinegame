"use client";

import { MathText } from "@/components/ui/math-text";

const MATH_SNIPPETS: Array<{ label: string; snippet: string; title: string }> = [
  { label: "เศษส่วน", snippet: "\\(\\frac{a}{b}\\)", title: "แทรกเศษส่วน" },
  { label: "ยกกำลัง", snippet: "\\(x^{2}\\)", title: "แทรกเลขยกกำลัง" },
  { label: "รากที่สอง", snippet: "\\(\\sqrt{x}\\)", title: "แทรกรากที่สอง" },
  { label: "×", snippet: "\\(\\times\\)", title: "แทรกเครื่องหมายคูณ" },
  { label: "÷", snippet: "\\(\\div\\)", title: "แทรกเครื่องหมายหาร" },
  { label: "π", snippet: "\\(\\pi\\)", title: "แทรกพาย" },
  { label: "±", snippet: "\\(\\pm\\)", title: "แทรกบวกลบ" },
  { label: "≤", snippet: "\\(\\le\\)", title: "แทรกน้อยกว่าหรือเท่ากับ" },
];

export function insertSnippetAtCursor(
  element: HTMLTextAreaElement | HTMLInputElement | null,
  currentValue: string,
  snippet: string,
) {
  if (!element) {
    return { nextValue: currentValue + snippet, caret: (currentValue + snippet).length };
  }

  const start = element.selectionStart ?? currentValue.length;
  const end = element.selectionEnd ?? currentValue.length;
  const nextValue = currentValue.slice(0, start) + snippet + currentValue.slice(end);
  return { nextValue, caret: start + snippet.length };
}

export function hasMathSyntax(text: string) {
  return text.includes("\\(") || text.includes("\\[");
}

export function MathFormulaTools({
  value,
  onInsert,
  previewLabel = "ตัวอย่างโจทย์ที่นักเรียนจะเห็น",
}: {
  value: string;
  onInsert: (snippet: string) => void;
  previewLabel?: string;
}) {
  const trimmed = value.trim();

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted">แทรกสูตรไว:</span>
        {MATH_SNIPPETS.map((item) => (
          <button
            className="inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
            key={item.label}
            onClick={() => onInsert(item.snippet)}
            title={item.title}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {trimmed && hasMathSyntax(trimmed) ? (
        <div className="rounded-md border border-border bg-surface px-3 py-2.5">
          <p className="text-xs font-medium text-muted">{previewLabel}</p>
          <div className="mt-1 text-base font-medium leading-7 text-foreground">
            <MathText text={trimmed} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
