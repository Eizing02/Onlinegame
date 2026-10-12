"use client";
import { useState } from "react";
import { RaidArena } from "@/features/boss-raid/components/RaidArena";
import { HERO_TYPES } from "@/features/boss-raid/assets/manifest";
import type { RaidEvent, RaidHero } from "@/features/boss-raid/types";
export function RaidDemo() {
  const [count, setCount] = useState(5); const [events, setEvents] = useState<RaidEvent[]>([]); const [reduced, setReduced] = useState(false);
  const heroes: RaidHero[] = HERO_TYPES.slice(0, count).map((heroType, i) => ({ id: String(i), displayName: `ผู้เล่นทดสอบ ${i + 1}`, heroType, hp: 100, score: 0, cursor: 0, eligible: true, correctCount: 0, finished: false }));
  function send(type: RaidEvent["type"]) { setEvents(current => [...current, { seq: current.length + 1, type, actorId: "0", targetId: "1", damage: 100, heal: 10, heroHp: 85, bossHp: 650, phase: 3, createdAt: new Date().toISOString() }]); }
  return <main className="raid-dev"><h1>ทดลองฉาก Boss Raid</h1><p>ข้อมูลจำลองสำหรับนักพัฒนา ไม่บันทึกคะแนนหรือเชื่อมฐานข้อมูล</p><div className="raid-dev-controls"><label>สมาชิก <select value={count} onChange={e => setCount(Number(e.target.value))}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>{(["hero_attack","hero_hit","heal","boss_defeated","raid_ended"] as const).map(type => <button key={type} onClick={() => send(type)}>{type}</button>)}<label><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)} /> ลดการเคลื่อนไหว</label><a href="/dev/boss-raid/assets">ตรวจทุกท่าและเฟรม</a></div><RaidArena heroes={heroes} bossHp={events.some(e => e.type === "boss_defeated") ? 0 : 750} bossMaxHp={750} events={events} reduced={reduced} /></main>;
}
