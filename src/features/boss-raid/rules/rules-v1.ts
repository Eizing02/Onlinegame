export const RAID_RULES = Object.freeze({ version: 1, maxHp: 100, heal: 10, damagePerPoint: 10, bossRatio: 0.75, visibilityThresholdMs: 3000, warningLimit: 3, maxMembers: 5 });
export function bossMaxHp(members: number, sumPoints: number) { if (!Number.isInteger(members) || members < 1 || members > 5 || !Number.isSafeInteger(sumPoints) || sumPoints <= 0 || sumPoints > 1_000_000) throw new Error("RAID_INVALID_ROSTER_OR_POINTS"); return Math.ceil(0.75 * members * 10 * sumPoints); }
export function wrongDamage(questionCount: number) { if (!Number.isInteger(questionCount) || questionCount < 1) throw new Error("RAID_INVALID_QUESTIONS"); return Math.max(5, Math.min(20, Math.round(150 / questionCount))); }
export function qualifiedLeave(durationMs: number) { return Number.isFinite(durationMs) && durationMs > 3000; }
export function recommendedMinutes(count: number) { const reading=count<=5?3:count<=10?5:count<=15?8:count<=20?10:15; return Math.min(60,Math.ceil(reading+count*3/60)); }
