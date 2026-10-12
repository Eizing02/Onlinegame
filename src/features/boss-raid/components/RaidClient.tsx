"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Settings2, Swords, Trophy, Users } from "lucide-react";
import type { RaidAnswerResult, RaidQuestion, RaidSnapshot } from "../types";
import { useRaidTabs } from "../hooks/use-raid-tabs";
import { useRaidSnapshot } from "../hooks/use-raid-snapshot";
import { useRaidAudio } from "../hooks/use-raid-audio";
import { RaidAudioSettings } from "./RaidAudioSettings";
import { useRaidVisibility } from "../hooks/use-raid-visibility";
import { RaidArena } from "./RaidArena";
import { HeroSelectLobby } from "./HeroSelectLobby";
import { RaidQuestionModal, type QuestionState } from "./RaidQuestionModal";
import { RaidResults } from "./RaidResults";
import { RaidTimer } from "./RaidTimer";
import "../raid.css";

type Submission={questionId:string;displayIndex:number;answerText:string|null;selectedOptionId:string|null;idempotencyKey:string};
export function RaidClient({initial,sessionId}:{initial:RaidSnapshot;sessionId:string}) {
 const {snapshot,error:connectionError,connected,refresh}=useRaidSnapshot({...initial,team:initial.team?{...initial.team,events:[]}:null},sessionId);
 const {tab,setTab,swipe}=useRaidTabs(["battle","team","results"],"battle");const [state,setState]=useState<QuestionState>("open");const [heldQuestion,setHeldQuestion]=useState<RaidQuestion|null>(initial.question);
 const question=["resolving","fading","error"].includes(state)?heldQuestion:snapshot.question;
 const [pending,setPending]=useState(false);const busy=useRef(false);const [error,setError]=useState("");const [feedback,setFeedback]=useState("");const submitted=useRef<Submission|null>(null);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const audio=useRaidAudio(snapshot.team?.events??[],snapshot.team?.id,{sourceTeamId:snapshot.team?.id,eventSeq:snapshot.team?.eventSeq,status:snapshot.status,phase:snapshot.team?.phase,deadline:snapshot.deadline,serverNow:snapshot.serverNow,heroes:snapshot.team?.heroes});
 const [effectsEnabled,setEffectsEnabled]=useState(true);
 const [settings,setSettings]=useState(false);const [reduced,setReduced]=useState(false);const [quality,setQuality]=useState<"full"|"low">("full");
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const post=useCallback(async(path:string,body:unknown)=>{
  const response=await fetch(`/api/raid/${initial.roomCode}/${path}`,{method:"POST",headers:{"Content-Type":"application/json","x-client-session":sessionId},body:JSON.stringify(body)});
  const result=await response.json();if(!response.ok){if(result.redirectTo)location.assign(result.redirectTo);if(result.code)return result as RaidAnswerResult & {error:string};throw new Error(result.error??"ส่งคำขอไม่สำเร็จ");}return result as RaidAnswerResult;
 },[initial.roomCode,sessionId]);
 const resolve=useCallback(async(payload:Submission)=>{
  if(busy.current)return;busy.current=true;setPending(true);setState("resolving");setError("");
  try {
   const result=await post("answer",payload);
   if(result.code==="RATE_LIMITED"){setError("ส่งคำตอบถี่เกินไป รอ 10 วินาทีแล้วกดส่งคำตอบเดิมอีกครั้ง");busy.current=false;setState("error");return;}
   if(!result.ok){setError("คำถามหรือเวลาเปลี่ยนแล้ว กำลังตรวจสถานะล่าสุด");await refresh();busy.current=false;setState("open");return;}
   setFeedback(result.correct?result.noHealTarget?"ตอบถูก แต่ไม่มีเพื่อนที่ต้องฟื้น HP":result.healAmount?`ตอบถูก ฟื้น HP ${result.healAmount}`:`ตอบถูก +${result.awardedPoints} คะแนน` :"ตอบผิด ลุยข้อต่อไปได้เลย");
   setState("fading");await refresh();
   timer.current=setTimeout(()=>{busy.current=false;setPending(false);setState("open");},300);
  } catch {setError("การเชื่อมต่อขาดหาย คำตอบอาจถูกบันทึกแล้ว กดตรวจสถานะและส่งคำตอบเดิมอีกครั้ง");busy.current=false;setState("error");}
  finally{setPending(false);}
 },[post,refresh]);
 const report=useCallback(async(input:{questionId:string;displayIndex:number;eventId:string;durationMs:number})=>{
  if(busy.current)return;setHeldQuestion(question);busy.current=true;setPending(true);setState("resolving");
  try {const result=await post("visibility",input);if(result.status==="skipped")setFeedback("ออกจากหน้าเกมเกิน 3 วินาทีครั้งที่ 3 ข้ามข้อนี้แล้ว");else if(result.status==="warning")setFeedback(`ออกจากหน้าเกมเกิน 3 วินาที · เตือน ${result.warnings}/2`);await refresh();}
  catch{setError("ส่งเหตุการณ์ออกจากหน้าไม่สำเร็จ กดเชื่อมต่ออีกครั้ง");}
  finally{busy.current=false;setPending(false);setState("open");}
 },[post,refresh,question]);
 useRaidVisibility(question,snapshot.visibilityEnabled&&snapshot.status==="running"&&Boolean(snapshot.own?.eligible)&&state==="open"&&!pending,report);
 const choose=async(heroType:string)=>{if(busy.current)return;busy.current=true;setPending(true);setError("");try{const result=await post("hero",{heroType});if(!result.ok)setError("ฮีโร่ถูกเลือกแล้ว หรือเกมเริ่มแล้ว กรุณาเลือกใหม่");await refresh();}catch(e){setError(e instanceof Error?e.message:"จองไม่สำเร็จ");}finally{busy.current=false;setPending(false);}};
 const tabs=[{id:"battle",label:"สนามต่อสู้",icon:Swords},{id:"team",label:"ทีมของฉัน",icon:Users},{id:"results",label:"อันดับ",icon:Trophy}];
 return <div className="raid-room" onClickCapture={e=>{if(e.target instanceof Element&&e.target.closest('button:not(:disabled)'))audio.button();}}>
  <header className="raid-room-header"><div><h1>{snapshot.title}</h1><p>Boss Raid · ห้อง {snapshot.roomCode} · {snapshot.team?.name}</p></div><RaidTimer deadline={snapshot.deadline} serverNow={snapshot.serverNow} ended={snapshot.status==="ended"}/><button className="raid-icon" aria-label="ตั้งค่าภาพ" aria-expanded={settings} onClick={()=>setSettings(!settings)}><Settings2 size={20}/></button></header>
  {settings&&<div className="raid-settings"><RaidAudioSettings audio={audio}/><label><input type="checkbox" checked={effectsEnabled} onChange={e=>setEffectsEnabled(e.target.checked)}/>เอฟเฟกต์ฉาก</label><label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>ลดการเคลื่อนไหว</label><label>คุณภาพภาพ<select value={quality} onChange={e=>setQuality(e.target.value as "full"|"low")}><option value="full">เต็ม</option><option value="low">ประหยัด</option></select></label></div>}
  {(!connected||error)&&<div role="status" className="raid-connection"><span>{error||connectionError} · เวลาเกมยังเดินต่อ</span><button onClick={()=>{setError("");void refresh();}}>เชื่อมต่ออีกครั้ง</button></div>}
  <nav className="raid-tabs" aria-label="เมนูห้อง Boss Raid">{tabs.map(t=><button key={t.id} aria-current={tab===t.id?"page":undefined} onClick={()=>setTab(t.id)}><t.icon size={18} aria-hidden="true"/>{t.label}</button>)}</nav>
  <div className="raid-room-content" tabIndex={0} role="region" aria-label="พื้นที่เกมและผล" {...swipe}>
   {snapshot.status==="lobby"?<HeroSelectLobby own={snapshot.own} heroes={snapshot.team?.heroes??[]} pending={pending} choose={choose}/> : tab==="results"||snapshot.status==="ended"?<RaidResults snapshot={snapshot}/> : tab==="team"?<section className="raid-team-list"><h2>ทีม {snapshot.team?.name}</h2>{snapshot.team?.heroes.map(hero=><div key={hero.id}><strong>{hero.displayName}</strong><span>HP {hero.hp}/100</span><span>{hero.cursor}/{snapshot.questionCount} ข้อ · {hero.score} คะแนน</span></div>)}</section>:<>
    {snapshot.team&&<RaidArena heroes={snapshot.team.heroes} bossHp={snapshot.team.bossHp} bossMaxHp={snapshot.team.bossMaxHp} events={snapshot.team.events} reduced={reduced} quality={quality} effectsEnabled={effectsEnabled} onCue={audio.cue}/>}
    <p className="raid-progress-copy" role="status">{!snapshot.own?.eligible?"คุณเข้าหลังเริ่มเกม รับชมทีมได้ คะแนนและจำนวนสมาชิกที่ล็อกไว้จะไม่เปลี่ยน":snapshot.own.finished?`ตอบครบ ${snapshot.questionCount} ข้อแล้ว รับชมทีมและอันดับต่อได้`:snapshot.own.hp===0?"HP 0 · ตอบถูกเพื่อฟื้นเพื่อนหนึ่งคน +10 HP (ทีมคนเดียวฟื้นตัวเอง)":"ตอบถูกเพื่อโจมตีบอส คุณทำข้อต่อไปได้ทันที"}</p>
   </>}
  </div>
  {question&&snapshot.status==="running"&&state!=="expired"&&<RaidQuestionModal key={question.id} question={question} score={snapshot.own?.score??0} muted={audio.muted} onMute={()=>void audio.toggle()} deadline={snapshot.deadline} serverNow={snapshot.serverNow} total={snapshot.questionCount} state={state} warnings={snapshot.warnings} visibilityEnabled={snapshot.visibilityEnabled} feedback={feedback} error={error} onSubmit={(answerText,selectedOptionId)=>{setHeldQuestion(question);const payload={questionId:question.id,displayIndex:question.displayIndex,answerText,selectedOptionId,idempotencyKey:crypto.randomUUID()};submitted.current=payload;void resolve(payload);}} onRetry={()=>{if(submitted.current)void resolve(submitted.current);else void refresh();}}/>}
 </div>;
}

