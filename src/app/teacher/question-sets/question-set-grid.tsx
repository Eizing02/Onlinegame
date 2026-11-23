"use client";

import { BookOpenCheck, ListPlus, Play, Search, X } from "lucide-react";
import { useState } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";

type QuestionSetSummary = {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  totalPoints: number;
};

export function QuestionSetGrid({
  questionSets,
}: {
  questionSets: QuestionSetSummary[];
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? questionSets.filter(
        (set) =>
          set.title.toLowerCase().includes(normalized) ||
          (set.description ?? "").toLowerCase().includes(normalized),
      )
    : questionSets;

  return (
    <div className="space-y-4">
      {questionSets.length > 0 ? (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={18}
            />
            <input
              aria-label="ค้นหาชุดคำถาม"
              className="h-11 w-full rounded-md border border-border bg-surface pl-10 pr-10 text-sm outline-none focus:border-primary"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อชุดคำถามหรือคำอธิบาย..."
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="ล้างคำค้นหา"
                className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-foreground"
                onClick={() => setQuery("")}
                type="button"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            แสดง {filtered.length} จาก {questionSets.length} ชุดคำถาม
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((set) => (
          <Panel key={set.id} className="flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-success/10 text-primary">
                  <BookOpenCheck size={22} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{set.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {set.description || "ยังไม่มีคำอธิบาย"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="font-medium">{set.questionCount} ข้อ</span>
                <span className="text-muted">{set.totalPoints} คะแนน</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ButtonLink
                className="w-full"
                href={`/teacher/question-sets/${set.id}`}
                variant="secondary"
              >
                <span className="inline-flex items-center gap-2">
                  <ListPlus size={18} />
                  จัดการคำถาม
                </span>
              </ButtonLink>
              {set.questionCount > 0 ? (
                <ButtonLink
                  className="w-full"
                  href={`/teacher/rooms/new?set=${encodeURIComponent(set.id)}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Play size={17} />
                    สร้างห้อง
                  </span>
                </ButtonLink>
              ) : (
                <span className="inline-flex h-11 w-full items-center justify-center rounded-md border border-dashed border-border bg-surface/60 px-3 text-xs font-medium text-muted">
                  เพิ่มคำถามก่อนสร้างห้อง
                </span>
              )}
            </div>
          </Panel>
        ))}

        {questionSets.length === 0 ? (
          <Panel className="md:col-span-2">
            <p className="text-sm text-muted">
              ยังไม่มีชุดคำถาม เริ่มจากสร้างชุดคำถามแรกก่อน
            </p>
          </Panel>
        ) : filtered.length === 0 ? (
          <Panel className="md:col-span-2">
            <p className="text-sm text-muted">
              ไม่พบชุดคำถามที่ตรงกับ &ldquo;{query.trim()}&rdquo;
            </p>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
