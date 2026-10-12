"use client";
import { useEffect, useState } from "react";
import { HERO_TYPES, spriteClip, type BossClip, type HeroClip } from "@/features/boss-raid/assets/manifest";
import "@/features/boss-raid/raid.css";
import readiness from "../../../../../public/assets/boss-raid/readiness.json";
import Image from "next/image";
import catalog from "@/features/boss-raid/assets/catalog.json";
export function AssetPreview() {
  const [actor, setActor] = useState<"boss" | typeof HERO_TYPES[number]>("boss"); const [clip, setClip] = useState<BossClip | HeroClip>("idle"); const [frame, setFrame] = useState(0); const [playing, setPlaying] = useState(true); const [flip, setFlip] = useState(false);
  const config = spriteClip(actor, clip);
  const dimensions=readiness.files.find(f=>f.key===`${actor}/${clip}`);
  const aspect=dimensions?dimensions.height/dimensions.width:1;
  useEffect(() => { if (!playing) return; const timer = setInterval(() => setFrame(f => (f + 1) % 16), 1000 / config.fps); return () => clearInterval(timer); }, [config.fps, playing]);
  return <main className="raid-dev"><h1>ตรวจ Sprite Sheet จริง</h1><p>16 เฟรม เรียงซ้ายไปขวา จากแถวบนลงล่าง · พื้นสีเข้มใช้ตรวจ alpha</p><div className="raid-dev-controls"><label>ตัวละคร <select value={actor} onChange={e => { setActor(e.target.value as typeof actor); setClip("idle"); }}>{["boss", ...HERO_TYPES].map(a => <option key={a}>{a}</option>)}</select></label><label>ท่า <select value={clip} onChange={e => { setClip(e.target.value as typeof clip); setFrame(0); }}>{(actor === "boss" ? Object.keys(catalog.bossClips) : catalog.heroClips).map(a => <option key={a}>{a}</option>)}</select></label><button onClick={() => setPlaying(!playing)}>{playing ? "หยุด" : "เล่น"}</button><label><input type="checkbox" checked={flip} onChange={e => setFlip(e.target.checked)} /> กลับด้าน</label><label>เฟรม <input type="range" min={0} max={15} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} /></label></div><p>{config.path} · {config.fps} fps · anchor {config.anchorX}/{config.anchorY} · เฟรม {frame + 1}/16</p><div style={{ width: 300, aspectRatio: `${1/aspect}`, maxWidth: "100%", backgroundColor: "#26304c", backgroundImage: `url("${config.path}")`, backgroundSize: "400% 400%", backgroundPosition: `${frame % 4 / 3 * 100}% ${Math.floor(frame / 4) / 3 * 100}%`, transform: flip ? "scaleX(-1)" : undefined }} role="img" aria-label={`เฟรม ${frame + 1}`} /><details><summary>แผ่นภาพต้นฉบับ</summary><Image unoptimized width={dimensions?.width??1024} height={dimensions?.height??1024} src={config.path} alt={`Sprite Sheet ${actor} ${clip}`} style={{ maxWidth: "100%", height: "auto", background: "#43516c" }} /></details></main>;
}
