"use client";
import { useRef, useState, type TouchEvent } from "react";
export function useRaidTabs(ids:string[], initial:string) {
 const [tab,setTab]=useState(initial);const touch=useRef<{x:number;y:number}|null>(null);
 const onTouchStart=(e:TouchEvent)=>{if((e.target as HTMLElement).closest('button,input,select,textarea,a')||e.touches.length!==1){touch.current=null;return;}touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};};
 const onTouchEnd=(e:TouchEvent)=>{const start=touch.current;touch.current=null;if(!start||!e.changedTouches[0])return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return;const index=ids.indexOf(tab);setTab(ids[Math.max(0,Math.min(ids.length-1,index+(dx<0?1:-1)))]);};
 return {tab,setTab,swipe:{onTouchStart,onTouchEnd}};
}
