"use client";
import { useLayoutEffect, useRef } from "react";
import { Trophy } from "lucide-react";
import type { RankedTeam } from "@/lib/data/game-sessions";
import { useExperience } from "./experience";
const format = (value: number) => value.toLocaleString("th-TH", {maximumFractionDigits: 2});
function Score({value}: {value: number}) {
  const label = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const {mode} = useExperience();
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (mode === "reduced" || from === value) return;
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      if (label.current) label.current.textContent = format(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [value, mode]);
  return <span><span className="sr-only">{format(value)} คะแนน</span><span ref={label} aria-hidden="true">{format(value)}</span></span>;
}
export function TeamStandings({teams}: {teams: RankedTeam[]}) {
  const host = useRef<HTMLDivElement>(null);
  const announcement = useRef<HTMLParagraphElement>(null);
  const previous = useRef(new Map<string, {top: number; rank: number | null}>());
  const {mode} = useExperience();
  useLayoutEffect(() => {
    const animations: Animation[] = [];
    const next = new Map<string, {top: number; rank: number | null}>();
    const improvements: string[] = [];
    for (const row of host.current?.querySelectorAll<HTMLElement>("[data-team]") ?? []) {
      const id = row.dataset.team!, top = row.offsetTop;
      const old = previous.current.get(id), team = teams.find(team => team.id === id), rank = team?.rank ?? null;
      if (old && old.top !== top && mode !== "reduced") animations.push(row.animate([{transform: `translateY(${old.top - top}px)`}, {transform: "translateY(0)"}], {duration: 700, easing: "cubic-bezier(.16,1,.3,1)"}));
      if (old?.rank != null && rank != null && rank < old.rank) improvements.push(`${team!.teamName} ขยับจากอันดับ ${old.rank} เป็น ${rank}${team!.isTied ? " ร่วม" : ""}`);
      next.set(id, {top, rank});
    }
    if (improvements.length && announcement.current) announcement.current.textContent = improvements.join(" · ");
    previous.current = next;
    return () => animations.forEach(animation => animation.cancel());
  }, [teams, mode]);
  return <><p className="standings-movement" role="status" ref={announcement} /><div className="team-standings" ref={host}>{teams.map(team => <div key={team.id} data-team={team.id} className={`standing-row ${team.rank === 1 ? "standing-leader" : ""}`}>
    <span className="standing-rank">{team.rank === 1 ? <Trophy size={22} aria-label="อันดับ 1" /> : team.rank ?? "–"}</span>
    <div><strong>{team.teamName}</strong><p>{team.rank === null ? "ไม่มีสมาชิกที่ล็อกตอนเริ่ม" : team.isTied ? `อันดับร่วม ${team.rank}` : `อันดับ ${team.rank}`}</p></div>
    <span className="standing-score"><Score value={team.averageScore} /><small>คะแนน</small></span>
  </div>)}</div></>;
}
