"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { RaidTeamPanel } from "./RaidTeamPanel";
import { Settings2, Swords, Trophy, Users } from "lucide-react";
import type { RaidAnswerResult, RaidPresentation, RaidQuestion, RaidSnapshot } from "../types";
import type { HeroType } from "../assets/manifest";
import type { CombatScene } from "../engine/combat-scene";
import { useRaidTabs } from "../hooks/use-raid-tabs";
import { useRaidSnapshot } from "../hooks/use-raid-snapshot";
import { useRaidAudio } from "../hooks/use-raid-audio";
import { useRaidVisibility } from "../hooks/use-raid-visibility";
import { useRaidClock } from "../hooks/use-raid-clock";
import { RaidArena } from "./RaidArena";
import { HeroSelectLobby } from "./HeroSelectLobby";
import { RaidQuestionModal, type QuestionState } from "./RaidQuestionModal";
import { RaidResults } from "./RaidResults";
import { RaidAudioSettings } from "./RaidAudioSettings";
import { RaidStudentHud } from "./RaidStudentHud";
import "../raid.css";
type Submission={questionId:string;displayIndex:number;answerText:string|null;selectedOptionId:string|null;idempotencyKey:string};
export function RaidClient({initial,sessionId}:{initial:RaidSnapshot;sessionId:string}) {
 const {snapshot,error:connectionError,connected,refresh,refreshForeground,foreground,getCurrent}=useRaidSnapshot({...initial,team:initial.team?{...initial.team,events:[]}:null},sessionId);
 const {tab,setTab,swipe,panelRef}=useRaidTabs(["battle","team","results"],"battle");
 const [state,setState]=useState<QuestionState>(initial.presentation?"presenting":"open"),[heldQuestion,setHeldQuestion]=useState<RaidQuestion|null>(initial.question);
 const question=state==="resolving"||state==="error"?heldQuestion:snapshot.question;
 const [nameDraft,setNameDraft]=useState<{teamId:string;value:string}|null>(null),[teamNotice,setTeamNotice]=useState("");
 const [heroPreview,setHeroPreview]=useState<HeroType|null>(null);
 const [pending,setPending]=useState(false),[error,setError]=useState(""),[feedback,setFeedback]=useState(""),[partyOpen,setPartyOpen]=useState(false);
 const busy=useRef(false),submitted=useRef<Submission|null>(null),scene=useRef<CombatScene|null>(null),active=useRef<RaidPresentation|null>(null),seen=useRef(new Set<string>()),timer=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true),settled=useRef(false);
 const audio=useRaidAudio(snapshot.team?.events??[],snapshot.team?.id,{sourceTeamId:snapshot.team?.id,eventSeq:snapshot.team?.eventSeq,status:snapshot.status,phase:snapshot.team?.phase,deadline:snapshot.deadline,serverNow:snapshot.serverNow,heroes:snapshot.team?.heroes});
 const {seconds}=useRaidClock(snapshot.deadline,snapshot.serverNow,snapshot.status==="ended");
 const [effectsEnabled,setEffectsEnabled]=useState(true),[settings,setSettings]=useState(false),[reduced,setReduced]=useState(false),[quality,setQuality]=useState<"full"|"low">("full");
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 const finish=useCallback(async function finish(){active.current=null;await refresh();if(!alive.current)return;const current=getCurrent(),last=submitted.current;if(current.status==="running"&&last&&(current.own?.cursor??0)<=last.displayIndex){setError("คำตอบบันทึกแล้ว กำลังรอเชื่อมต่อเพื่อเปิดโจทย์ถัดไป");timer.current=setTimeout(()=>void finish(),1000);return;}busy.current=false;setPending(false);setError("");setState("open");},[refresh,getCurrent]);
 const begin=useCallback((presentation:RaidPresentation,recovery=false,now?:string)=>{
  if(seen.current.has(presentation.id))return;seen.current.add(presentation.id);if(seen.current.size>100)seen.current.delete(seen.current.values().next().value!);
  busy.current=true;active.current=presentation;setState("presenting");setPending(false);setSettings(false);setTab("battle");
  if(timer.current)clearTimeout(timer.current);
  const duration=recovery?Math.max(0,Date.parse(presentation.availableAt)-Date.parse(now??initial.serverNow)):presentation.durationMs;
  settled.current=recovery||!presentation.events.length;const minimum=performance.now()+Math.min(3000,duration);
  if(!recovery&&presentation.events.length&&scene.current)void scene.current.presentAnswer(presentation).then(()=>{settled.current=true;});
  const check=()=>{if(!alive.current)return;const left=minimum-performance.now();if(left>0||!settled.current&&left> -500){timer.current=setTimeout(check,Math.max(20,Math.min(100,left)));return;}if(!recovery&&presentation.events.length)scene.current?.finishAnswer();void finish();};
  timer.current=setTimeout(check,Math.max(20,Math.min(100,duration)));
 },[finish,initial.serverNow,setTab]);
 const onScene=useCallback((current:CombatScene|null)=>{scene.current=current;if(current&&active.current?.events.length&&!initial.presentation)void current.presentAnswer(active.current).then(()=>{settled.current=true;});},[initial.presentation]);
 useEffect(()=>{if(snapshot.presentation&&!busy.current&&(state==="open"||state==="error"||initial.presentation)){setFeedback("คำตอบถูกบันทึกแล้ว · รอจบช่วงแสดงผล");begin(snapshot.presentation,true,snapshot.serverNow);}},[snapshot.presentation,snapshot.serverNow,begin,state,initial.presentation]);
 useEffect(()=>{if(snapshot.status==="ended"){if(timer.current)clearTimeout(timer.current);active.current=null;busy.current=false;scene.current?.finishAnswer();}},[snapshot.status]);
 useEffect(()=>{if(snapshot.status==="running"&&snapshot.deadline&&seconds===0)void refresh();},[seconds,snapshot.deadline,snapshot.status,refresh]);
 const post=useCallback(async(path:string,body:unknown)=>{const response=await fetch(`/api/raid/${initial.roomCode}/${path}`,{method:"POST",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/json","x-client-session":sessionId},body:JSON.stringify(body)});const result=await response.json();if(!response.ok&&result.redirectTo)location.assign(result.redirectTo);if(!response.ok&&!result.code){throw new Error(result.error??"ส่งคำขอไม่สำเร็จ");}return result as RaidAnswerResult&{error?:string};},[initial.roomCode,sessionId]);
 const resolve=useCallback(async(payload:Submission)=>{
  if(busy.current)return;busy.current=true;setPending(true);setState("resolving");setError("");
  try{const result=await post("answer",payload);if(!alive.current)return;
   if(!result.ok){busy.current=false;setPending(false);if(result.code==="RATE_LIMITED"){setError("ส่งคำตอบถี่เกินไป รอ 10 วินาทีแล้วกดส่งคำตอบเดิมอีกครั้ง");setState("error");return;}await refresh();setError(result.error??"คำถามหรือเวลาเปลี่ยนแล้ว ตรวจสถานะล่าสุด");setState("open");return;}
   setFeedback(result.correct?result.noHealTarget?"ตอบถูก · ไม่มีเพื่อนที่ต้องฟื้น HP":result.healAmount?`ตอบถูก · ฟื้น HP ${result.healAmount}`:`ตอบถูก +${result.awardedPoints} คะแนน${result.damage?` · ดาเมจ ${result.damage}`:""}`:result.damageTaken?`ตอบผิด · เสีย HP ${result.damageTaken} · ดูการต่อสู้แล้วลุยต่อ`:"ตอบผิด · ดูการต่อสู้แล้วลุยต่อ");
   const p=result.presentation??{id:payload.idempotencyKey,durationMs:3000,availableAt:new Date(Date.parse(result.serverNow??snapshot.serverNow)+3000).toISOString(),events:[]};begin(p);await refresh();
  }catch{if(!alive.current)return;busy.current=false;setPending(false);setError("การเชื่อมต่อขาดหาย คำตอบอาจบันทึกแล้ว กดตรวจสถานะและส่งคำตอบเดิมอีกครั้ง");setState("error");}
 },[post,refresh,begin,snapshot.serverNow]);
 const report=useCallback(async(input:{questionId:string;displayIndex:number;eventId:string;durationMs:number})=>{if(busy.current)return;setHeldQuestion(question);busy.current=true;setPending(true);setState("resolving");try{const r=await post("visibility",input);setFeedback(r.status==="skipped"?"ออกจากหน้าเกิน 3 วินาทีครั้งที่ 3 · ข้ามข้อนี้แล้ว":r.status==="warning"?`ออกจากหน้าเกมเกิน 3 วินาที · เตือน ${r.warnings}/2`:"");await refresh();}catch{setError("ส่งเหตุการณ์ออกจากหน้าไม่สำเร็จ กดเชื่อมต่ออีกครั้ง");}finally{busy.current=false;setPending(false);setState("open");}},[post,refresh,question]);
 useRaidVisibility(question,snapshot.visibilityEnabled&&snapshot.status==="running"&&Boolean(snapshot.own?.eligible)&&state==="open"&&!pending,report);
 const choose=async(heroType:string)=>{if(busy.current)return;setHeroPreview(heroType as HeroType);busy.current=true;setPending(true);setError("");try{const r=await post("hero",{heroType});if(!r.ok)setError(r.error??"เลือกตัวละครไม่ได้ ลองใหม่หรือเช็กว่าเกมเริ่มแล้วหรือยัง");await refresh();}catch(e){setError(e instanceof Error?e.message:"บันทึกตัวละครไม่สำเร็จ");}finally{busy.current=false;setPending(false);setHeroPreview(null);}};
 const rename=async()=>{if(busy.current||!snapshot.team)return;busy.current=true;setPending(true);setError("");setTeamNotice("");try{const r=await post("team",{teamId:snapshot.team.id,teamName:nameDraft?.teamId===snapshot.team.id?nameDraft.value:snapshot.team.name});if(!r.ok)setError(r.error??"บันทึกชื่อทีมไม่สำเร็จ");else{setNameDraft({teamId:snapshot.team.id,value:r.teamName??(nameDraft?.value??snapshot.team.name).trim().replace(/\s+/g," ")});setTeamNotice("บันทึกชื่อทีมแล้ว");}await refresh();}catch(e){setError(e instanceof Error?e.message:"บันทึกชื่อทีมไม่สำเร็จ");}finally{busy.current=false;setPending(false);}};
 const showQuestion=Boolean(question)&&snapshot.status==="running"&&state!=="presenting"&&(!snapshot.deadline||seconds>0);
 const hud={heroes:snapshot.team?.heroes??[],ownId:snapshot.own?.id,deadline:snapshot.deadline,serverNow:snapshot.serverNow,open:partyOpen,onToggle:()=>setPartyOpen(v=>!v)};
 const tabs=[{id:"battle",label:"สนามต่อสู้",icon:Swords},{id:"team",label:"ทีมของฉัน",icon:Users},{id:"results",label:"อันดับ",icon:Trophy}];
 const events=(snapshot.rulesVersion??1)>=2?snapshot.team?.events.filter(e=>e.actorId!==snapshot.own?.id&&e.targetId!==snapshot.own?.id)??[]:snapshot.team?.events??[];
 return <div className="raid-room" data-presentation={state==="presenting"} onClickCapture={e=>{if(e.target instanceof Element&&e.target.closest('button:not(:disabled)'))audio.button();}}>
  {(pending||foreground)&&!showQuestion&&<LoadingIndicator overlay label="กำลังบันทึก…"/>}
  <header className="raid-room-header"><div><h1>{snapshot.title}</h1><p>Boss Raid · ห้อง {snapshot.roomCode} · {snapshot.team?.name}</p></div>{!showQuestion&&<RaidStudentHud {...hud} ended={snapshot.status==="ended"} id="raid-room-party"/>}{!showQuestion&&<RaidAudioSettings audio={audio}/>}<button className="raid-icon" aria-label="ตั้งค่าภาพ" disabled={state==="presenting"} aria-expanded={settings} onClick={()=>setSettings(!settings)}><Settings2 size={20}/></button></header>
  {settings&&<div className="raid-settings"><label><input type="checkbox" checked={effectsEnabled} onChange={e=>setEffectsEnabled(e.target.checked)}/>เอฟเฟกต์ฉาก</label><label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>ลดการเคลื่อนไหว</label><label>คุณภาพภาพ<select value={quality} onChange={e=>setQuality(e.target.value as "full"|"low")}><option value="full">เต็ม</option><option value="low">ประหยัด</option></select></label></div>}
  {(!connected||error)&&<div role="status" className="raid-connection"><span>{error||connectionError} · เวลาเกมยังเดินต่อ</span><button onClick={()=>{setError("");void refreshForeground();}}>เชื่อมต่ออีกครั้ง</button></div>}
  <nav className="raid-tabs" aria-label="เมนูห้อง Boss Raid">{tabs.map(t=><button key={t.id} aria-current={tab===t.id?"page":undefined} disabled={state==="presenting"&&snapshot.status!=="ended"} onClick={()=>setTab(t.id)}><t.icon size={18} aria-hidden="true"/>{t.label}</button>)}</nav>
  <div ref={panelRef} className="raid-room-content" tabIndex={0} role="region" aria-label="พื้นที่เกมและผล" {...(state==="presenting"?{}:swipe)}>
   <section className="raid-view-panel" hidden={snapshot.status==="ended"||tab!=="battle"&&state!=="presenting"}>
   {snapshot.status==="lobby"?<HeroSelectLobby own={snapshot.own?{...snapshot.own,heroType:heroPreview??snapshot.own.heroType}:null} heroes={snapshot.team?.heroes??[]} pending={pending} choose={choose} allowDuplicates={(snapshot.rulesVersion??1)>=2}/>:<>
    {snapshot.team&&<RaidArena heroes={snapshot.team.heroes} bossHp={snapshot.team.bossHp} bossMaxHp={snapshot.team.bossMaxHp} events={events} reduced={reduced} quality={quality} effectsEnabled={effectsEnabled} onCue={audio.cue} onScene={onScene}/>}
    {state==="presenting"&&<div className="raid-combat-feedback" role="status" aria-live="polite"><strong>{feedback}</strong><span>กำลังต่อสู้ · โจทย์ถัดไปจะขึ้นเมื่อจบ</span></div>}
    <p className="raid-progress-copy" role="status">{!snapshot.own?.eligible?"คุณเข้าหลังเริ่มเกม รับชมทีมได้ คะแนนและจำนวนสมาชิกที่ล็อกไว้จะไม่เปลี่ยน":snapshot.own.finished?`ตอบครบ ${snapshot.questionCount} ข้อแล้ว รับชมทีมและอันดับต่อได้`:snapshot.own.hp===0?"HP 0 · ตอบถูกเพื่อฟื้นเพื่อนหนึ่งคน +10 HP (ทีมคนเดียวฟื้นตัวเอง)":"ตอบถูกเพื่อโจมตีบอส · ดูการต่อสู้ก่อนลุยข้อถัดไป"}</p>
   </>}
   </section>
   {snapshot.status!=="ended"&&tab==="team"&&state!=="presenting"&&<><RaidTeamPanel snapshot={snapshot} name={nameDraft?.teamId===snapshot.team?.id?nameDraft!.value:snapshot.team?.name??""} onName={value=>{setNameDraft({teamId:snapshot.team!.id,value});setTeamNotice("");}} onSave={()=>void rename()} pending={pending}/>{teamNotice&&<p role="status" className="raid-save-notice">{teamNotice}</p>}</>}
   {(snapshot.status==="ended"||tab==="results"&&state!=="presenting")&&<RaidResults snapshot={snapshot}/>}
  </div>
  {showQuestion&&question&&<RaidQuestionModal key={question.id} question={question} score={snapshot.own?.score??0}  deadline={snapshot.deadline} serverNow={snapshot.serverNow} total={snapshot.questionCount} syncing={foreground} state={state} warnings={snapshot.warnings} visibilityEnabled={snapshot.visibilityEnabled} feedback={state==="error"?feedback:""} error={error} heroes={hud.heroes} ownId={hud.ownId} partyOpen={partyOpen} onPartyToggle={hud.onToggle} autoConfirm={(snapshot.rulesVersion??1)>=2} onSubmit={(answerText,selectedOptionId)=>{setHeldQuestion(question);const payload={questionId:question.id,displayIndex:question.displayIndex,answerText,selectedOptionId,idempotencyKey:crypto.randomUUID()};submitted.current=payload;void resolve(payload);}} onRetry={()=>{if(submitted.current)void resolve(submitted.current);else void refresh();}}/>}
 </div>;
}
