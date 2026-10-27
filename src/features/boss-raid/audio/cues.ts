import registry from "./registry.json";
import type { HeroType, HeroClip, BossClip } from "../assets/manifest";
export type SoundId=keyof typeof registry.sounds;
export type MusicId=keyof typeof registry.music;
export type AudioCue={sound:SoundId;seq:number;cueId:string;pan?:number;delayMs?:number;animation?:string;frame?:number};
export type CueSink=(cue:AudioCue)=>void;
import { heroAttack } from "../assets/hero-definitions";
import { bossAttackSound, type BossType } from '../assets/boss-definitions';

export function heroSound(type:HeroType,clip:HeroClip):SoundId|null{return clip==='attack_1'||clip==='attack_2'?heroAttack(type,clip).sound:null;}
export function bossSound(clip:BossClip,bossType:BossType='shadow_dragon'):SoundId|null{return bossAttackSound(bossType,clip);}
export {registry as AUDIO_REGISTRY};
