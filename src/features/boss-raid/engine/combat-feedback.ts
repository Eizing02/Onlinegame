import { Container, ImageSource, Sprite, Text, Texture } from "pixi.js";
import type { HeroType, BossClip } from "../assets/manifest";
import { HERO_DEFINITIONS, type HeroEffectId } from "../assets/hero-definitions";
import { BOSS_DEFINITIONS, bossAttackEffect, type BossEffectId, type BossType } from '../assets/boss-definitions';
import type { RaidEvent } from "../types";

export const HERO_EFFECTS: Record<HeroType, EffectId> = {
  warrior: "warrior-slash", mage: "mage-energy", wizard: "wizard-fire",
  witch: "witch-curse", fairy: "fairy-light",
  ranger: "ranger-wind-arrow", ninja: "ninja-shadow-cut", monk: "monk-dawn-fist", engineer: "engineer-gear-shot", bard: "bard-lyre-wave",
};
export type EffectId = BossEffectId | HeroEffectId | "healing-light";
export type FeedbackAnchor = { x: number; y: number; height: number };
type Float = { node: Container; getAnchor: () => FeedbackAnchor; age: number; duration: number; number: boolean; offset: number; size: number; rotation: number };

export function bossEffect(clip: BossClip,bossType:BossType='shadow_dragon'): EffectId {
  return bossAttackEffect(bossType,clip);
}

/** Reads only confirmed event values. Legacy hero-hit events never produce guessed numbers. */
export function feedbackAmount(event: RaidEvent): number | null {
  const value = event.type === "hero_attack" ? event.damage : event.type === "hero_hit" ? event.damageTaken : event.type === "heal" ? event.heal : null;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Scene-owned textures and bounded transient nodes; independent of shared character leases. */
export class CombatFeedback {
  private textures = new Map<EffectId, Texture>();
  private loading = new Map<EffectId, Promise<void>>();
  private cancelLoads = new Set<() => void>();
  private floats: Float[] = [];
  private seen = new Set<string>();
  private disposed = false;
  private shown: { seq: number; target: string; amount: number | null; effect: EffectId }[] = [];

  constructor(private root: Container, private scale: () => number, private font: string,
    private reduced: boolean, private enabled: boolean) {}

  preload(heroes: HeroType[],bossType:BossType='shadow_dragon') {
    return Promise.all([...new Set<EffectId>([...heroes.flatMap(h => Object.values(HERO_DEFINITIONS[h].attacks).map(a => a.effect)), ...Object.values(BOSS_DEFINITIONS[bossType].effects), "healing-light"])].map(id => this.load(id)));
  }

  private load(id: EffectId): Promise<void> {
    if (this.disposed || this.textures.has(id)) return Promise.resolve();
    const pending = this.loading.get(id); if (pending) return pending;
    const task = new Promise<void>(resolve => {
      const image = new Image();
      let settled = false;
      const complete = () => {
        if (settled) return; settled = true; clearTimeout(timeout);
        image.onload = image.onerror = null; this.cancelLoads.delete(cancel);
        if (!this.disposed && image.complete && image.naturalWidth) {
          this.textures.set(id, new Texture({ source: new ImageSource({ resource: image }) }));
        }
        resolve();
      };
      const cancel = () => { image.src = ""; complete(); };
      const timeout = setTimeout(cancel, 6000);
      this.cancelLoads.add(cancel);
      image.onload = image.onerror = complete;
      image.src = `/assets/boss-raid/vfx/${id}.png`;
    });
    this.loading.set(id, task);
    return task;
  }

  projectile(id: EffectId, size: number): Sprite | null {
    const texture = this.textures.get(id); if (!texture || this.disposed) return null;
    const sprite = new Sprite(texture); sprite.anchor.set(.5); sprite.width = sprite.height = size;
    return sprite;
  }

  impact(event: RaidEvent, target: string, effect: EffectId, getAnchor: () => FeedbackAnchor) {
    const key = `${event.seq}:${target}`;
    if (this.disposed || this.seen.has(key)) return;
    this.seen.add(key);
    if (this.seen.size > 256) this.seen.delete(this.seen.values().next().value!);
    const amount = feedbackAmount(event);
    this.shown.push({ seq: event.seq, target, amount, effect });
    if (this.shown.length > 32) this.shown.shift();
    const anchor = getAnchor(), screenScale = Math.max(.01, this.scale());
    const size = anchor.height * (target === "boss" ? .65 : .95);
    const sprite = this.enabled ? this.projectile(effect, size) : null;
    if (sprite) {
      const node = new Container(); node.addChild(sprite); this.root.addChild(node);
      const rotation = effect.includes("claw") || effect.includes("slash") ? (event.seq % 2 ? -.12 : .12) : 0;
      this.floats.push({ node, getAnchor, age: 0, duration: 580, number: false, offset: 0, size, rotation });
    }
    if (amount !== null) {
      const healing = event.type === "heal", hurt = event.type === "hero_hit";
      const fontSize = Math.max(18, Math.min(32, anchor.height * screenScale * .24)) / screenScale;
      const text = new Text({ text: `${healing ? "+" : "−"}${amount.toLocaleString("en-US")}`, style: {
        fontFamily: this.font, fontSize, fontWeight: "800", fill: healing ? 0x25475a : hurt ? 0x790d16 : 0xf5efe1,
        stroke: { color: hurt || healing ? 0xf5efe1 : 0x392829, width: fontSize * .12 },
        dropShadow: { color: 0x392829, alpha: .3, blur: 2, distance: 2, angle: Math.PI / 2 },
      }});
      text.anchor.set(.5);
      const node = new Container(); node.addChild(text); this.root.addChild(node);
      // Stagger neighboring labels on the same actor without merging their actual values.
      const count = this.floats.filter(f => f.number && f.getAnchor().x === anchor.x && f.age < 350).length;
      this.floats.push({ node, getAnchor, age: 0, duration: 1100, number: true, offset: (count % 3 - 1) * fontSize * .48, size, rotation: 0 });
    }
    while (this.floats.length > 48) this.floats.shift()!.node.destroy({ children: true });
    this.tick(0);
  }

  tick(delta: number) {
    this.floats = this.floats.filter(float => {
      float.age += delta;
      if (float.age >= float.duration) { float.node.destroy({ children: true }); return false; }
      const t = float.age / float.duration, a = float.getAnchor();
      float.node.position.set(a.x + float.offset, a.y - (float.number && !this.reduced ? a.height * (.18 + .25 * t) : 0));
      if (float.number) {
        const bounce = this.reduced ? 1 : float.age < 110 ? .65 + float.age / 110 * .6 : float.age < 220 ? 1.25 - (float.age - 110) / 110 * .25 : 1;
        float.node.scale.set(bounce);
        float.node.alpha = t < .55 ? 1 : Math.pow((1 - t) / .45, 1.4);
      } else {
        float.node.rotation = float.rotation;
        float.node.scale.set(this.reduced ? 1 : .55 + .6 * (1 - Math.pow(1 - Math.min(1, t * 4), 3)));
        float.node.alpha = t < .22 ? Math.min(1, t * 10 + .25) : Math.pow((1 - t) / .78, 1.5);
      }
      return true;
    });
  }

  clear() { for (const float of this.floats) float.node.destroy({ children: true }); this.floats = []; }
  metrics() { return { textures: this.textures.size, active: this.floats.length, shown: this.shown }; }
  destroy() {
    this.disposed = true;
    for (const cancel of [...this.cancelLoads]) cancel();
    this.clear();
    for (const texture of this.textures.values()) texture.destroy(true);
    this.textures.clear(); this.loading.clear(); this.seen.clear();
  }
}
