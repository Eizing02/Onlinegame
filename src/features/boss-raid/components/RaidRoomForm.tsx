"use client";
import { LoadingForm } from "@/components/ui/loading-form";
import { useState } from "react";
import Link from "next/link";
import { GameRules } from "@/components/game/game-rules";
import { createRoomAction } from "@/app/teacher/actions";
import { recommendedMinutes } from "../rules/rules-v1";

type SetSummary = { id: string; title: string; questionCount: number };

export function RaidRoomForm({
  sets,
  canCreate,
  raidAvailable,
  initialSetId,
}: {
  sets: SetSummary[];
  canCreate: boolean;
  raidAvailable: boolean;
  initialSetId?: string;
}) {
  const defaultSet =
    (initialSetId && sets.find((s) => s.id === initialSetId && s.questionCount > 0)) ||
    sets.find((s) => s.questionCount > 0);
  const [mode, setMode] = useState("classic");
  const [setId, setSetId] = useState(defaultSet?.id ?? "");
  const [minutes, setMinutes] = useState(
    recommendedMinutes(defaultSet?.questionCount ?? 1),
  );
  const raid = mode === "boss_raid";

  return (
    <LoadingForm
      loadingLabel="กำลังสร้างห้องเกม…"
      action={createRoomAction}
      className="raid-room-form"
    >
      <fieldset className="raid-mode-choice">
        <legend>รูปแบบเกม</legend>
        <label>
          <input
            type="radio"
            name="game_mode"
            value="classic"
            checked={!raid}
            onChange={() => setMode("classic")}
          />
          <span>
            <strong>Classic</strong>
            <small>ครูเปิดคำถามและเฉลยพร้อมกันทั้งห้อง</small>
          </span>
        </label>
        {raidAvailable && (
          <label>
            <input
              type="radio"
              name="game_mode"
              value="boss_raid"
              checked={raid}
              onChange={() => setMode("boss_raid")}
            />
            <span>
              <strong>Boss Raid · Time Attack</strong>
              <small>ตอบตามจังหวะของตัวเอง ร่วมทีมปราบบอส</small>
            </span>
          </label>
        )}
      </fieldset>
      {!raid && (
        <div className="raid-classic-rules">
          <GameRules />
        </div>
      )}
      <label>
        ชุดคำถาม
        <select
          name="question_set_id"
          value={setId}
          disabled={!canCreate}
          required
          onChange={(e) => {
            setSetId(e.target.value);
            setMinutes(
              recommendedMinutes(
                sets.find((s) => s.id === e.target.value)?.questionCount ?? 1,
              ),
            );
          }}
        >
          {sets.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.questionCount}>
              {s.title} ({s.questionCount} ข้อ)
            </option>
          ))}
        </select>
      </label>
      <label>
        ชื่อกิจกรรม
        <input name="activity_name" placeholder="กิจกรรมท้ายคาบ" maxLength={80} />
      </label>
      <label>
        จำนวนทีม
        <input name="team_count" type="number" min={1} max={12} defaultValue={4} required />
      </label>
      <label>
        จำนวนคนต่อทีม
        <input
          key={mode}
          name="max_members_per_team"
          type="number"
          min={1}
          max={raid ? 5 : 12}
          defaultValue={5}
          required
        />
      </label>
      {raid && (
        <>
          <label>
            เวลารวม (นาที)
            <input
              name="raid_minutes"
              type="number"
              min={1}
              max={60}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              required
            />
            <small>
              แนะนำ{" "}
              {recommendedMinutes(
                sets.find((s) => s.id === setId)?.questionCount ?? 1,
              )}{" "}
              นาที · ไม่มีเวลารายข้อ · ต่อสู้ 3 วินาทีต่อคำตอบ
            </small>
          </label>
          <label className="raid-check">
            <input name="raid_visibility" type="checkbox" defaultChecked />
            เตือนเมื่อออกจากหน้าเกมเกิน 3 วินาที
          </label>
          <div className="raid-form-note">
            <strong>กติกา Boss Raid</strong>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              <li>เลือกฮีโร่ซ้ำได้ · HP 100 · ตอบถูกทำดาเมจ 10×คะแนน ตอบผิดเสีย HP</li>
              <li>เมื่อ HP 0 ตอบถูกจะฟื้นพลังให้เพื่อน +10 HP (เล่นคนเดียวฟื้นตัวเอง)</li>
              <li>จัดอันดับแยก 2 ตาราง: คะแนนเฉลี่ยทีม และเวลาปราบบอสไวที่สุด</li>
            </ul>
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer font-semibold text-cyan">
                ดูรายละเอียดกติกาเพิ่มเติม
              </summary>
              <p className="mt-1">
                ทุกคนได้คำถามครบชุดโดยสุ่มลำดับและตัวเลือกแยกกัน ควรใช้คำถามที่ตอบแยกข้อได้ไม่อ้างอิงข้อก่อนหน้า
                หากเปิดการเตือนสลับหน้าจอ ออกจากหน้าเกิน 3 วินาทีครั้งที่ 3 ในข้อเดิมจะข้ามข้อนั้นโดยไม่เสีย HP
                ครูสามารถเปิดดูรายงานย้อนหลังได้
              </p>
            </details>
          </div>
        </>
      )}
      <div className="raid-form-actions">
        <button className="raid-primary" disabled={!canCreate} type="submit">
          {raid ? "สร้างห้อง Boss Raid" : "สร้างห้องเกม"}
        </button>
        <Link href="/teacher/question-sets">กลับไปจัดการชุดคำถาม</Link>
      </div>
    </LoadingForm>
  );
}
