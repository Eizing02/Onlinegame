export type AudioPreferences = { muted: boolean; master: number; music: number; sfx: number };
export type AudioSnapshot = AudioPreferences & { ready: boolean; blocked: boolean };
const STORAGE_KEY = 'kruei:audio:v1';
export const DEFAULT_AUDIO: AudioSnapshot = { muted: false, master: .65, music: .22, sfx: .7, ready: false, blocked: false };
type Bed = { owner: object; element: HTMLMediaElement; video: boolean; gain: number; failed: boolean };

/** One background owner and one audio graph for the whole document. */
export class AppAudioEngine {
  private snapshot: AudioSnapshot = DEFAULT_AUDIO;
  private listeners = new Set<() => void>();
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private media = new WeakMap<HTMLMediaElement, { source: MediaElementAudioSourceNode; gain: GainNode }>();
  private bed: Bed | null = null;
  private effects = new Set<HTMLAudioElement>();
  private effectTimers = new Map<HTMLAudioElement, ReturnType<typeof setTimeout>>();
  private hidden = false;
  private disposed = false;
  private hydrated = false;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private update(patch: Partial<AudioSnapshot>) {
    if (this.disposed || Object.entries(patch).every(([key, value]) => this.snapshot[key as keyof AudioSnapshot] === value)) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (stored && typeof stored.muted === 'boolean') {
        const patch: Partial<AudioPreferences> = { muted: stored.muted };
        for (const key of ['master', 'music', 'sfx'] as const) if (typeof stored[key] === 'number' && Number.isFinite(stored[key])) patch[key] = Math.max(0, Math.min(1, stored[key]));
        this.update(patch);
      }
    } catch { /* Storage may be unavailable; defaults still work. */ }
    this.applyGains();
    if (this.snapshot.muted && this.bed) {
      if (this.bed.video) this.bed.element.muted = true;
      else this.bed.element.pause();
    }
  }
  setPreferences(patch: Partial<AudioPreferences>) {
    for (const key of ['master', 'music', 'sfx'] as const) if (key in patch) patch[key] = Math.max(0, Math.min(1, patch[key]!));
    this.update(patch);
    const { muted, master, music, sfx } = this.snapshot;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted, master, music, sfx })); } catch { /* Private mode */ }
    this.applyGains();
    if (muted) {
      this.stopEffects();
      if (this.bed?.video) { this.bed.element.muted = true; } else this.bed?.element.pause();
    } else this.unlock();
  }
  private graph() {
    if (this.context || this.disposed) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.music = this.context.createGain();
    this.sfx = this.context.createGain();
    this.music.connect(this.master); this.sfx.connect(this.master); this.master.connect(this.context.destination);
    this.context.onstatechange = () => {
      this.update({ ready: this.context?.state === 'running' });
      if (this.context?.state === 'running') this.playBed();
    };
    this.applyGains();
  }
  /** Invoked synchronously by trusted pointer/keyboard events; never blocks login. */
  unlock = () => {
    if (this.disposed || this.snapshot.muted || this.hidden) return;
    try {
      this.graph();
      if (this.bed) this.connectMedia(this.bed.element, 'music', this.bed.gain);
      void this.context?.resume().then(() => {
        if (this.disposed) return;
        this.update({ ready: this.context?.state === 'running', blocked: this.context?.state !== 'running' });
      }).catch(() => this.update({ blocked: true }));
      this.playBed();
    } catch { this.update({ blocked: true }); }
  };
  getBus() { return this.context && this.sfx ? { context: this.context, sfx: this.sfx } : null; }
  musicMetrics(owner: object) {
    return { musicPaused: this.bed?.owner !== owner || this.bed.element.paused, musicReadyState: this.bed?.owner === owner ? this.bed.element.readyState : 0 };
  }
  private applyGains() {
    if (this.master) this.master.gain.value = this.snapshot.muted ? 0 : this.snapshot.master;
    if (this.music) this.music.gain.value = this.snapshot.music;
    if (this.sfx) this.sfx.gain.value = this.snapshot.sfx;
  }
  private connectMedia(element: HTMLMediaElement, category: 'music' | 'sfx', value: number) {
    if (!this.context) return;
    let route = this.media.get(element);
    if (!route) {
      const source = this.context.createMediaElementSource(element), gain = this.context.createGain();
      route = { source, gain }; this.media.set(element, route);
    }
    route.source.disconnect(); route.gain.disconnect();
    route.source.connect(route.gain); route.gain.connect(category === 'music' ? this.music! : this.sfx!);
    route.gain.gain.value = value;
  }
  claimVideo(owner: object, element: HTMLVideoElement, gain = 4) {
    this.replaceBed({ owner, element, video: true, gain, failed: false });
    return () => this.release(owner);
  }
  claimMusic(owner: object, src: string | null) {
    if (!src) { this.release(owner); return; }
    if (this.bed?.owner === owner && this.bed.element.getAttribute('src') === src) return;
    const element = new Audio(src); element.loop = true; element.preload = 'none';
    this.replaceBed({ owner, element, video: false, gain: 1, failed: false });
  }
  private replaceBed(bed: Bed) {
    this.hydrate();
    if (this.bed) this.release(this.bed.owner);
    this.bed = bed;
    bed.element.addEventListener('error', () => { bed.failed = true; }, { once: true });
    if (this.snapshot.muted) { if (bed.video) { bed.element.muted = true; void bed.element.play().catch(() => {}); } }
    else this.unlock();
  }
  private playBed() {
    const bed = this.bed;
    if (!bed || bed.failed || this.hidden || this.disposed) return;
    if (this.snapshot.muted && !bed.video) return;
    bed.element.muted = this.snapshot.muted;
    void bed.element.play().then(() => {
      if (this.bed === bed && !bed.element.muted) this.update({ blocked: this.context?.state !== 'running' });
    }).catch(() => {
      if (this.bed !== bed || this.disposed) return;
      this.update({ blocked: true });
      if (bed.video) { bed.element.muted = true; void bed.element.play().catch(() => {}); }
    });
  }
  release(owner: object) {
    if (this.bed?.owner !== owner) return;
    this.stopEffects();
    const { element, video } = this.bed;
    element.pause(); this.media.get(element)?.gain.disconnect(); this.media.get(element)?.source.disconnect();
    if (!video) { element.removeAttribute('src'); element.load(); }
    this.bed = null;
  }
  playEffect(src: string, durationMs: number, gain = .5) {
    if (this.snapshot.muted || !this.snapshot.ready || this.hidden) return;
    const element = new Audio(src); this.connectMedia(element, 'sfx', gain); this.effects.add(element);
    const cleanup = () => { element.pause(); this.media.get(element)?.gain.disconnect(); this.media.get(element)?.source.disconnect(); this.effects.delete(element); clearTimeout(this.effectTimers.get(element)); this.effectTimers.delete(element); };
    element.onended = cleanup;
    void element.play().then(() => { if (!this.effects.has(element)) return; this.effectTimers.set(element, setTimeout(cleanup, durationMs)); }).catch(cleanup);
  }
  private stopEffects() {
    for (const element of this.effects) { element.pause(); this.media.get(element)?.source.disconnect(); this.media.get(element)?.gain.disconnect(); clearTimeout(this.effectTimers.get(element)); }
    this.effects.clear(); this.effectTimers.clear();
  }
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) { this.bed?.element.pause(); this.stopEffects(); void this.context?.suspend(); }
    else if (!this.snapshot.muted) this.unlock();
    else if (this.bed?.video) this.playBed();
  }
  destroy() { this.disposed = true; if (this.bed) this.release(this.bed.owner); this.stopEffects(); this.listeners.clear(); void this.context?.close(); }
}
