import type { RaidStanding, RaidTeam } from "../types";
export function raidStandings(teams: RaidTeam[], questionCount: number) {
  const rows: RaidStanding[] = teams.filter(t => t.memberCount > 0).map(t => ({ bossType:t.bossType,teamId: t.id, teamName: t.name, rank: null, averageScore: t.averageScore, totalScore: t.totalScore, memberCount: t.memberCount, killDurationMs: t.killDurationMs, damagePercent: t.bossMaxHp > 0 ? (1 - t.bossHp / t.bossMaxHp) * 100 : 0, correctCount: t.correctCount, accuracy: questionCount > 0 ? t.correctCount / (t.memberCount * questionCount) * 100 : 0 }));
  const average = [...rows].sort((a,b) => b.totalScore * a.memberCount - a.totalScore * b.memberCount);
  average.forEach((row,i) => { row.rank = i > 0 && row.totalScore * average[i-1].memberCount === average[i-1].totalScore * row.memberCount ? average[i-1].rank : i+1; });
  const kill = rows.map(row => ({ ...row, rank: null as number | null })).sort((a,b) => a.killDurationMs !== null && b.killDurationMs !== null ? a.killDurationMs-b.killDurationMs : a.killDurationMs !== null ? -1 : b.killDurationMs !== null ? 1 : b.damagePercent-a.damagePercent || b.averageScore-a.averageScore);
  kill.forEach((row,i) => { if (row.killDurationMs !== null) row.rank = i > 0 && row.killDurationMs === kill[i-1].killDurationMs ? kill[i-1].rank : i+1; });
  return { average, kill };
}
