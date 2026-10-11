"use client";
import { useEffect, useState } from "react";
export function RaidTimer({ deadline, serverNow, ended=false }: {deadline:string|null;serverNow:string;ended?:boolean}) {
 const [seconds,setSeconds]=useState(0);
 useEffect(()=>{const remaining=deadline?new Date(deadline).getTime()-new Date(serverNow).getTime():0;const start=performance.now();
  const update=()=>setSeconds(ended?0:Math.max(0,Math.ceil((remaining-(performance.now()-start))/1000)));update();const timer=setInterval(update,250);return()=>clearInterval(timer);
 },[deadline,serverNow,ended]);
 return <div className="raid-timer" data-urgent={deadline && seconds<=30} aria-label={`เวลารวมเหลือ ${Math.floor(seconds/60)} นาที ${seconds%60} วินาที`}><span>เวลารวม</span><strong>{deadline?`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`:"รอเริ่ม"}</strong></div>;
}
