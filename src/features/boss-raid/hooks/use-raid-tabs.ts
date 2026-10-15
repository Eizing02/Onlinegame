"use client";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
export function useRaidTabs(ids:string[], initial:string) {
 const [selection,setSelection]=useState({tab:initial,direction:1}); const {tab,direction}=selection;
 const key=ids.join("|"); const panelRef=useRef<HTMLDivElement>(null);
 const setTab=useCallback((next:string)=>setSelection(current=>current.tab===next?current:{tab:next,direction:key.split("|").indexOf(next)>=key.split("|").indexOf(current.tab)?1:-1}),[key]);
 const touch=useRef<{x:number;y:number}|null>(null);
 useEffect(()=>{const panel=panelRef.current;if(!panel||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const animation=panel.animate([{transform:`translateX(${direction*24}px)`,opacity:.72},{transform:'translateX(0)',opacity:1}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});return()=>animation.cancel();},[tab,direction]);
 const onTouchStart=(e:TouchEvent)=>{if((e.target as HTMLElement).closest('button,input,select,textarea,a,dialog')||e.touches.length!==1){touch.current=null;return;}touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};};
 const onTouchEnd=(e:TouchEvent)=>{const start=touch.current;touch.current=null;if(!start||!e.changedTouches[0])return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return;const index=ids.indexOf(tab);setTab(ids[Math.max(0,Math.min(ids.length-1,index+(dx<0?1:-1)))]);};
 return {tab,setTab,panelRef,swipe:{onTouchStart,onTouchEnd,onTouchCancel:()=>{touch.current=null;}}};
}
