"use client";
import { HERO_NAMES, HERO_TYPES, spriteClip } from "../assets/manifest";
import type { RaidHero } from "../types";
export function HeroSelectLobby({own,heroes,pending,choose}:{own:RaidHero|null;heroes:RaidHero[];pending:boolean;choose:(hero:string)=>void}) {
 return <section className="raid-lobby"><h2>เลือกฮีโร่ของคุณ</h2><p>ทีมเดียวกันใช้ฮีโร่ไม่ซ้ำกัน ถ้ายังไม่ได้เลือก ระบบจะจัดให้เมื่อครูเริ่มเกม</p><div className="raid-hero-picker">{HERO_TYPES.map(type=>{
  const taken=heroes.find(h=>h.heroType===type && h.id!==own?.id);return <button key={type} type="button" disabled={pending||Boolean(taken)} aria-pressed={own?.heroType===type} onClick={()=>choose(type)}>
   {/* A cropped frame uses the supplied raster, not an invented illustration. */}
   <span className="raid-hero-portrait" style={{backgroundImage:`url(${spriteClip(type,"idle").path})`}} aria-hidden="true"/>
   <strong>{HERO_NAMES[type]}</strong><small>{taken?`${taken.displayName} เลือกแล้ว`:own?.heroType===type?"คุณเลือกตัวนี้":"เลือกฮีโร่"}</small>
  </button>;
 })}</div><p className="raid-lobby-status" role="status">{pending?"กำลังจองฮีโร่…":"รอครูเริ่มเกม ทุกคนจะได้เวลารวมเท่ากัน"}</p></section>;
}
