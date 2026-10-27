"use client";
import { useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_NAMES, LEGACY_HERO_TYPES, type HeroType } from "../assets/manifest";
import { HERO_DEFINITIONS } from "../assets/hero-definitions";
import { HeroPortrait } from "./HeroPortrait";
import type { RaidHero } from "../types";
export function HeroSelectLobby({own,heroes,pending,choose,allowDuplicates=true,availableHeroes=LEGACY_HERO_TYPES}:{own:RaidHero|null;heroes:RaidHero[];pending:boolean;choose:(hero:string)=>void;allowDuplicates?:boolean;availableHeroes?:readonly HeroType[]}) {
 const [page,setPage]=useState(()=>Math.max(0,Math.floor(availableHeroes.indexOf(own?.heroType as HeroType)/5)));
 const touch=useRef<{x:number;y:number}|null>(null);
 const groups=Array.from({length:Math.ceil(availableHeroes.length/5)},(_,i)=>availableHeroes.slice(i*5,i*5+5));
 const currentPage=Math.min(page,Math.max(0,groups.length-1));
 return <section className="raid-lobby raid-expanded-lobby"><div className="raid-hero-intro"><h2>เลือกฮีโร่ของคุณ</h2><p>{allowDuplicates?"เลือกซ้ำกันได้":"ห้องกติกาเดิมใช้ฮีโร่ไม่ซ้ำกัน"} · ทุกตัวใช้คะแนนและดาเมจเท่ากัน</p></div>
  {groups.length>1&&<nav className="raid-hero-pagination" aria-label="หน้าตัวละคร"><button type="button" aria-label="ตัวละครหน้าก่อน" disabled={currentPage===0||pending} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={20}/></button><span role="status">ตัวละคร {currentPage*5+1}–{Math.min((currentPage+1)*5,availableHeroes.length)} / {availableHeroes.length}</span><button type="button" aria-label="ตัวละครหน้าถัดไป" disabled={currentPage===groups.length-1||pending} onClick={()=>setPage(currentPage+1)}><ChevronRight size={20}/></button></nav>}
  <div className="raid-hero-pages" data-no-room-swipe tabIndex={0} role="region" aria-label="รายชื่อตัวละคร เลื่อนภายในได้" onKeyDown={e=>{if(groups.length<2||!["ArrowLeft","ArrowRight","Home","End"].includes(e.key)||pending)return;e.preventDefault();setPage(e.key==="Home"?0:e.key==="End"?groups.length-1:Math.max(0,Math.min(groups.length-1,currentPage+(e.key==="ArrowRight"?1:-1))));e.currentTarget.focus();}} onTouchStart={e=>{if(e.touches.length!==1){touch.current=null;return;}touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchCancel={()=>{touch.current=null;}} onTouchEnd={e=>{const start=touch.current;touch.current=null;if(!start||!e.changedTouches[0]||pending)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){e.preventDefault();setPage(Math.max(0,Math.min(groups.length-1,currentPage+(dx<0?1:-1))));}}}>
   {groups.map((group,index)=><div className="raid-hero-picker" data-page-active={currentPage===index} data-has-selection={Boolean(own?.heroType)} key={index}>{group.map(type=>{
    const taken=!allowDuplicates&&heroes.find(h=>h.heroType===type&&h.id!==own?.id),selected=own?.heroType===type;
    return <button key={type} type="button" disabled={pending||Boolean(taken)} aria-pressed={selected} onClick={()=>{setPage(index);choose(type);}}>
     <HeroPortrait hero={type} className="raid-hero-portrait"/><strong>{HERO_NAMES[type]}</strong><small>{taken?`${taken.displayName} เลือกแล้ว`:selected?<><Check size={14} aria-hidden="true"/>คุณเลือกตัวนี้</>:"เลือกฮีโร่"}</small>
    </button>;
   })}</div>)}
  </div>
  <div className="raid-hero-selection-summary" role="status" aria-live="polite"><strong>{pending?"กำลังบันทึกฮีโร่…":own?.heroType?`เลือก: ${HERO_NAMES[own.heroType]}`:"เลือกตัวละครที่ชอบได้เลย"}</strong><p>{own?.heroType?`${HERO_DEFINITIONS[own.heroType].attacks.attack_1.name} · ${HERO_DEFINITIONS[own.heroType].attacks.attack_2.name}`:"ถ้ายังไม่เลือก ระบบจะจัดให้เมื่อเริ่มเกม"}</p><small>รอครูเริ่มเกม · ทุกคนได้เวลารวมเท่ากัน</small></div>
 </section>;
}
