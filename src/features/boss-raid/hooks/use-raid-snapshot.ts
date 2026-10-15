"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RaidSnapshot } from "../types";
export function useRaidSnapshot(initial: RaidSnapshot, sessionId: string, teacher=false) {
 const [snapshot,setSnapshot]=useState(initial);const [foreground,setForeground]=useState(false);const foregroundTask=useRef<Promise<void>|null>(null);const [error,setError]=useState("");const [connected,setConnected]=useState(true);
 const [teamId,setTeamId]=useState(initial.team?.id ?? ""); const latest=useRef(initial);const selected=useRef(teamId);const inFlight=useRef<Promise<void>|null>(null);const abort=useRef<AbortController|null>(null);const failures=useRef(0);
 const wakePoll=useRef<()=>void>(()=>{});
 const refresh=useCallback(async()=>{
  if(inFlight.current) return inFlight.current;
  const task=(async()=>{
   const controller=new AbortController();abort.current=controller;const selectedTeam=selected.current;
   const current=latest.current;const after=current.team?.id===selectedTeam ? current.team.eventSeq : 0;
   const path=teacher?`/api/teacher/raid/${initial.roomCode}/overview`:`/api/raid/${initial.roomCode}/snapshot`;
   try {
    const response=await fetch(`${path}?after=${after}${teacher?`&team=${selectedTeam}`:""}`,{cache:"no-store",headers:{"x-client-session":sessionId},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
    const data=await response.json();
    if(!response.ok) {if(data.redirectTo && [401,403,409].includes(response.status)) location.assign(data.redirectTo);throw new Error(data.error??"โหลดสถานะไม่สำเร็จ");}
    if(selectedTeam!==selected.current) return;
    const next=data as RaidSnapshot;
    // Full state always reconciles gaps; drop historical/bounded bursts instead of replaying them.
    if(next.team && (next.team.id!==current.team?.id || (next.team.events[0] && next.team.events[0].seq!==after+1) || next.team.events.length>20)) next.team.events=[];
    latest.current=next;setSnapshot(next);setError("");setConnected(true);const recovered=failures.current>0;failures.current=0;if(recovered)queueMicrotask(()=>wakePoll.current());
   } catch(e) {if(!controller.signal.aborted){setConnected(false);failures.current++;setError(e instanceof Error?e.message:"การเชื่อมต่อขาดหาย กดเชื่อมต่ออีกครั้ง");}}
  })();inFlight.current=task;try{await task;}finally{inFlight.current=null;}
 },[initial.roomCode,sessionId,teacher]);
 const refreshForeground=useCallback(()=>{if(foregroundTask.current)return foregroundTask.current;setForeground(true);const task=refresh().finally(()=>{foregroundTask.current=null;setForeground(false);});foregroundTask.current=task;return task;},[refresh]);
 const selectTeam=useCallback((id:string)=>{selected.current=id;setTeamId(id);abort.current?.abort();},[]);
 useEffect(()=>{let alive=true;let timer:ReturnType<typeof setTimeout>;let generation=0;
  const loop=async(token:number)=>{if(!alive||token!==generation)return;if(!document.hidden)await refresh();if(alive&&token===generation)timer=setTimeout(()=>void loop(token),document.hidden?5000:latest.current.status==="ended"?15000:Math.min(10000,(teacher?1500:2000)*2**Math.min(3,failures.current)) + Math.random()*250);};
  const visible=()=>{if(!document.hidden){clearTimeout(timer);void loop(++generation);}};
  wakePoll.current=visible;
  const online=()=>void visible();document.addEventListener("visibilitychange",visible);window.addEventListener("online",online);void loop(generation);
  return()=>{alive=false;wakePoll.current=()=>{};generation++;clearTimeout(timer);abort.current?.abort();document.removeEventListener("visibilitychange",visible);window.removeEventListener("online",online);};
 },[refresh,teamId,teacher]);
 const getCurrent=useCallback(()=>latest.current,[]);
 return {snapshot,error,connected,refresh,refreshForeground,foreground,teamId,selectTeam,getCurrent};
}
