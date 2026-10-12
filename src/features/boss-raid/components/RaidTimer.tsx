"use client";
import { Clock } from "lucide-react";
import { useRaidClock } from "../hooks/use-raid-clock";
export function RaidTimer({deadline,serverNow,ended=false}:{deadline:string|null;serverNow:string;ended?:boolean}) {
 const {seconds}=useRaidClock(deadline,serverNow,ended);
 return <div className="raid-timer" data-urgent={Boolean(deadline)&&seconds>0&&seconds<=30} data-expired={Boolean(deadline)&&seconds===0} aria-label={`เวลารวมเหลือ ${Math.floor(seconds/60)} นาที ${seconds%60} วินาที`}><span><Clock size={13} aria-hidden="true"/>เวลารวม</span><strong>{deadline?`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`:"รอเริ่ม"}</strong>{seconds>0&&seconds<=30&&<span className="raid-time-warning">30 วินาทีสุดท้าย</span>}</div>;
}
