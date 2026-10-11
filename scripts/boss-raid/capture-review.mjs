// Local fixture screenshots/metrics. No production credentials or remote writes.
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const server=spawn(process.execPath,['scripts/start-google-test-server.mjs'],{env:{...process.env,RUN_RAID_TESTS:'1'},stdio:['ignore','ignore','pipe']});
let serverErrors='';server.stderr.on('data',data=>{serverErrors+=data.toString();});
const root='.impeccable/review/boss-raid';await mkdir(root,{recursive:true});const report=[];
const origin='http://127.0.0.1:3110',fixture='http://127.0.0.1:3111';
let browser;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(page,path,data){return page.evaluate(async({path,data})=>{const r=await fetch(path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});if(!r.ok)throw new Error(`Fixture app API ${r.status}`);return r.json();},{path,data});}
async function login(page,email,code){await page.goto(origin+'/login');await page.getByRole('button',{name:'เข้าสู่ระบบด้วย Google',exact:true}).click();await page.getByRole('link',{name:email,exact:true}).click();if(code){await page.getByLabel('รหัสประจำตัวนักเรียน',{exact:true}).fill(code);await page.getByRole('button',{name:'ตรวจสอบรหัส',exact:true}).click();await page.getByRole('button',{name:'ยืนยันและเข้าเกม',exact:true}).click();await page.waitForURL(/\/join$/);}}
async function capture(page,name,width,height){await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);await wait(700);await page.screenshot({path:`${root}/${name}.png`,fullPage:true,animations:'disabled'});report.push({name,viewport:{width,height},...await page.evaluate(()=>({documentOverflow:document.documentElement.scrollWidth>innerWidth,canvas:document.querySelectorAll('canvas').length,dialog:!!document.querySelector('dialog[open]'),dialogBounds:document.querySelector('dialog[open]')?.getBoundingClientRect().toJSON(),confirmBounds:document.querySelector('dialog[open] .raid-question-footer button')?.getBoundingClientRect().toJSON(),answerBounds:document.querySelector('dialog[open] .raid-text-answer input')?.getBoundingClientRect().toJSON()}))});}
try {
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/login')).ok)break;}catch{}await wait(200);if(i===99)throw new Error('Fixture server failed: '+serverErrors);}
 browser=await chromium.launch({headless:true});
 const people=[['pupil@example.com','01234'],['other@example.com','01235'],['third@example.com','01236'],['fourth@example.com','01237'],['fifth@example.com','01238']];
 for(const n of [1,2,3,4,5]){
  await fetch(fixture+'/__test/reset',{method:'POST'});await fetch(fixture+'/__test/raid-bank',{method:'POST'});
  const teacherContext=await browser.newContext({viewport:{width:1440,height:900}});const teacher=await teacherContext.newPage();await login(teacher,'piyawatpiwsiri@gmail.com');await teacher.goto(origin+'/teacher/rooms/new');
  if(n===1){await teacher.getByLabel('Boss Raid · Time Attack').check();await capture(teacher,'create-desktop',1440,900);await capture(teacher,'create-mobile',390,844);}else await teacher.getByLabel('Boss Raid · Time Attack').check();
  await teacher.setViewportSize({width:1440,height:900});await teacher.getByLabel('ชื่อกิจกรรม',{exact:true}).fill('ร่วมทีมพิชิตมังกรเงา');await teacher.getByLabel('จำนวนทีม',{exact:true}).fill('1');await teacher.getByRole('button',{name:'สร้างห้อง Boss Raid',exact:true}).click();await teacher.waitForURL(/\/raid\/dashboard$/);const room=teacher.url().match(/rooms\/(\d{4})/)[1];
  const contexts=[];const pupils=[];
  for(let i=0;i<n;i++){const context=await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);const pupil=await context.newPage();pupils.push(pupil);await login(pupil,people[i][0],people[i][1]);await pupil.goto(origin+`/join?room_code=${room}`);await pupil.getByRole('button',{name:/ทีม 1/}).click();await pupil.waitForURL(/\/raid$/);}
  if(n===5)await capture(pupils[0],'lobby-mobile',390,844);
  await teacher.getByRole('button',{name:'เริ่ม Boss Raid',exact:true}).click();await teacher.locator('canvas').waitFor();await wait(2000);
  await capture(teacher,`arena-${n}-desktop`,1440,900);await capture(teacher,`arena-${n}-mobile`,390,844);
  if(n===5){await capture(teacher,'arena-5-teacher-320',320,700);await capture(teacher,'arena-5-tablet',1024,768);
   const pupil=pupils[0];let snapshot=await api(pupil,`/api/raid/${room}/snapshot`);
   while(snapshot.question&&!snapshot.question.imageUrl){const q=snapshot.question;const correct=await(await fetch(fixture+`/__test/raid-correct-option?question=${q.id}`)).json();await api(pupil,`/api/raid/${room}/answer`,{questionId:q.id,displayIndex:q.displayIndex,idempotencyKey:crypto.randomUUID(),answerText:correct.selectedOptionId?null:'5',selectedOptionId:correct.selectedOptionId});snapshot=await api(pupil,`/api/raid/${room}/snapshot`);}
   await pupil.reload();await pupil.locator('.raid-question-dialog').waitFor();await capture(pupil,'question-user-320',320,700);await capture(pupil,'question-keyboard-320',320,400);
   for(const [kind,name,index] of [['multiple_choice','question-choice-320',1],['true_false','question-true-false-320',2]]){
    const answering=pupils[index];let current=await api(answering,`/api/raid/${room}/snapshot`);
    while(current.question&&current.question.questionType!==kind){const q=current.question;const correct=await(await fetch(fixture+`/__test/raid-correct-option?question=${q.id}`)).json();await api(answering,`/api/raid/${room}/answer`,{questionId:q.id,displayIndex:q.displayIndex,idempotencyKey:crypto.randomUUID(),answerText:correct.selectedOptionId?null:'5',selectedOptionId:correct.selectedOptionId});current=await api(answering,`/api/raid/${room}/snapshot`);}
    if(!current.question)throw new Error(`Missing required ${kind} capture`);
    await answering.reload();await answering.locator('.raid-question-dialog').waitFor();await capture(answering,name,320,700);
   }
   while(snapshot.question){const q=snapshot.question;const correct=await(await fetch(fixture+`/__test/raid-correct-option?question=${q.id}`)).json();await api(pupil,`/api/raid/${room}/answer`,{questionId:q.id,displayIndex:q.displayIndex,idempotencyKey:crypto.randomUUID(),answerText:correct.selectedOptionId?null:'5',selectedOptionId:correct.selectedOptionId});snapshot=await api(pupil,`/api/raid/${room}/snapshot`);}
   await pupil.reload();await pupil.getByRole('status').filter({hasText:'ตอบครบ 10 ข้อแล้ว'}).waitFor();await pupil.locator('canvas').waitFor();await wait(1200);await capture(pupil,'arena-5-user-320',320,700);
   for(const [index,wrongCount] of [[3,4],[4,6]]){
    for(let i=0;i<wrongCount;i++){const s=await api(pupils[index],`/api/raid/${room}/snapshot`);const q=s.question;const correct=await(await fetch(fixture+`/__test/raid-correct-option?question=${q.id}`)).json();const wrong=q.options.find(o=>o.id!==correct.selectedOptionId)?.id??null;await api(pupils[index],`/api/raid/${room}/answer`,{questionId:q.id,displayIndex:q.displayIndex,idempotencyKey:crypto.randomUUID(),answerText:wrong?null:'wrong',selectedOptionId:wrong});}
   }
   await wait(2400);await capture(teacher,'arena-injured-mobile',390,844);
   {const s=await api(pupils[4],`/api/raid/${room}/snapshot`);const q=s.question;const correct=await(await fetch(fixture+`/__test/raid-correct-option?question=${q.id}`)).json();const wrong=q.options.find(o=>o.id!==correct.selectedOptionId)?.id??null;await api(pupils[4],`/api/raid/${room}/answer`,{questionId:q.id,displayIndex:q.displayIndex,idempotencyKey:crypto.randomUUID(),answerText:wrong?null:'wrong',selectedOptionId:wrong});}
   await wait(2400);await capture(teacher,'arena-zero-mobile',390,844);
   await pupil.setViewportSize({width:390,height:844});
   // Bounded local frame-time sample with one active selected canvas.
   await teacher.setViewportSize({width:1440,height:900});const metrics=await teacher.evaluate(async()=>{const samples=[];let previous=performance.now();await new Promise(resolve=>{const frame=now=>{samples.push(now-previous);previous=now;if(samples.length===120)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});samples.sort((a,b)=>a-b);return {frameP50Ms:samples[60],frameP95Ms:samples[114],jsHeapBytes:performance.memory?.usedJSHeapSize??null,scope:'Headless desktop Chromium fixture; not a low-end mobile GPU guarantee'};});report.push({name:'local-frame-sample',...metrics});
   await api(teacher,`/api/teacher/raid/${room}/control`,{command:'end'});await teacher.getByRole('button',{name:'อันดับและผล',exact:true}).click();await teacher.getByRole('button',{name:'ดาวน์โหลดสรุป CSV',exact:true}).waitFor();await capture(teacher,'results-desktop',1440,900);await capture(teacher,'results-mobile',390,844);
  }else await api(teacher,`/api/teacher/raid/${room}/control`,{command:'end'});
  await Promise.all(contexts.map(c=>c.close()));await teacherContext.close();
 }
 await writeFile(`${root}/metrics.json`,JSON.stringify(report,null,2));console.log(`Captured ${report.filter(r=>r.viewport).length} required views; metrics: ${root}/metrics.json`);
}finally{await browser?.close();server.kill('SIGTERM');}
