"use client";
import { useEffect, useRef, useState } from "react";
import { MathText } from "@/components/ui/math-text";
import { QuestionImage } from "@/components/ui/question-image";
import type { RaidQuestion } from "../types";
import { RaidTimer } from "./RaidTimer";
import { VolumeX } from "lucide-react";
export type QuestionState="loading"|"open"|"confirming"|"resolving"|"fading"|"complete"|"expired"|"error";
export function RaidQuestionModal({question,total,state,warnings,visibilityEnabled,feedback,error,onSubmit,onRetry,deadline,serverNow,score,muted=true,onMute}:{question:RaidQuestion;total:number;state:QuestionState;warnings:number;visibilityEnabled:boolean;feedback:string;error:string;onSubmit:(answerText:string|null,selectedOptionId:string|null)=>void;onRetry:()=>void;deadline:string|null;serverNow:string;score:number;muted?:boolean;onMute?:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);const [answer,setAnswer]=useState("");const [option,setOption]=useState("");const [confirming,setConfirming]=useState(false);
 const canEdit=state==="open"||state==="confirming";const valid=question.questionType==="short_text"?Boolean(answer.trim()):Boolean(option);
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 return <dialog ref={dialog} className="raid-question-dialog" data-state={state} aria-labelledby="raid-question-title" onCancel={e=>e.preventDefault()}>
  <form onSubmit={e=>{e.preventDefault();if(!canEdit||!valid)return;if(!confirming){setConfirming(true);return;}onSubmit(question.questionType==="short_text"?answer.trim():null,question.questionType==="short_text"?null:option);}}>
   <div className="raid-question-heading"><div className="raid-question-info"><h2 id="raid-question-title">ข้อ {question.displayIndex+1} / {total}</h2><p className="raid-question-points"><span>ข้อนี้ {question.points} คะแนน</span><strong>คะแนนสะสม {score.toLocaleString()}</strong></p></div><RaidTimer deadline={deadline} serverNow={serverNow}/>{!muted&&onMute&&<button type="button" className="raid-icon" aria-label="ปิดเสียงเกม" title="ปิดเสียงเกม" onClick={onMute}><VolumeX size={20}/></button>}</div>
   <div className="raid-question-body" tabIndex={0} role="region" aria-label="โจทย์คำถาม"><MathText text={question.questionText}/>{question.imageUrl && <QuestionImage src={question.imageUrl} alt={`รูปประกอบคำถามข้อ ${question.displayIndex+1}`}/>}</div>
   <div className="raid-answer-area">
    {question.questionType==="short_text"?<label className="raid-text-answer">คำตอบของคุณ<input autoFocus value={answer} maxLength={2000} disabled={!canEdit} onChange={e=>{setAnswer(e.target.value);setConfirming(false);}} placeholder="พิมพ์คำตอบ" onKeyDown={e=>{if(e.key==="Enter"&&e.nativeEvent.isComposing)e.preventDefault();}}/></label>:<fieldset className="raid-options"><legend>เลือกคำตอบหนึ่งข้อ</legend>{question.options.map((o,i)=><label key={o.id} data-selected={option===o.id}><input type="radio" name="raid_option" value={o.id} checked={option===o.id} disabled={!canEdit} onChange={()=>{setOption(o.id);setConfirming(false);}} autoFocus={i===0}/><MathText inline text={o.optionText}/></label>)}</fieldset>}
   </div>
   <div className="raid-question-footer">
    {visibilityEnabled && <p className="raid-visibility-copy">ออกจากหน้าเกิน 3 วินาที: เตือน {Math.min(2,warnings)} / 2 · ครั้งที่ 3 ข้ามข้อนี้</p>}
    <p role="status" tabIndex={0} aria-live="polite" className="raid-feedback" data-guidance={!error&&!feedback&&!confirming}>{error||feedback||(confirming?"ตรวจคำตอบแล้ว กดยืนยันเพื่อส่ง":"ตอบตามจังหวะของคุณ เวลาเดินต่อเนื่องทุกข้อ")}</p>
    {state==="error"?<button type="button" className="raid-primary" onClick={onRetry}>ส่งคำตอบเดิมอีกครั้ง</button>:<button className="raid-primary" type="submit" disabled={!valid||!canEdit}>{state==="resolving"?"กำลังบันทึก…":state==="fading"?"บันทึกแล้ว":confirming?"ยืนยันคำตอบ":"ตรวจคำตอบก่อนส่ง"}</button>}
   </div>
  </form>
 </dialog>;
}

