"use client";
import { LoadingForm } from "@/components/ui/loading-form";
import { useState } from "react";
import Link from "next/link";
import { GameRules } from "@/components/game/game-rules";
import { createRoomAction } from "@/app/teacher/actions";
import { recommendedMinutes } from "../rules/rules-v1";
type SetSummary = { id: string; title: string; questionCount: number };
export function RaidRoomForm({ sets, canCreate, raidAvailable }: { sets: SetSummary[]; canCreate: boolean; raidAvailable: boolean }) {
 const [mode,setMode]=useState("classic"); const [setId,setSetId]=useState(sets.find(s=>s.questionCount>0)?.id ?? "");
 const [minutes,setMinutes]=useState(recommendedMinutes(sets.find(s=>s.id===setId)?.questionCount ?? 1));
 const raid=mode==="boss_raid";
 return <LoadingForm loadingLabel="กำลังสร้างห้องเกม…" action={createRoomAction} className="raid-room-form">
  <fieldset className="raid-mode-choice"><legend>รูปแบบเกม</legend>
   <label><input type="radio" name="game_mode" value="classic" checked={!raid} onChange={()=>setMode("classic")}/><span><strong>Classic</strong><small>ครูเปิดคำถามและเฉลยพร้อมกันทั้งห้อง</small></span></label>
   {raidAvailable&&<label><input type="radio" name="game_mode" value="boss_raid" checked={raid} onChange={()=>setMode("boss_raid")}/><span><strong>Boss Raid · Time Attack</strong><small>ตอบตามจังหวะของตัวเอง ร่วมทีมปราบบอส</small></span></label>}
  </fieldset>
  {!raid&&<div className="raid-classic-rules"><GameRules/></div>}
  <label>ชุดคำถาม<select name="question_set_id" value={setId} disabled={!canCreate} required onChange={e=>{setSetId(e.target.value);setMinutes(recommendedMinutes(sets.find(s=>s.id===e.target.value)?.questionCount??1));}}>{sets.map(s=><option key={s.id} value={s.id} disabled={!s.questionCount}>{s.title} ({s.questionCount} ข้อ)</option>)}</select></label>
  <label>ชื่อกิจกรรม<input name="activity_name" placeholder="กิจกรรมท้ายคาบ" maxLength={80}/></label>
  <label>{raid?"จำนวนทีม":"จำนวนกลุ่ม"}<input name="team_count" type="number" min={1} max={12} defaultValue={4} required/></label>
  <label>{raid?"จำนวนคนต่อทีม":"จำนวนคนต่อกลุ่ม"}<input key={mode} name="max_members_per_team" type="number" min={1} max={raid?5:12} defaultValue={5} required/></label>
  {raid && <><label>เวลารวม (นาที)<input name="raid_minutes" type="number" min={1} max={60} value={minutes} onChange={e=>setMinutes(Number(e.target.value))} required/><small>แนะนำ {recommendedMinutes(sets.find(s=>s.id===setId)?.questionCount??1)} นาที · ไม่มีเวลารายข้อ · ต่อสู้ 3 วินาทีต่อคำตอบ</small></label>
   <label className="raid-check"><input name="raid_visibility" type="checkbox" defaultChecked/>เตือนเมื่อออกจากหน้าเกมเกิน 3 วินาที</label>
   <div className="raid-form-note"><strong>กติกา Boss Raid</strong><p>เลือกตัวละครซ้ำได้ · ฮีโร่ HP 100 · ตอบถูกได้คะแนนเดิมและโจมตี 10 × คะแนนข้อ ตอบผิดเสีย HP · เมื่อ HP 0 ตอบถูกเพื่อฟื้นเพื่อน คะแนนเฉลี่ยหารด้วยจำนวนผู้เล่นที่ล็อกไว้ตอนเริ่ม พร้อมอันดับปราบบอสเร็วที่สุดแยกกัน</p><p>ทุกคนได้คำถามครบชุด แต่ลำดับและตัวเลือกสุ่มแยกกัน ควรใช้คำถามที่ตอบแยกกันได้ ไม่อ้างอิงข้อก่อนหน้า หากเปิดการเตือน ออกจากหน้าเกิน 3 วินาทีครั้งที่ 3 ในข้อเดิมจะข้ามข้อนั้นโดยไม่เสีย HP การตรวจนี้อาจเกิดจากการรบกวนของเครื่อง ครูดูรายงานทบทวนได้</p></div></>}
  <div className="raid-form-actions"><button className="raid-primary" disabled={!canCreate} type="submit">{raid?"สร้างห้อง Boss Raid":"สร้างห้องเกม"}</button><Link href="/teacher/question-sets">กลับไปจัดการชุดคำถาม</Link></div>
 </LoadingForm>;
}
