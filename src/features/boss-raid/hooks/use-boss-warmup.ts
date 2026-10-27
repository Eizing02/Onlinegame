"use client";
import { useEffect } from 'react';
import { bossSpritePath, resolveBossType, type BossType } from '../assets/boss-definitions';
/** Low-priority network hints only for this team's opponent; no whole-catalog decode. */
export function useBossWarmup(type:BossType|undefined,lobby:boolean){
 useEffect(()=>{
  if(!lobby||!type)return;
  const boss=resolveBossType(type);
  const links=(['idle','attack_1'] as const).map(clip=>{
   const link=document.createElement('link');link.rel='prefetch';link.as='image';link.href=bossSpritePath(boss,clip);document.head.append(link);return link;
  });
  return()=>links.forEach(link=>link.remove());
 },[type,lobby]);
}
