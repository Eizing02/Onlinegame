"use client";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { heroPortrait, type HeroType } from "../assets/manifest";
export function HeroPortrait({ hero, className = "" }: { hero: HeroType; className?: string }) {
 const [failedHero,setFailedHero]=useState<HeroType|null>(null);
 return <span className={`raid-character-portrait ${className}`} aria-hidden="true">{failedHero===hero?<UserRound size={30}/>:<Image src={heroPortrait(hero)} width={256} height={256} alt="" unoptimized draggable={false} onError={()=>setFailedHero(hero)}/>}</span>;
}
