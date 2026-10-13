"use client";
import type { RaidHero } from "../types";
import { RaidTimer } from "./RaidTimer";
import { RaidPartyRoster } from "./RaidPartyRoster";

export function RaidStudentHud({heroes,ownId,deadline,serverNow,ended=false,open,onToggle,id}:{heroes:RaidHero[];ownId?:string;deadline:string|null;serverNow:string;ended?:boolean;open:boolean;onToggle:()=>void;id:string}) {
 return <div className="raid-student-hud">
  <RaidTimer deadline={deadline} serverNow={serverNow} ended={ended}/>
  <RaidPartyRoster heroes={heroes} ownId={ownId} open={open} onToggle={onToggle} id={id}/>
 </div>;
}
