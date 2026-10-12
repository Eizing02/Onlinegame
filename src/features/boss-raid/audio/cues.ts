import registry from "./registry.json";
import type { HeroType, HeroClip, BossClip } from "../assets/manifest";
export type SoundId=keyof typeof registry.sounds;
export type MusicId=keyof typeof registry.music;
export type AudioCue={sound:SoundId;seq:number;cueId:string;pan?:number;delayMs?:number;animation?:string;frame?:number};
export type CueSink=(cue:AudioCue)=>void;
const heroSounds:Record<HeroType,[SoundId,SoundId]>={warrior:['warrior1','warrior2'],mage:['mage1','mage2'],wizard:['wizard1','wizard2'],witch:['witch1','witch2'],fairy:['fairy1','fairy2']};
export function heroSound(type:HeroType,clip:HeroClip):SoundId|null{return clip==='attack_1'?heroSounds[type][0]:clip==='attack_2'?heroSounds[type][1]:null;}
export function bossSound(clip:BossClip):SoundId|null{return ({attack_1:'claw',attack_2:'claw',breath:'fire',ultimate:'ultimate',death:'death',shield:'shield',victory_roar:'roar'} as Partial<Record<BossClip,SoundId>>)[clip]??null;}
export {registry as AUDIO_REGISTRY};
