"use client";
import { ChevronDown, Users } from "lucide-react";
import { HERO_NAMES, spriteClip } from "../assets/manifest";
import type { RaidHero } from "../types";
import { RaidTimer } from "./RaidTimer";

export function RaidStudentHud({heroes,ownId,deadline,serverNow,ended=false,open,onToggle,id}:{heroes:RaidHero[];ownId?:string;deadline:string|null;serverNow:string;ended?:boolean;open:boolean;onToggle:()=>void;id:string}) {
 return <div className="raid-student-hud">
  <RaidTimer deadline={deadline} serverNow={serverNow} ended={ended}/>
  <div className="raid-party">
   <button type="button" className="raid-party-toggle" aria-expanded={open} aria-controls={id} onClick={onToggle}><Users size={17} aria-hidden="true"/><span>ปาร์ตี้ · {heroes.length} คน</span><ChevronDown size={16} aria-hidden="true"/></button>
   {open&&<section id={id} className="raid-party-list" aria-label="สมาชิกปาร์ตี้ของทีมคุณ"><h3>สมาชิกในทีม</h3><ul>{heroes.map(h=><li key={h.id} data-own={h.id===ownId}>
    {h.heroType&&<span className="raid-party-portrait" style={{backgroundImage:`url(${spriteClip(h.heroType,"idle").path})`}} aria-hidden="true"/>}
    <div><strong>{h.displayName}{h.id===ownId&&<small> · คุณ</small>}</strong><span>{h.heroType?HERO_NAMES[h.heroType]:"ยังไม่เลือกตัวละคร"} · HP {h.hp}</span></div>
   </li>)}</ul>{!heroes.length&&<p>ยังไม่มีผู้เล่นในทีม</p>}</section>}
  </div>
 </div>;
}
