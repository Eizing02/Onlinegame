"use client";
import type { RaidSnapshot } from "../types";
import { HERO_NAMES } from "../assets/manifest";
export function RaidTeamPanel({ snapshot, name, onName, onSave, pending }: { snapshot: RaidSnapshot; name: string; onName: (value: string) => void; onSave: () => void; pending: boolean }) {
 return <section className="raid-team-list"><h2>{snapshot.team?.name}</h2>
  {snapshot.canRenameTeam ? <form className="raid-team-rename" onSubmit={event => { event.preventDefault(); if (!pending) onSave(); }}><label htmlFor="raid-team-name">ชื่อทีม <span>หัวหน้าทีมแก้ไขได้ก่อนเริ่มเกม · 2–30 ตัวอักษร</span></label><div><input id="raid-team-name" value={name} minLength={2} maxLength={30} required disabled={pending} onChange={event => onName(event.target.value)}/><button className="raid-primary" type="submit" disabled={pending||name.trim().length<2}>บันทึกชื่อทีม</button></div></form> : <p>{snapshot.status === "lobby" ? "หัวหน้าทีมเปลี่ยนชื่อได้ที่แท็บนี้ก่อนครูเริ่มเกม" : "เกมเริ่มแล้ว ชื่อทีมถูกล็อกไว้จนจบเกม"}</p>}
  {snapshot.team?.heroes.map(h => <div className="raid-team-member" key={h.id}><strong>{h.displayName}{h.id===snapshot.captainId&&<small>หัวหน้าทีม</small>}</strong><span>{h.heroType?HERO_NAMES[h.heroType]:"รอเลือกตัวละคร"} · HP {h.hp}/100</span><span>{h.cursor}/{snapshot.questionCount} ข้อ · {h.score} คะแนน</span></div>)}
 </section>;
}
