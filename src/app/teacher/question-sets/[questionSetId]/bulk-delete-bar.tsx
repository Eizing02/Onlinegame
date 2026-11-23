"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function BulkDeleteBar() {
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const syncCount = () => {
      const checked = document.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][form="bulk-delete-questions"][name="question_ids"]:checked',
      ).length;
      setSelectedCount(checked);
    };

    syncCount();
    document.addEventListener("change", syncCount);
    return () => document.removeEventListener("change", syncCount);
  }, []);

  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-panel/70 p-4 sm:flex-row sm:items-center">
      <p className="text-sm text-muted">
        {selectedCount > 0 ? (
          <>
            เลือกไว้แล้ว{" "}
            <strong className="font-semibold text-foreground">
              {selectedCount} ข้อ
            </strong>
          </>
        ) : (
          "เลือกคำถามหลายข้อแล้วลบพร้อมกันได้"
        )}
      </p>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-danger bg-danger/10 px-3 text-sm font-semibold text-danger transition hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={selectedCount === 0}
        form="bulk-delete-questions"
        onClick={(event) => {
          if (
            selectedCount === 0 ||
            !window.confirm(
              `ลบคำถามที่เลือก ${selectedCount} ข้อ? การลบนี้ย้อนกลับไม่ได้`,
            )
          ) {
            event.preventDefault();
          }
        }}
        type="submit"
      >
        <Trash2 size={17} />
        {selectedCount > 0 ? `ลบที่เลือก (${selectedCount} ข้อ)` : "ลบข้อที่เลือก"}
      </button>
    </div>
  );
}
