import type { RaidEvent } from "../types";
export class AttackEventQueue {
  private sequence = 0;
  private events: RaidEvent[] = [];
  push(events: RaidEvent[]) {
    for (const event of events) if (event.seq > this.sequence) { this.sequence = event.seq; this.events.push(event); }
    if (this.events.length > 20) this.events = this.events.slice(-20);
  }
  take() { return this.events.splice(0, 3); }
  reset(sequence = 0) { this.sequence = sequence; this.events = []; }
}
