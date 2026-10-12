"use client";
import { Check } from "lucide-react";
import { HERO_NAMES, HERO_TYPES, spriteClip } from "../assets/manifest";
import type { RaidHero } from "../types";
export function HeroSelectLobby({own,heroes,pending,choose,allowDuplicates=true}:{own:RaidHero|null;heroes:RaidHero[];pending:boolean;choose:(hero:string)=>void;allowDuplicates?:boolean}) {
 return <section className="raid-lobby"><h2>เลือกฮีโร่ของคุณ</h2><p>{allowDuplicates?"เลือกตัวที่ชอบได้เลย สมาชิกทีมเลือกตัวละครซ้ำกันได้":"ห้องกติกาเดิมใช้ฮีโร่ไม่ซ้ำกัน"} ถ้ายังไม่ได้เลือก ระบบจะจัดให้เมื่อครูเริ่มเกม</p><div className="raid-hero-picker" data-has-selection={Boolean(own?.heroType)}>{HERO_TYPES.map(type=>{
  const taken=!allowDuplicates&&heroes.find(h=>h.heroType===type&&h.id!==own?.id),selected=own?.heroType===type;
  return <button key={type} type="button" disabled={pending||Boolean(taken)} aria-pressed={selected} onClick={()=>choose(type)}>
   <span className="raid-hero-portrait" style={{backgroundImage:`url(${spriteClip(type,"idle").path})`}} aria-hidden="true"/>
   <strong>{HERO_NAMES[type]}</strong><small>{taken?`${taken.displayName} เลือกแล้ว`:selected?<><Check size={14} aria-hidden="true"/>คุณเลือกตัวนี้</>:"เลือกฮีโร่"}</small>
  </button>;
 })}</div><p className="raid-lobby-status" role="status">{pending?"กำลังบันทึกฮีโร่…":"รอครูเริ่มเกม ทุกคนจะได้เวลารวมเท่ากัน"}</p></section>;
}
