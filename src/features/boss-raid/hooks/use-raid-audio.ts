"use client";
import { useEffect, useRef, useState } from "react";
import type { RaidEvent } from "../types";
// Generated interface tones: no autoplay, media downloads or background music.
export function useRaidAudio(events: RaidEvent[], teamId?: string) {
 const context=useRef<AudioContext|null>(null);const [muted,setMuted]=useState(true);const sequence=useRef(0);const previousTeam=useRef(teamId);const last=useRef(0);
 const toggle=async()=>{
  if(!muted){setMuted(true);await context.current?.suspend();return;}
  try{context.current??=new AudioContext();await context.current.resume();setMuted(false);}catch{setMuted(true);}
 };
 useEffect(()=>{
  if(previousTeam.current!==teamId){sequence.current=0;previousTeam.current=teamId;}
  const fresh=events.filter(e=>e.seq>sequence.current);if(fresh.length)sequence.current=fresh[fresh.length-1].seq;
  const audio=context.current;if(muted||document.hidden||!audio||!fresh.length||performance.now()-last.current<350)return;
  last.current=performance.now();const event=fresh[fresh.length-1];const notes=event.type==="boss_defeated"?[523,659,784]:[event.type==="hero_hit"?110:event.type==="heal"?660:440];
  notes.forEach((frequency,i)=>{const start=audio.currentTime+i*.09;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type="sine";oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.18);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.2);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};});
 },[events,muted,teamId]);
 useEffect(()=>{const visibility=()=>{if(document.hidden)void context.current?.suspend();else if(!muted)void context.current?.resume();};document.addEventListener("visibilitychange",visibility);return()=>document.removeEventListener("visibilitychange",visibility);},[muted]);
 useEffect(()=>()=>{void context.current?.close();},[]);
 return {muted,toggle};
}
