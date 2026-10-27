import catalog from './catalog.json';
import type { BossClip } from './manifest';
import type { SoundId } from '../audio/cues';

export const BOSS_TYPES = ['shadow_dragon', 'stone_titan', 'crystal_scorpion'] as const;
export type BossType = typeof BOSS_TYPES[number];
export type BossEffectId = 'dragon-claw' | 'dragon-flame' | 'dragon-ultimate' |
 'titan-stone-fist' | 'titan-rune-wave' | 'titan-earth-burst' |
 'scorpion-crystal-claw' | 'scorpion-stinger-bolt' | 'scorpion-crystal-storm';
type BossDefinition = {
 name:string; folder:string; visualKey:string; visualScale:number; impactY:number;
 effects:{strike:BossEffectId;ranged:BossEffectId;ultimate:BossEffectId};
 sounds:Partial<Record<BossClip,SoundId>>;
};
const dragonSounds:Partial<Record<BossClip,SoundId>>={attack_1:'claw',attack_2:'claw',breath:'fire',ultimate:'ultimate',death:'death',shield:'shield',victory_roar:'roar'};
/** Presentation metadata only. Gameplay HP, damage, healing and scores stay in SQL. */
export const BOSS_DEFINITIONS:Record<BossType,BossDefinition>={
 shadow_dragon:{name:'มังกรเงา',folder:'boss',visualKey:'boss',visualScale:1,impactY:.5,
  effects:{strike:'dragon-claw',ranged:'dragon-flame',ultimate:'dragon-ultimate'},sounds:dragonSounds},
 stone_titan:{name:'ไททันศิลา',folder:'bosses/stone-titan',visualKey:'stone_titan',visualScale:1,impactY:.5,
  effects:{strike:'titan-stone-fist',ranged:'titan-rune-wave',ultimate:'titan-earth-burst'},
  sounds:{...dragonSounds,attack_1:'warrior2',attack_2:'claw',breath:'wizard2',ultimate:'ultimate'}},
 crystal_scorpion:{name:'แมงป่องผลึก',folder:'bosses/crystal-scorpion',visualKey:'crystal_scorpion',visualScale:1,impactY:.3,
  effects:{strike:'scorpion-crystal-claw',ranged:'scorpion-stinger-bolt',ultimate:'scorpion-crystal-storm'},
  sounds:{...dragonSounds,attack_1:'claw',attack_2:'witch1',breath:'witch2',ultimate:'ultimate'}},
};
export function resolveBossType(value:unknown):BossType{return typeof value==='string'&&(BOSS_TYPES as readonly string[]).includes(value)?value as BossType:'shadow_dragon';}
export const bossName=(value:unknown)=>BOSS_DEFINITIONS[resolveBossType(value)].name;
export const bossSpritePath=(type:BossType,clip:BossClip)=>`/assets/boss-raid/${BOSS_DEFINITIONS[type].folder}/${catalog.bossClips[clip]}.png`;
export const bossAttackEffect=(type:BossType,clip:BossClip)=>BOSS_DEFINITIONS[type].effects[clip==='ultimate'?'ultimate':clip==='breath'?'ranged':'strike'];
export const bossAttackSound=(type:BossType,clip:BossClip)=>BOSS_DEFINITIONS[type].sounds[clip]??null;
