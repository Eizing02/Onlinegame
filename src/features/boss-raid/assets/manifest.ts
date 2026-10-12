import catalog from "./catalog.json";

export const HERO_TYPES = ["warrior", "mage", "wizard", "witch", "fairy"] as const;
export type HeroType = typeof HERO_TYPES[number];
export type HeroClip = "idle" | "attack_1" | "attack_2" | "hit" | "victory" | "defeat";
export type BossClip = keyof typeof catalog.bossClips;
export type SpriteClip = {
  path: string; frameCols: 4; frameRows: 4; totalFrames: 16;
  fps: number; loop: boolean; anchorX: number; anchorY: number; flipX: boolean;
  scale: number; impactFrame: number; holdLast: boolean;
};
export const HERO_NAMES: Record<HeroType, string> = {
  warrior: "นักรบ", mage: "จอมเวท", wizard: "พ่อมด", witch: "แม่มด", fairy: "ภูตพิทักษ์",
};
export function spriteClip(actor: "boss" | HeroType, animation: BossClip | HeroClip): SpriteClip {
  const file = actor === "boss" ? catalog.bossClips[animation as BossClip] : animation;
  if (!file) throw new Error("RAID_UNKNOWN_CLIP");
  return {
    path: `/assets/boss-raid/${actor === "boss" ? "boss" : `heroes/${actor}`}/${file}.png`,
    frameCols: 4, frameRows: 4, totalFrames: 16,
    fps: animation === "idle" ? 8 : animation === "death" || animation === "defeat" ? 10 : 13,
    loop: animation === "idle", anchorX: 0.5, anchorY: 0.9,
    flipX: false, scale: 1, impactFrame: 7,
    holdLast: ["death", "defeat", "victory", "victory_roar"].includes(animation),
  };
}
