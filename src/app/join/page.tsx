import { Search, ArrowLeft, DoorOpen } from "lucide-react";
import Link from "next/link";
import { findRoomAction, leaveTeamAction } from "@/app/join/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Wallpaper } from "@/components/game/wallpaper";
import { ButtonLink } from "@/components/ui/button-link";
import { LoadingForm } from "@/components/ui/loading-form";
import { requireRole } from "@/lib/auth/session";
import { getJoinableGameSession, getTeamSummaries } from "@/lib/data/game-sessions";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/game/room-code";
import { TeamPicker } from "./team-picker";
type JoinPageProps = { searchParams: Promise<{ room_code?: string; error?: string; notice?: string }> };
export default async function JoinPage({ searchParams }: JoinPageProps) {
 const student = await requireRole("student"), query = await searchParams;
 const roomCode = normalizeRoomCode(query.room_code ?? "");
 const valid = isValidRoomCode(roomCode);
 const game = valid ? await getJoinableGameSession(roomCode) : null;
 const teams = game ? getTeamSummaries(game) : [];
 const participant = game?.participants.find(p => p.studentCode === student.userCode && p.connectionStatus !== "left");
 const currentTeam = teams.find(t => t.id === participant?.teamId);
 const late = Boolean(game && game.status !== "lobby"), raid = game?.gameMode === "boss_raid";
 const roomError = roomCode && !valid ? "รหัสห้องต้องเป็นตัวเลข 4 หลัก" : roomCode && !game ? "ไม่พบห้องนี้ หรือห้องจบเกมแล้ว" : null;
 return <AppShell wallpaper="join" className="join-app"><Wallpaper/>
  <section className="join-flow" data-stage={game ? "teams" : "code"}>
   <header className="join-flow-heading"><div><h1>{game ? "เลือกทีมก่อนเข้าเล่น" : "เข้าร่วมเกม"}</h1><p>{student.displayName}{student.grade ? ` · ${student.grade}` : ""}</p></div>{game&&<Link className="identity-secondary" href="/join"><ArrowLeft size={18} aria-hidden="true"/>เปลี่ยนห้อง</Link>}</header>
   {(query.error||roomError)&&<p className="form-error join-message" role="alert">{query.error||roomError}</p>}
   {query.notice&&<p className="form-notice join-message" role="status">{query.notice}</p>}
   {game ? <div className="join-room-layout" key={game.id}>
    <aside className="join-room-summary"><DoorOpen size={28} aria-hidden="true"/><h2>ห้อง {game.roomCode}</h2><p className="join-activity">{game.activityName||game.questionSetTitle}</p><p className="join-question-set">ชุดคำถาม {game.questionSetTitle}</p><p>{game.questionCount} ข้อ · {game.teamCount} ทีม · {late ? "เริ่มเกมแล้ว" : "รอครูเริ่มเกม"}</p>
     {late&&<p className="join-room-warning">{raid ? "ผู้เข้าร่วมใหม่รับชมได้อย่างเดียว คะแนนและจำนวนฮีโร่จะไม่เปลี่ยน" : "เข้าหลังเริ่มเกม เล่นได้แต่ไม่ร่วมคะแนนรอบนี้"}</p>}
     {currentTeam&&<div className="join-current-team"><p>คุณอยู่ใน {currentTeam.teamName} แล้ว</p><ButtonLink href={raid ? `/play/${roomCode}/raid` : `/play/${roomCode}`}>กลับเข้าเกม</ButtonLink>{!late&&<LoadingForm action={leaveTeamAction} loadingLabel="กำลังออกจากทีม…"><input name="room_code" type="hidden" value={roomCode}/><button className="identity-secondary" type="submit">ออกจากทีม</button></LoadingForm>}</div>}
    </aside>
    <TeamPicker roomCode={roomCode} currentTeamId={currentTeam?.id} late={late} teams={teams.map(t => ({ id:t.id,teamName:t.teamName,memberCount:t.memberCount,maxMembers:t.maxMembers,disabled:(t.isFull&&!(raid&&late)&&currentTeam?.id!==t.id)||(late&&Boolean(currentTeam)&&currentTeam?.id!==t.id) }))}/>
   </div> : <div className="join-code-panel"><h2>กรอกรหัสห้องจากครู</h2><p>รหัสตัวเลข 4 หลัก แล้วเลือกทีมในหน้าถัดไป</p><LoadingForm action={findRoomAction} loadingLabel="กำลังค้นหาห้อง…"><label htmlFor="room_code">รหัสห้อง</label><input id="room_code" name="room_code" defaultValue={roomCode} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1234" required autoFocus autoComplete="off"/><button className="game-button" type="submit"><Search size={19} aria-hidden="true"/>ค้นหาห้อง</button></LoadingForm></div>}
  </section>
 </AppShell>;
}
