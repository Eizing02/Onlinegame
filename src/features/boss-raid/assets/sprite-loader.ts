import { Texture, Rectangle } from "pixi.js";
import { spriteClip, type BossClip, type HeroClip, type HeroType } from "./manifest";

type Entry = { base: Texture; frames: Texture[]; bytes: number; refs: number; touched: number };
export class SpriteLoader {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<Entry>>();
  private running = 0;
  private waiters: (() => void)[] = [];
  private destroyed = false;
  async acquire(actor: "boss" | HeroType, animation: BossClip | HeroClip) {
    const config = spriteClip(actor, animation);
    let entry = this.entries.get(config.path);
    if (!entry) {
      let loading = this.pending.get(config.path);
      if (!loading) {
        loading = this.load(config.path);
        this.pending.set(config.path, loading);
      }
      try { entry = await loading; } finally { this.pending.delete(config.path); }
    }
    if (this.destroyed) throw new Error("RAID_SCENE_DISPOSED");
    entry.refs++; entry.touched = performance.now();
    this.trim();
    let released = false;
    return { frames: entry.frames, config, release: () => { if (!released) { released = true; entry.refs--; this.trim(); } } };
  }
  private async load(url: string): Promise<Entry> {
    if (this.running >= 2) await new Promise<void>(resolve => this.waiters.push(resolve));
    this.running++;
    try {
      if (this.destroyed) throw new Error("RAID_SCENE_DISPOSED");
      const image = new Image(); image.decoding = "async"; image.src = url;
      await image.decode();
      if (this.destroyed) throw new Error("RAID_SCENE_DISPOSED");
      if (image.naturalWidth % 4 || image.naturalHeight % 4) throw new Error("RAID_INVALID_SPRITE_GRID");
      const base = Texture.from(image);
      const width = image.naturalWidth / 4, height = image.naturalHeight / 4;
      const frames = Array.from({ length: 16 }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i % 4 * width, Math.floor(i / 4) * height, width, height) }));
      const entry = { base, frames, refs: 0, bytes: image.naturalWidth * image.naturalHeight * 4, touched: performance.now() };
      this.entries.set(url, entry); return entry;
    } finally { this.running--; this.waiters.shift()?.(); }
  }
  private trim() {
    let bytes = [...this.entries.values()].reduce((n, e) => n + e.bytes, 0);
    for (const [key, entry] of [...this.entries].sort((a, b) => a[1].touched - b[1].touched)) {
      if (this.entries.size <= 8 && bytes <= 64 * 1024 ** 2) break;
      if (!entry.refs && !this.pending.has(key)) { bytes -= entry.bytes; this.disposeEntry(entry); this.entries.delete(key); }
    }
  }
  private disposeEntry(entry: Entry) { entry.frames.forEach(frame => frame.destroy(false)); entry.base.destroy(true); }
  metrics() { return { decodedBytes:[...this.entries.values()].reduce((n,e)=>n+e.bytes,0),sheets:this.entries.size,activeReferences:[...this.entries.values()].reduce((n,e)=>n+e.refs,0) }; }
  destroy() { this.destroyed = true; for (const entry of this.entries.values()) this.disposeEntry(entry); this.entries.clear(); this.waiters.splice(0).forEach(resolve => resolve()); }
}
