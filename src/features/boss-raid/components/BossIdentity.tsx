"use client";
import Image from 'next/image';
import { useState } from 'react';
import { bossName, resolveBossType } from '../assets/boss-definitions';
export function BossIdentity({type,portrait=true}:{type?:unknown;portrait?:boolean}){
 const boss=resolveBossType(type),[failed,setFailed]=useState('');
 return <span className="raid-boss-identity">{portrait&&failed!==boss&&<Image src={`/assets/boss-raid/portraits/${boss}.png`} alt="" aria-hidden="true" width={28} height={28} unoptimized onError={()=>setFailed(boss)}/>}<span>{bossName(boss)}</span></span>;
}
