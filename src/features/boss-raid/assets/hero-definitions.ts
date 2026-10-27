import type { HeroType, HeroClip } from "./manifest";
import type { SoundId } from "../audio/cues";
export type AttackClip = Extract<HeroClip, "attack_1" | "attack_2">;
export type HeroEffectId = "warrior-slash" | "mage-energy" | "wizard-fire" | "witch-curse" | "fairy-light" |
 "ranger-wind-arrow" | "ranger-storm" | "ninja-shadow-cut" | "ninja-moon-star" | "monk-dawn-fist" | "monk-sun-kick" |
 "engineer-gear-shot" | "engineer-core-blast" | "bard-lyre-wave" | "bard-star-song";
export type AttackStyle = { name: string; mode: "melee" | "projectile" | "spinning" | "pulse" | "cannon"; effect: HeroEffectId; sound: SoundId; color: number; impactFrame: number };
export type HeroDefinition = { slot: number; roster: 1 | 2; attacks: Record<AttackClip, AttackStyle> };
const attack=(name:string,mode:AttackStyle["mode"],effect:HeroEffectId,sound:SoundId,color=0xaec4d4):AttackStyle=>({name,mode,effect,sound,color,impactFrame:7});
/** Presentation only. Never contains HP, damage multipliers or scoring abilities. */
export const HERO_DEFINITIONS: Record<HeroType,HeroDefinition> = {
 warrior:{slot:0,roster:1,attacks:{attack_1:attack("ฟันดาบ","melee","warrior-slash","warrior1"),attack_2:attack("กระแทกโล่","melee","warrior-slash","warrior2")}},
 mage:{slot:1,roster:1,attacks:{attack_1:attack("ศรเวท","projectile","mage-energy","mage1"),attack_2:attack("ระเบิดเหมันต์","projectile","mage-energy","mage2")}},
 wizard:{slot:2,roster:1,attacks:{attack_1:attack("ลูกไฟ","projectile","wizard-fire","wizard1"),attack_2:attack("สายฟ้า","projectile","wizard-fire","wizard2")}},
 witch:{slot:3,roster:1,attacks:{attack_1:attack("ลูกแก้วพิษ","projectile","witch-curse","witch1"),attack_2:attack("คำสาปเงา","projectile","witch-curse","witch2")}},
 fairy:{slot:4,roster:1,attacks:{attack_1:attack("แสงพิทักษ์","projectile","fairy-light","fairy1"),attack_2:attack("ประกายดาว","projectile","fairy-light","fairy2")}},
 ranger:{slot:1,roster:2,attacks:{attack_1:attack("ศรสายลม","projectile","ranger-wind-arrow","mage1",0x67bca6),attack_2:attack("ศรพายุ","spinning","ranger-storm","fairy1",0x67bca6)}},
 ninja:{slot:0,roster:2,attacks:{attack_1:attack("คมเงา","melee","ninja-shadow-cut","warrior1",0xa7a2df),attack_2:attack("ดาวกระจายจันทรา","spinning","ninja-moon-star","witch2",0xa7a2df)}},
 monk:{slot:2,roster:2,attacks:{attack_1:attack("หมัดสะเทือน","melee","monk-dawn-fist","warrior2",0xe2a35b),attack_2:attack("เตะวงอรุณ","melee","monk-sun-kick","hit",0xe2a35b)}},
 engineer:{slot:3,roster:2,attacks:{attack_1:attack("กระสุนเฟือง","cannon","engineer-gear-shot","warrior2",0x80ccda),attack_2:attack("ปืนใหญ่แกนพลัง","cannon","engineer-core-blast","wizard2",0x80ccda)}},
 bard:{slot:4,roster:2,attacks:{attack_1:attack("คลื่นพิณ","pulse","bard-lyre-wave","fairy1",0xe6ca7d),attack_2:attack("บทเพลงดารา","pulse","bard-star-song","fairy2",0xe6ca7d)}}
};
export const heroAttack=(hero:HeroType,clip:AttackClip)=>HERO_DEFINITIONS[hero].attacks[clip];
