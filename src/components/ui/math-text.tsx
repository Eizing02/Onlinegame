import katex from "katex";

import { cn } from "@/lib/utils";

type MathTextProps = {
  text: string;
  className?: string;
  inline?: boolean;
};

type MathPart =
  | { kind: "text"; value: string }
  | { displayMode: boolean; kind: "math"; value: string };

const MATH_DELIMITER_PATTERN =
  /(\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$\$[\s\S]+?\$\$|\$[^\n$]+?\$)/g;

function parseMathText(text: string): MathPart[] {
  const parts: MathPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MATH_DELIMITER_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ kind: "text", value: text.slice(lastIndex, index) });
    }

    if (raw.startsWith("\\[") && raw.endsWith("\\]")) {
      parts.push({ displayMode: true, kind: "math", value: raw.slice(2, -2) });
    } else if (raw.startsWith("\\(") && raw.endsWith("\\)")) {
      parts.push({ displayMode: false, kind: "math", value: raw.slice(2, -2) });
    } else if (raw.startsWith("$$") && raw.endsWith("$$")) {
      parts.push({ displayMode: true, kind: "math", value: raw.slice(2, -2) });
    } else if (raw.startsWith("$") && raw.endsWith("$")) {
      parts.push({ displayMode: false, kind: "math", value: raw.slice(1, -1) });
    } else {
      parts.push({ kind: "text", value: raw });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

function renderMath(source: string, displayMode: boolean) {
  return katex.renderToString(source, {
    displayMode,
    output: "html",
    strict: "ignore",
    throwOnError: false,
    trust: false,
  });
}

export function MathText({ className, inline = false, text }: MathTextProps) {
  const parts = parseMathText(text);
  const Wrapper = inline ? "span" : "div";

  return (
    <Wrapper className={cn("math-text whitespace-pre-wrap", className)}>
      {parts.map((part, index) => {
        if (part.kind === "text") {
          return <span key={`${index}-text`}>{part.value}</span>;
        }

        return (
          <span
            className={
              part.displayMode
                ? "my-3 block overflow-x-auto overflow-y-hidden py-1"
                : "inline-block align-baseline"
            }
            dangerouslySetInnerHTML={{
              __html: renderMath(part.value, part.displayMode),
            }}
            key={`${index}-math`}
          />
        );
      })}
    </Wrapper>
  );
}
