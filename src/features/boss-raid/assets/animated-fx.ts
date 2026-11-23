import atlas from "./animated-fx.json";
import type { BossType } from "./boss-definitions";
import type { AttackClip } from "./hero-definitions";
import type { BossClip, HeroType } from "./manifest";

export const ANIMATED_FX = atlas.clips;
export type AnimatedFxId = keyof typeof ANIMATED_FX;
export type FxLook = {
  id: AnimatedFxId;
  width: number;
  placement?: "ground" | "ground-front";
  tint?: number;
  directional?: boolean;
};

const spark = (tint: number): FxLook => ({ id: "spark", width: .78, tint, directional: true });
const ground = (id: AnimatedFxId, width: number, tint?: number): FxLook => ({ id, width, placement: "ground", tint });
const groundStrike = (id: AnimatedFxId, width: number, tint?: number): FxLook => ({ id, width, placement: "ground-front", tint });

// Both variants use the same server damage. These choices describe the impact art only.
export const HERO_IMPACT: Record<HeroType, Record<AttackClip, FxLook>> = {
  warrior: { attack_1: { id: "slash", width: 1, directional: true }, attack_2: { id: "thud", width: .83 } },
  mage: { attack_1: spark(0xaec4ff), attack_2: ground("frost", 1.3) },
  wizard: { attack_1: spark(0xffd297), attack_2: groundStrike("lightning", .65) },
  witch: { attack_1: spark(0xc8f4b8), attack_2: { id: "sigil", width: .76 } },
  fairy: { attack_1: spark(0xffedb5), attack_2: { id: "star", width: .62, tint: 0xfff5d8 } },
  ranger: { attack_1: spark(0x9feacc), attack_2: ground("wind", 1.25, 0x8de3bc) },
  ninja: { attack_1: { id: "daggers", width: .88, tint: 0xc9b7ff, directional: true }, attack_2: spark(0xc9b7ff) },
  monk: { attack_1: { id: "thud", width: .89, tint: 0xffd6a6 }, attack_2: { id: "spin", width: 1.03 } },
  engineer: { attack_1: spark(0x9be8ff), attack_2: { id: "plasma", width: .87 } },
  bard: { attack_1: ground("wind", 1.13, 0xffdf9c), attack_2: { id: "star", width: .83 } },
};

type BossAttacks = "attack_1" | "attack_2" | "breath" | "ultimate";
const BOSS_IMPACTS: Record<BossType, Record<BossAttacks, FxLook>> = {
  shadow_dragon: {
    attack_1: { id: "claws", width: 1.04 },
    attack_2: { id: "claws", width: 1.11, tint: 0xe8bbff },
    breath: spark(0xe4b3ff),
    ultimate: groundStrike("shadow", 1.18),
  },
  stone_titan: {
    attack_1: { id: "thud", width: 1.03, tint: 0xffd39b },
    attack_2: groundStrike("quake", 1.5, 0xffdd9e),
    breath: groundStrike("quake", 1.42, 0xffd38a),
    ultimate: groundStrike("stone", 1.67, 0xffdaa0),
  },
  crystal_scorpion: {
    attack_1: { id: "pincers", width: .96, tint: 0xafcfff },
    attack_2: { id: "pincers", width: 1.06, tint: 0xc3b0ff },
    breath: spark(0xa3eaff),
    ultimate: groundStrike("crystal", 1.72),
  },
};

export const bossImpactLook = (boss: BossType, clip: BossClip) => {
  const attacks = BOSS_IMPACTS[boss];
  if (clip === "ultimate" || clip === "breath" || clip === "attack_2") return attacks[clip];
  return attacks.attack_1;
};

export const HEAL_LOOK = ground("heal", 1.12, 0xe8f4bb);

export function effectsForScene(heroes: HeroType[], boss: BossType): AnimatedFxId[] {
  const ids = new Set<AnimatedFxId>(Object.values(BOSS_IMPACTS[boss]).map(look => look.id));
  ids.add("heal");
  ids.add("firework");
  if (boss === "shadow_dragon") ids.add("breath");
  for (const hero of heroes) {
    for (const look of Object.values(HERO_IMPACT[hero])) ids.add(look.id);
    if (hero === "wizard") ids.add("fireball");
  }
  return [...ids];
}
