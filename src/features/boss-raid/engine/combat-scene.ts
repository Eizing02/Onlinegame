import { Application, AnimatedSprite, Container, Graphics, Texture, type Ticker } from "pixi.js";
import { SpriteLoader } from "../assets/sprite-loader";
import type { BossClip, HeroClip, HeroType } from "../assets/manifest";
import type { RaidEvent, RaidHero } from "../types";
import { AttackEventQueue } from "./attack-event-queue";
import { ScreenEffectManager } from "./screen-effects";

type Actor = { sprite: AnimatedSprite; type: "boss" | HeroType; homeX: number; homeY: number; height: number; generation: number; release?: () => void; hp: number; movement?: number };
export class CombatScene {
  private app = new Application();
  private loader = new SpriteLoader();
  private actors = new Map<string, Actor>();
  private layer = new Container();
  private queue = new AttackEventQueue();
  private effects: ScreenEffectManager;
  private observer?: ResizeObserver;
  private disposed = false;
  private elapsed = 0;
  private bossDead = false;
  private particles: { graphic: Graphics; x: number; y: number; targetX: number; targetY: number; remaining: number }[] = [];
  constructor(private host: HTMLElement, private reduced: boolean, private quality: "full" | "low", private onError: (message: string) => void) { this.effects = new ScreenEffectManager(host, reduced); }
  async init(heroes: RaidHero[], bossHp: number) {
    await this.app.init({ width: Math.max(1, this.host.clientWidth), height: Math.max(1, this.host.clientHeight), backgroundAlpha: 0, antialias: false, resolution: Math.min(devicePixelRatio, this.quality === "low" ? 1 : 1.5), autoDensity: true, preference: "webgl", powerPreference: "low-power" });
    if (this.disposed) { this.app.destroy(true, { children: true }); return; }
    this.app.canvas.setAttribute("aria-hidden", "true"); this.host.prepend(this.app.canvas);
    this.app.stage.addChild(this.layer); this.app.ticker.maxFPS = this.quality === "low" ? 30 : 60;
    this.addActor("boss", "boss", bossHp);
    for (const hero of heroes) if (hero.heroType && hero.eligible) this.addActor(hero.id, hero.heroType, hero.hp);
    this.resize();
    await Promise.all([...this.actors].map(([id, actor]) => this.clip(id, actor.hp === 0 ? id === "boss" ? "death" : "defeat" : "idle", actor.hp === 0)));
    this.bossDead = bossHp === 0;
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(this.host);
    this.app.ticker.add(this.tick); document.addEventListener("visibilitychange", this.visibility);
    this.visibility();
  }
  private addActor(id: string, type: "boss" | HeroType, hp: number) {
    const sprite = new AnimatedSprite([Texture.EMPTY]); sprite.autoUpdate = false; this.layer.addChild(sprite);
    this.actors.set(id, { sprite, type, hp, homeX: 0, homeY: 0, height: 1, generation: 0 });
  }
  async clip(id: string, animation: BossClip | HeroClip, settle = false) {
    const actor = this.actors.get(id); if (!actor || this.disposed) return;
    const generation = ++actor.generation;
    try {
      const lease = await this.loader.acquire(actor.type, animation);
      if (this.disposed || generation !== actor.generation) { lease.release(); return; }
      actor.sprite.stop(); actor.release?.(); actor.release = lease.release;
      actor.sprite.textures = lease.frames; actor.sprite.anchor.set(lease.config.anchorX, lease.config.anchorY);
      actor.sprite.animationSpeed = lease.config.fps / 60;
      actor.sprite.loop = lease.config.loop;
      this.sizeActor(actor);
      actor.sprite.onComplete = () => { if (!lease.config.holdLast && !this.disposed) void this.clip(id, actor.hp === 0 ? id === "boss" ? "death" : "defeat" : "idle"); };
      if (settle || this.reduced) actor.sprite.gotoAndStop(settle ? 15 : 0); else actor.sprite.gotoAndPlay(0);
    } catch (error) { if (!this.disposed) { console.warn("Raid sprite unavailable", animation, error); this.onError("โหลดภาพตัวละครไม่สำเร็จ ลองโหลดหน้าใหม่ การตอบคำถามยังใช้งานได้"); } }
  }
  update(heroes: RaidHero[], bossHp: number, events: RaidEvent[]) {
    if (this.disposed) return;
    for (const hero of heroes) {
      const actor = this.actors.get(hero.id); if (!actor) continue;
      if (actor.hp === 0 && hero.hp > 0) void this.clip(hero.id, "idle");
      if (actor.hp > 0 && hero.hp === 0) void this.clip(hero.id, "defeat");
      actor.hp = hero.hp; actor.sprite.tint = hero.hp === 0 ? 0x888888 : 0xffffff;
    }
    const boss = this.actors.get("boss"); if (boss) boss.hp = bossHp;
    this.queue.push(events);
  }
  private present(event: RaidEvent) {
    if (event.type === "boss_defeated" && !this.bossDead) {
      this.bossDead = true; void this.clip("boss", "death"); this.effects.play("victory");
      for (const [id, actor] of this.actors) if (id !== "boss" && actor.hp > 0) void this.clip(id, "victory");
    } else if (event.type === "hero_attack" && event.actorId) {
      const actor = this.actors.get(event.actorId);
      if (actor) { void this.clip(event.actorId, event.seq % 2 ? "attack_1" : "attack_2"); if (actor.type === "warrior" && !this.reduced) actor.movement = 0; else this.projectile(actor, event.heal ? 0x3df0ad : 0x43ddff); }
      if (!this.bossDead && event.damage > 0) void this.clip("boss", "hit");
      this.effects.play("white");
    } else if (event.type === "hero_hit") {
      if (event.targetId) { const actor = this.actors.get(event.targetId); if (actor) void this.clip(event.targetId, actor.hp === 0 ? "defeat" : "hit"); }
      if (!this.bossDead) void this.clip("boss", event.phase >= 3 ? "ultimate" : event.phase === 2 ? event.seq % 2 ? "breath" : "attack_2" : "attack_1");
      this.effects.play("red"); if (event.phase >= 2) this.effects.play("shake"); if (event.phase === 3) { this.effects.play("dark"); this.effects.play("slow"); }
    } else if (event.type === "heal" && event.actorId) { const actor = this.actors.get(event.actorId); if (actor) this.projectile(actor, 0x3df0ad, event.targetId ?? undefined); }
    else if (event.type === "boss_phase" && !this.bossDead) { void this.clip("boss", event.phase === 2 ? "shield" : "ready"); this.effects.play("dark"); }
    else if (event.type === "raid_ended" && !this.bossDead) void this.clip("boss", "victory_roar");
  }
  private projectile(actor: Actor, color: number, targetId = "boss") {
    if (this.reduced || this.particles.length >= 8) return;
    const target = this.actors.get(targetId); if (!target) return;
    const graphic = new Graphics().circle(0, 0, 5).fill(color); this.layer.addChild(graphic);
    this.particles.push({ graphic, x: actor.homeX, y: actor.homeY - actor.height / 2, targetX: target.homeX, targetY: target.homeY - target.height / 2, remaining: 400 });
  }
  private tick = (ticker: Ticker) => {
    if (this.disposed) return; const delta = ticker.deltaMS;
    this.elapsed += delta;
    if (this.elapsed > 120) { this.elapsed = 0; this.queue.take().forEach(event => this.present(event)); }
    for (const actor of this.actors.values()) {
      if (!this.reduced) actor.sprite.update({ deltaTime: ticker.deltaTime * this.effects.speed } as Ticker);
      if (actor.movement !== undefined) { actor.movement += delta; const t = Math.min(actor.movement / 700, 1); actor.sprite.x = actor.homeX - Math.sin(t * Math.PI) * this.app.screen.width * 0.38; if (t === 1) actor.movement = undefined; }
    }
    this.particles = this.particles.filter(p => { p.remaining -= delta; const t = 1 - Math.max(0, p.remaining) / 400; p.graphic.position.set(p.x + (p.targetX - p.x) * t, p.y + (p.targetY - p.y) * t); if (p.remaining <= 0) { p.graphic.destroy(); return false; } return true; });
  };
  private sizeActor(actor: Actor) { const height = actor.sprite.texture.frame.height || 1; const scale = actor.height / height; actor.sprite.scale.set(scale, scale); }
  private resize() {
    if (this.disposed) return; const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    this.app.renderer.resize(width, height);
    const heroes = [...this.actors].filter(([id]) => id !== "boss");
    for (const [id, actor] of this.actors) {
      const index = heroes.findIndex(([key]) => key === id);
      actor.height = id === "boss" ? height * 0.58 : Math.min(height * 0.35, height / (heroes.length + 1) * 0.78);
      actor.homeX = width * (id === "boss" ? 0.25 : 0.77);
      actor.homeY = (id === "boss" ? height * 0.5 : height * (index + 1) / (heroes.length + 1)) + actor.height * 0.4;
      actor.sprite.position.set(actor.homeX, actor.homeY); this.sizeActor(actor);
    }
  }
  private visibility = () => { if (this.disposed) return; if (document.hidden) this.app.stop(); else this.app.start(); };
  destroy() { this.disposed = true; this.observer?.disconnect(); document.removeEventListener("visibilitychange", this.visibility); this.effects.destroy(); this.actors.forEach(actor => actor.release?.()); this.actors.clear(); if (this.app.renderer) { this.app.ticker.remove(this.tick); this.app.destroy(true, { children: true, texture: false, textureSource: false }); } this.loader.destroy(); }
}
