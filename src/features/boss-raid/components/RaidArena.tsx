"use client";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { useEffect, useRef, useState } from "react";
import type { CombatScene, SceneOptions } from "../engine/combat-scene";
import type { CueSink } from "../audio/cues";
import type { RaidEvent, RaidHero } from "../types";
import { bossName, resolveBossType, type BossType } from "../assets/boss-definitions";
import { HERO_NAMES } from "../assets/manifest";
import "../raid.css";

export function RaidArena({ heroes, bossType:bossTypeInput, bossHp, bossMaxHp, events = [], reduced = false, quality = "full", effectsEnabled = true, sceneOptions, onCue, onScene }: { heroes: RaidHero[]; bossType?:BossType; bossHp: number; bossMaxHp: number; events?: RaidEvent[]; reduced?: boolean; quality?: "full" | "low"; effectsEnabled?: boolean; sceneOptions?: SceneOptions; onCue?: CueSink; onScene?:(scene:CombatScene|null)=>void }) {
  const bossType=resolveBossType(bossTypeInput);
  const host = useRef<HTMLDivElement>(null); const scene = useRef<CombatScene | null>(null); const latest = useRef({ heroes, bossHp, events });
  const [error, setError] = useState(""); const [readyKey, setReadyKey] = useState("");
  const membership = heroes.filter(h => h.eligible && h.heroType).map(h => `${h.id}:${h.heroType}`).join("|");
  const sceneKey = `${bossType}|${membership}|${reduced}|${quality}|${effectsEnabled}`;
  const ready = readyKey === sceneKey;
  const cueRef=useRef(onCue);const sceneRef=useRef(onScene);
  const optionsRef=useRef(sceneOptions);
  useEffect(()=>{optionsRef.current=sceneOptions;scene.current?.configure(sceneOptions);},[sceneOptions]);
  useEffect(()=>{cueRef.current=onCue;sceneRef.current=onScene;},[onCue,onScene]);
  useEffect(() => { latest.current = { heroes, bossHp, events }; scene.current?.update(heroes, bossHp, events); }, [heroes, bossHp, events]);
  useEffect(() => {
    let cancelled = false; let current: CombatScene | null = null;
    void import("../engine/combat-scene").then(async ({ CombatScene: Scene }) => {
      if (cancelled || !host.current) return;
      setError("");
      current = new Scene(host.current, reduced || matchMedia("(prefers-reduced-motion: reduce)").matches, quality, setError, effectsEnabled,optionsRef.current, cue=>cueRef.current?.(cue),bossType);
      scene.current = current; await current.init(latest.current.heroes, latest.current.bossHp);
      if (!cancelled) { current.update(latest.current.heroes, latest.current.bossHp, []); setReadyKey(sceneKey);sceneRef.current?.(current); }
    }).catch(() => { if (!cancelled) setError("เครื่องนี้เปิดฉากต่อสู้ไม่ได้ คุณยังตอบคำถามและดู HP ได้ตามปกติ"); });
    return () => { cancelled = true; current?.destroy(); scene.current = null;sceneRef.current?.(null); };
  }, [membership, reduced, quality, effectsEnabled, sceneKey,bossType]);
  const members = heroes.filter(h => h.eligible && h.heroType);
  return <section className="raid-arena" aria-label="ฉากต่อสู้บอส">
    <div className="raid-stage" ref={host} data-testid="raid-stage" data-boss-type={bossType}><div className="raid-effects" aria-hidden="true" /></div>
    <div className="raid-boss-hud"><strong>{bossHp === 0 ? "ปราบบอสสำเร็จ"  : bossName(bossType)}</strong><progress value={bossHp} max={Math.max(1, bossMaxHp)} aria-label="HP บอส" /><span>{bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()}</span></div>
    <div className="raid-hero-hud" style={{ gridTemplateColumns: `repeat(${Math.max(1, members.length)}, minmax(0,1fr))` }}>{members.map(hero => <div key={hero.id} data-health={hero.hp===0?"knocked-out":hero.hp<=30?"critical":hero.hp<=60?"injured":"healthy"}><strong title={hero.displayName}>{hero.displayName}</strong><progress value={hero.hp} max={100} aria-label={`HP ${hero.displayName}`} /><small><span className="raid-hud-detail">{hero.heroType ? HERO_NAMES[hero.heroType] : "ยังไม่เลือก"} · </span>HP {hero.hp}<span className="raid-hud-detail">/100</span>{hero.hp===0&&<span className="raid-health-status">ฟื้นเพื่อนได้</span>}</small></div>)}</div>
    {error ? <p className="raid-scene-notice" role="status">{error}</p> : !ready ? <div className="raid-scene-loading"><LoadingIndicator label="กำลังโหลดฉากต่อสู้…"/></div> : null}
  </section>;
}
