"use client";
import { useEffect, useRef } from "react";
import { qualifiedLeave } from "../rules/rules-v1";
import type { RaidQuestion } from "../types";
export function useRaidVisibility(question: RaidQuestion|null, active: boolean, report: (input:{questionId:string;displayIndex:number;eventId:string;durationMs:number})=>void) {
 const current=useRef(report);useEffect(()=>{current.current=report;},[report]);
 const questionId=question?.id;const displayIndex=question?.displayIndex;
 useEffect(()=>{
  if(!active||!questionId||displayIndex===undefined)return;
  let hidden: {at:number;id:string}|null=null;
  const handle=()=>{
   if(document.hidden){hidden={at:performance.now(),id:crypto.randomUUID()};return;}
   if(!hidden)return;const durationMs=Math.floor(performance.now()-hidden.at);const eventId=hidden.id;hidden=null;
   if(qualifiedLeave(durationMs))current.current({questionId,displayIndex,eventId,durationMs});
  };
  document.addEventListener("visibilitychange",handle);return()=>{hidden=null;document.removeEventListener("visibilitychange",handle);};
 },[active,questionId,displayIndex]);
}
