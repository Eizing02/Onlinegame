"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RaidEvent, RaidHero, RaidStatus } from "../types";
import { RaidSoundManager } from "../audio/sound-manager";
import { heroSound, type AudioCue, type SoundId } from "../audio/cues";
type Options={sourceTeamId?:string;eventSeq?:number;status?:RaidStatus;phase?:number;deadline?:string|null;serverNow?:string;heroes?:RaidHero[]};
export function useRaidAudio(events:RaidEvent[],teamId?:string,options:Options={}){
 const manager=useRef<RaidSoundManager|null>(null);const activeTeam=useRef<string|null>(null);const highest=useRef(0);const [muted,setMuted]=useState(true);const [warning,setWarning]=useState('');const [master,setMaster]=useState(.65),[sfx,setSfx]=useState(.7),[music,setMusic]=useState(.22);
 useEffect(()=>{const audio=new RaidSoundManager(setWarning);manager.current=audio;return()=>{audio.destroy();manager.current=null;};},[]);
 useEffect(()=>{highest.current=Math.max(options.eventSeq??0,...events.map(e=>e.seq),0);},[events,options.eventSeq]);
 useEffect(()=>{const audio=manager.current;if(!audio)return;if(options.sourceTeamId&&options.sourceTeamId!==teamId){activeTeam.current=null;audio.pause(highest.current);return;}if(activeTeam.current!==teamId){activeTeam.current=teamId??'';audio.setTeam(teamId??'',options.eventSeq??Math.max(...events.map(e=>e.seq),0));audio.resume();}},[teamId,options.sourceTeamId,options.eventSeq,events]);
 useEffect(()=>{manager.current?.setVolumes(master,sfx,music);},[master,sfx,music]);
 useEffect(()=>{manager.current?.setMusic(options.status==='ended'?null:options.status==='lobby'?'raid_lobby':(options.phase??1)>=3?'raid_final_phase':'raid_battle');},[options.status,options.phase,teamId,options.sourceTeamId]);
 useEffect(()=>{const pause=()=>manager.current?.pause(highest.current),resume=()=>{if(!document.hidden&&activeTeam.current===teamId)manager.current?.resume();};const visibility=()=>document.hidden?pause():resume();document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',pause);window.addEventListener('focus',resume);return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',pause);window.removeEventListener('focus',resume);};},[teamId]);
 useEffect(()=>{if(!options.deadline||options.status!=='running')return;const remaining=Date.parse(options.deadline)-Date.parse(options.serverNow??new Date().toISOString()),started=performance.now();const check=()=>{const ms=remaining-(performance.now()-started);if(ms>0&&ms<=10000)manager.current?.cue({sound:'countdown',seq:0,cueId:`countdown:${options.deadline}`});if(ms<=0)manager.current?.setMusic(null);};check();const timer=setInterval(check,500);return()=>clearInterval(timer);},[options.deadline,options.serverNow,options.status]);
 const toggle=async()=>{const audio=manager.current;if(!audio)return;if(!muted){await audio.setMuted(true);setMuted(true);return;}const ready=await audio.unlock();if(!ready)return;setMuted(false);const ids:SoundId[]=['hit','heal','death','victory','countdown'];for(const h of options.heroes??[])if(h.heroType)for(const clip of ['attack_1','attack_2'] as const){const sound=heroSound(h.heroType,clip);if(sound)ids.push(sound);}void audio.prepare([...new Set(ids)]);};
 const cue=useCallback((input:AudioCue)=>{if(activeTeam.current===(teamId??''))manager.current?.cue(input);},[teamId]);
 return {muted,toggle,warning,master,sfx,music,setMaster,setSfx,setMusic,cue,button:()=>manager.current?.button(),inspect:()=>manager.current?.metrics()};
}
export type RaidAudioControls=ReturnType<typeof useRaidAudio>;
