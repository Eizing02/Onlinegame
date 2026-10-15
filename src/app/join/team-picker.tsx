"use client";
import { useRef, useState } from "react";
import { Check, Shuffle, UsersRound } from "lucide-react";
import { chooseTeamAction } from "./actions";
import { LoadingForm } from "@/components/ui/loading-form";
// Public preview only: stored questions and private participant data stay on the server.
export type JoinTeamPreview = { id: string; teamName: string; memberCount: number; maxMembers: number; disabled: boolean };
export function TeamPicker({ teams, roomCode, currentTeamId, late = false }: { teams: JoinTeamPreview[]; roomCode: string; currentTeamId?: string; late?: boolean }) {
 const [selected, setSelected] = useState(currentTeamId ?? "");
 const root = useRef<HTMLDivElement>(null);
 const team = teams.find(t => t.id === selected && !t.disabled);
 const available = teams.filter(t => !t.disabled);
 return <div className="join-team-picker" ref={root}>
  <div className="join-team-toolbar"><h2>เลือกทีมของคุณ</h2><button className="identity-secondary" type="button" disabled={!available.length} onClick={() => setSelected(available[Math.floor(Math.random()*available.length)].id)}><Shuffle size={18} aria-hidden="true"/>สุ่มทีมให้ฉัน</button></div>
  <div className="join-team-grid" role="group" aria-label="เลือกทีม" tabIndex={0} onKeyDown={event => {
   if (!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key) || !available.length) return;
   event.preventDefault(); const index = available.findIndex(t => t.id === selected);
   const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length-1 : (index+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)+available.length)%available.length;
   setSelected(available[next].id); root.current?.querySelector<HTMLButtonElement>(`[data-team-id="${available[next].id}"]`)?.focus();
  }}>
   {teams.map(t => <button type="button" key={t.id} data-team-id={t.id} className="join-team-choice" aria-pressed={team?.id===t.id} data-other={Boolean(team)&&team?.id!==t.id} disabled={t.disabled} onClick={() => setSelected(t.id)}>
    <span className="join-team-name"><UsersRound size={20} aria-hidden="true"/>{t.teamName}</span><span className="join-team-count">{t.memberCount}/{t.maxMembers} คน</span>
    <span className="join-team-status">{team?.id===t.id ? <><Check size={18} aria-hidden="true"/>เลือกแล้ว</> : t.disabled ? "ทีมเต็มหรือเปลี่ยนทีมไม่ได้" : currentTeamId===t.id ? "ทีมปัจจุบัน" : late ? "เลือกเพื่อรับชม" : "เลือกทีมนี้"}</span>
   </button>)}
   {!teams.length&&<p>ยังไม่มีทีมในห้องนี้ กรุณาแจ้งครู</p>}
  </div>
  <LoadingForm action={chooseTeamAction} className="join-team-confirm" loadingLabel="กำลังเข้าทีม…">
   <input type="hidden" name="room_code" value={roomCode}/><input type="hidden" name="team_id" value={team?.id??""}/>
   <p role="status" aria-live="polite">{team ? `เลือก ${team.teamName} แล้ว · กดยืนยันเพื่อเข้าห้อง` : available.length ? "เลือกทีม แล้วกดยืนยันด้านล่าง" : "ไม่มีทีมว่าง กรุณาแจ้งครูหรือเปลี่ยนห้อง"}</p>
   <button className="game-button" type="submit" disabled={!team}><Check size={19} aria-hidden="true"/>{team ? `ยืนยันเข้าทีม ${team.teamName}` : "ยืนยันเข้าทีม"}</button>
  </LoadingForm>
 </div>;
}
