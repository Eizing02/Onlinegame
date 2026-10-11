export type ScreenEffect = "shake" | "white" | "red" | "slow" | "dark" | "victory";
const durations: Record<ScreenEffect, number> = { shake: 200, white: 120, red: 220, slow: 600, dark: 600, victory: 1800 };
export class ScreenEffectManager {
  private timers = new Map<ScreenEffect, ReturnType<typeof setTimeout>>();
  private last = new Map<ScreenEffect, number>();
  constructor(private host: HTMLElement, private reduced: boolean) {}
  play(effect: ScreenEffect) {
    if (this.reduced && ["shake", "white", "slow"].includes(effect)) return;
    const now = performance.now();
    if (now - (this.last.get(effect) ?? -1000) < 250) return;
    this.last.set(effect, now); clearTimeout(this.timers.get(effect));
    this.host.dataset[effect] = "true";
    this.timers.set(effect, setTimeout(() => { delete this.host.dataset[effect]; this.timers.delete(effect); }, durations[effect]));
  }
  get speed() { return this.host.dataset.slow ? 0.5 : 1; }
  destroy() { this.timers.forEach(clearTimeout); this.timers.clear(); for (const key of Object.keys(durations)) delete this.host.dataset[key]; }
}
