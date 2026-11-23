"use client";

import { Download } from "lucide-react";

type ClassicCsvRow = {
  roomCode: string;
  teamName: string;
  displayName: string;
  studentCode: string;
  answeredCount: number;
  correctCount: number;
  rawScore: number;
  isScoreEligible: boolean;
};

export function ClassicCsvButton({
  roomCode,
  rows,
}: {
  roomCode: string;
  rows: ClassicCsvRow[];
}) {
  function handleDownload() {
    const cell = (value: unknown) =>
      `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
    const csvRows = [
      [
        "ห้อง",
        "ทีม",
        "นักเรียน",
        "รหัสนักเรียน",
        "ตอบแล้ว",
        "ตอบถูก",
        "คะแนนที่ทำได้",
        "สถานะ",
      ],
      ...rows.map((row) => [
        row.roomCode,
        row.teamName,
        row.displayName,
        row.studentCode,
        row.answeredCount,
        row.correctCount,
        row.rawScore,
        row.isScoreEligible ? "นับคะแนน" : "ไม่นับคะแนน",
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + csvRows.map((line) => line.map(cell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `classic-quiz-${roomCode}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
      disabled={rows.length === 0}
      onClick={handleDownload}
      type="button"
    >
      <Download size={17} aria-hidden="true" />
      ดาวน์โหลดสรุป CSV
    </button>
  );
}
