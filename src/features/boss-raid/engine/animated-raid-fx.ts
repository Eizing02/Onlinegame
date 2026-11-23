import { Container, ImageSource, Rectangle, Sprite, Texture } from "pixi.js";
import { ANIMATED_FX, type AnimatedFxId, type FxLook } from "../assets/animated-fx";

const assetPath = "/assets/boss-raid/vfx/animated";
const activeLimit = 10;

type LoadedClip = { base: Texture; frames: Texture[]; bytes: number };
type ClipPlayer = { sprite: Sprite; seek: (progress: number) => void };
type FxAnchor = { x: number; y: number };
type Burst = ClipPlayer & { id: AnimatedFxId; elapsed: number; duration: number; anchor: () => FxAnchor };

/** Resource ownership belongs to the scene. These cosmetics never gate gameplay or answer animation. */
export class AnimatedRaidFx {
  private clips = new Map<AnimatedFxId, LoadedClip>();
  private pending = new Set<() => void>();
  private bursts: Burst[] = [];
  private disposed = false;

  constructor(
    readonly ground = new Container(),
    readonly above = new Container(),
  ) {}

  async preload(ids: AnimatedFxId[]) {
    let cursor = 0;
    const worker = async () => {
      while (!this.disposed && cursor < ids.length) {
        const id = ids[cursor++];
        if (!this.clips.has(id)) await this.load(id);
      }
    };
    await Promise.all([worker(), worker()]);
  }

  private load(id: AnimatedFxId) {
    return new Promise<void>(resolve => {
      const meta = ANIMATED_FX[id];
      const image = new Image();
      image.decoding = "async";
      const finish = (loaded: boolean) => {
        clearTimeout(timeout);
        this.pending.delete(cancel);
        image.onload = image.onerror = null;
        if (loaded && !this.disposed && image.naturalWidth === meta.sheetWidth && image.naturalHeight === meta.sheetHeight) {
          const base = new Texture({ source: new ImageSource({ resource: image }) });
          const frames = Array.from({ length: meta.count }, (_, i) => {
            const x = (i % meta.columns) * (meta.width + 2) + 1;
            const y = Math.floor(i / meta.columns) * (meta.height + 2) + 1;
            return new Texture({ source: base.source, frame: new Rectangle(x, y, meta.width, meta.height) });
          });
          this.clips.set(id, { base, frames, bytes: meta.sheetWidth * meta.sheetHeight * 4 });
        }
        resolve();
      };
      const cancel = () => { finish(false); image.src = ""; };
      const timeout = setTimeout(cancel, 6000);
      this.pending.add(cancel);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = assetPath + "/" + id + ".png";
    });
  }

  player(id: AnimatedFxId, width: number, direction = 1, tint = 0xffffff): ClipPlayer | null {
    const clip = this.clips.get(id);
    if (!clip || this.disposed) return null;
    const meta = ANIMATED_FX[id];
    const sprite = new Sprite(clip.frames[0]);
    const scale = width / meta.width;
    sprite.anchor.set(meta.anchor[0], meta.anchor[1]);
    sprite.scale.set(scale * direction, scale);
    sprite.tint = tint;
    return {
      sprite,
      seek: progress => {
        const index = Math.max(0, Math.min(clip.frames.length - 1, Math.floor(progress * clip.frames.length)));
        sprite.texture = clip.frames[index];
      },
    };
  }

  play(look: FxLook, width: number, anchor: () => FxAnchor, direction = 1): boolean {
    if (this.bursts.length >= activeLimit) return false;
    const player = this.player(look.id, width, look.directional ? direction : 1, look.tint);
    if (!player) return false;
    const { x, y } = anchor();
    player.sprite.position.set(x, y);
    const layer = look.placement === "ground" ? this.ground : this.above;
    layer.addChild(player.sprite);
    this.bursts.push({ ...player, id: look.id, elapsed: 0, duration: ANIMATED_FX[look.id].durationMs, anchor });
    return true;
  }

  tick(delta: number) {
    this.bursts = this.bursts.filter(burst => {
      burst.elapsed += delta;
      const progress = burst.elapsed / burst.duration;
      if (progress >= 1) {
        burst.sprite.destroy();
        return false;
      }
      const { x, y } = burst.anchor();
      burst.sprite.position.set(x, y);
      burst.sprite.alpha = Math.min(1, (1 - progress) * 4.5);
      burst.seek(progress);
      return true;
    });
  }

  clear() {
    for (const burst of this.bursts) burst.sprite.destroy();
    this.bursts = [];
  }

  metrics() {
    return {
      loaded: [...this.clips.keys()].sort(),
      decodedBytes: [...this.clips.values()].reduce((total, clip) => total + clip.bytes, 0),
      active: this.bursts.map(burst => burst.id),
    };
  }

  destroy() {
    this.disposed = true;
    for (const cancel of this.pending) cancel();
    this.clear();
    for (const clip of this.clips.values()) {
      for (const frame of clip.frames) frame.destroy();
      clip.base.destroy(true);
    }
    this.clips.clear();
  }
}
