"use client";
import { useEffect, useRef, useState } from "react";
import type { CombatScene } from "../engine/combat-scene";
import type { RaidEvent, RaidHero } from "../types";
import { HERO_NAMES } from "../assets/manifest";
import "../raid.css";

export function RaidArena({ heroes, bossHp, bossMaxHp, events = [], reduced = false, quality = "full" }: { heroes: RaidHero[]; bossHp: number; bossMaxHp: number; events?: RaidEvent[]; reduced?: boolean; quality?: "full" | "low" }) {
  const host = useRef<HTMLDivElement>(null); const scene = useRef<CombatScene | null>(null); const latest = useRef({ heroes, bossHp, events });
  const [error, setError] = useState(""); const [ready, setReady] = useState(false);
  const membership = heroes.filter(h => h.eligible && h.heroType).map(h => `${h.id}:${h.heroType}`).join("|");
  useEffect(() => { latest.current = { heroes, bossHp, events }; scene.current?.update(heroes, bossHp, events); }, [heroes, bossHp, events]);
  useEffect(() => {
    let cancelled = false; let current: CombatScene | null = null;
    void import("../engine/combat-scene").then(async ({ CombatScene: Scene }) => {
      if (cancelled || !host.current) return;
      current = new Scene(host.current, reduced || matchMedia("(prefers-reduced-motion: reduce)").matches, quality, setError);
      scene.current = current; await current.init(latest.current.heroes, latest.current.bossHp);
      if (!cancelled) { current.update(latest.current.heroes, latest.current.bossHp, []); setReady(true); }
    }).catch(() => { if (!cancelled) setError("เครื่องนี้เปิดฉากต่อสู้ไม่ได้ คุณยังตอบคำถามและดู HP ได้ตามปกติ"); });
    return () => { cancelled = true; current?.destroy(); scene.current = null; };
  }, [membership, reduced, quality]);
  const members = heroes.filter(h => h.eligible && h.heroType);
  return <section className="raid-arena" aria-label="ฉากต่อสู้บอส">
    <div className="raid-stage" ref={host} data-testid="raid-stage"><div className="raid-effects" aria-hidden="true" /></div>
    <div className="raid-boss-hud"><strong>{bossHp === 0 ? "ปราบบอสสำเร็จ" : "มังกรเงา"}</strong><progress value={bossHp} max={Math.max(1, bossMaxHp)} aria-label="HP บอส" /><span>{bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()}</span></div>
    <div className="raid-hero-hud" style={{ gridTemplateRows: `repeat(${Math.max(1, members.length)}, 1fr)` }}>{members.map(hero => <div key={hero.id}><strong title={hero.displayName}>{hero.displayName}</strong><progress value={hero.hp} max={100} aria-label={`HP ${hero.displayName}`} /><small>{hero.heroType ? HERO_NAMES[hero.heroType] : "ยังไม่เลือก"} · HP {hero.hp}/100{hero.hp === 0 ? " · ช่วยฟื้นเพื่อนได้" : ""}</small></div>)}</div>
    {error ? <p className="raid-scene-notice" role="status">{error}</p> : !ready ? <p className="raid-scene-notice" role="status">กำลังโหลดฉากต่อสู้…</p> : null}
  </section>;
}
