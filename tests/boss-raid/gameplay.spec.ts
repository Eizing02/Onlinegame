import { test,expect,type Page } from '@playwright/test';
import { browserRequest } from '../browser-request';
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {profileForStage,type SceneDefinition} from '../../src/features/boss-raid/scenes/geometry';
import registry from '../../src/features/boss-raid/scenes/registry.json';
const fixture='http://127.0.0.1:3111';
async function login(page:Page,email:string,code?:string) {
 await page.goto('/login');await page.getByRole('button',{name:'เข้าสู่ระบบด้วย Google',exact:true}).click();await page.getByRole('link',{name:email,exact:true}).click();
 if(code){await page.getByLabel('รหัสประจำตัวนักเรียน',{exact:true}).fill(code);await page.getByRole('button',{name:'ตรวจสอบรหัส',exact:true}).click();await page.getByRole('button',{name:'ยืนยันและเข้าเกม',exact:true}).click();await expect(page).toHaveURL(/\/join$/);}
}
async function join(page:Page,room:string) {
 await page.goto(`/join?room_code=${room}`);await page.getByRole('button',{name:/ทีม 1/}).click();await page.getByRole('button',{name:/^ยืนยันเข้าทีม/}).click();await expect(page).toHaveURL(new RegExp(`play/${room}/raid$`));
}
async function ready(page:Page,room:string){let state;await expect.poll(async()=>{state=await(await browserRequest(page,`/api/raid/${room}/snapshot`)).json();return Boolean(state.question)||Boolean(state.own?.finished)||state.status==='ended';}).toBe(true);return state!;}

test('Google classroom Raid: independent answer, idempotency, visibility, spectator, reconnect, end and access guards',async({browser,page,request})=>{
 await request.post(`${fixture}/__test/reset`);await request.post(`${fixture}/__test/raid-bank`);
 await login(page,'piyawatpiwsiri@gmail.com');expect((await request.get('http://127.0.0.1:3110/dev/boss-raid/scene')).status()).toBe(404);await page.goto('/teacher/rooms/new');
 await page.getByLabel('Boss Raid · Time Attack').check();await page.getByLabel('จำนวนทีม',{exact:true}).fill('2');await page.getByLabel('ชื่อกิจกรรม',{exact:true}).fill('ทดสอบ Boss Raid');
 await page.getByRole('button',{name:'สร้างห้อง Boss Raid',exact:true}).click();await expect(page).toHaveURL(/\/raid\/dashboard$/);const room=page.url().match(/rooms\/(\d{4})/)![1];
 const studentContext=await browser.newContext({baseURL:'http://127.0.0.1:3110'});const student=await studentContext.newPage();
 const otherContext=await browser.newContext({baseURL:'http://127.0.0.1:3110'});const other=await otherContext.newPage();
 try {
  await login(student,'pupil@example.com','01234');await join(student,room);await student.getByRole('button',{name:/นักรบ.*เลือกฮีโร่/}).click();
  await login(other,'other@example.com','01235');await join(other,room);await expect(other.getByRole('button',{name:/นักรบ/})).toBeEnabled();await other.getByRole('button',{name:/นักรบ.*เลือกฮีโร่/}).click();
  await page.getByRole('button',{name:'เริ่ม Boss Raid',exact:true}).click();await expect(student.locator('.raid-question-dialog')).toBeVisible();
  const snapshot=await (await browserRequest(student,`/api/raid/${room}/snapshot`)).json();
  expect(snapshot.team.memberCount).toBe(2);expect(JSON.stringify(snapshot)).not.toMatch(/correct_answer|isCorrect|correctAnswer/);
  const wrongTeacher=await browserRequest(student,`/api/teacher/raid/${room}/overview`);expect(wrongTeacher.status()).toBe(403);
  expect((await browserRequest(student,`/api/play/${room}`,{method:'POST',data:{action:'boost'}})).status()).toBe(409);
  expect((await browserRequest(page,`/api/teacher/rooms/${room}/control`,{method:'POST',data:{command:'reveal'}})).status()).toBe(409);
  const forged=await browserRequest(student,`/api/raid/${room}/answer`,{method:'POST',data:{questionId:snapshot.question.id,displayIndex:0,idempotencyKey:crypto.randomUUID(),answerText:'5',damage:999}});expect(forged.status()).toBe(400);
  const cookie=(await page.context().cookies()).map(c=>`${c.name}=${c.value}`).join('; ');
  const crossOrigin=await request.post(`http://127.0.0.1:3110/api/teacher/raid/${room}/control`,{headers:{Origin:'https://untrusted.example',Cookie:cookie},data:{command:'end'}});expect(crossOrigin.status()).toBe(403);
  const answer=await (await request.get(`${fixture}/__test/raid-correct-option?question=${snapshot.question.id}`,{maxRetries:1})).json();
  if(answer.selectedOptionId)await student.locator(`input[value="${answer.selectedOptionId}"]`).check();else await student.getByLabel('คำตอบของคุณ',{exact:true}).fill(answer.answerText);
  if(!answer.selectedOptionId)await student.getByRole('button',{name:'ตรวจคำตอบก่อนส่ง',exact:true}).click();const sentAt=Date.now();await student.getByRole('button',{name:/^ยืนยันคำตอบ/}).click();await expect(student.locator('.raid-question-dialog')).toHaveCount(0);await expect(student.locator('.raid-combat-feedback')).toBeVisible();
  await expect(student.locator('#raid-question-title')).toContainText('ข้อ 2 / 10');expect(Date.now()-sentAt).toBeGreaterThanOrEqual(2900);
  const after=await (await browserRequest(student,`/api/raid/${room}/snapshot`)).json();expect(after.own.score).toBe(10);expect(after.own.cursor).toBe(1);
  expect((await (await browserRequest(other,`/api/raid/${room}/snapshot`)).json()).own.cursor).toBe(0);
  await student.reload();await expect(student.locator('#raid-question-title')).toContainText('ข้อ 2 / 10');expect((await (await browserRequest(student,`/api/raid/${room}/snapshot`)).json()).own.score).toBe(10);
  for(let i=0;i<3;i++){const r=await browserRequest(student,`/api/raid/${room}/visibility`,{method:'POST',data:{questionId:after.question.id,displayIndex:1,eventId:crypto.randomUUID(),durationMs:3001}});expect(r.status()).toBe(200);expect((await r.json()).warnings).toBe(i+1);}
  await expect(student.locator('#raid-question-title')).toContainText('ข้อ 3 / 10');
  await expect(page.locator('canvas')).toHaveCount(1);await page.getByRole('button',{name:/ทีม 2.*0 คน/}).click();await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button',{name:'รายงานออกจากหน้า',exact:true}).click();await expect(page.getByRole('cell',{name:'ข้ามข้อแล้ว',exact:true})).toBeVisible();
  // A new participant after start is a spectator and receives no question.
  const lateContext=await browser.newContext({baseURL:'http://127.0.0.1:3110'});const late=await lateContext.newPage();
  try{await login(late,'third@example.com','01236');await join(late,room);const lateSnap=await(await browserRequest(late,`/api/raid/${room}/snapshot`)).json();expect(lateSnap.own.eligible).toBe(false);expect(lateSnap.question).toBeNull();expect(lateSnap.team.heroes).toHaveLength(2);await expect(late.locator('.raid-question-dialog')).toHaveCount(0);}finally{await lateContext.close();}
  await page.getByRole('button',{name:'จบเกมก่อนเวลา',exact:true}).click();await page.getByRole('button',{name:'ยืนยันจบเกมทุกทีม',exact:true}).click();
  await expect(student.getByRole('heading',{name:'ผล Boss Raid',exact:true})).toBeVisible();await expect(student.locator('.raid-question-dialog')).toHaveCount(0);
 }finally{await studentContext.close();await otherContext.close();}
});

for(const members of [1,3,5])test(`${members} real Google students: simultaneous independent progress, mixed questions and authoritative deadline`,async({browser,page,request})=>{
 await request.post(`${fixture}/__test/reset`);await request.post(`${fixture}/__test/raid-bank`);await login(page,'piyawatpiwsiri@gmail.com');await page.goto('/teacher/rooms/new');
 await page.getByLabel('Boss Raid · Time Attack').check();await page.getByLabel('จำนวนทีม',{exact:true}).fill('1');await page.getByRole('button',{name:'สร้างห้อง Boss Raid',exact:true}).click();await expect(page).toHaveURL(/\/raid\/dashboard$/);const room=page.url().match(/rooms\/(\d{4})/)![1];
 const people=[['pupil@example.com','01234'],['other@example.com','01235'],['third@example.com','01236'],['fourth@example.com','01237'],['fifth@example.com','01238']];
 const contexts=await Promise.all(people.slice(0,members).map(()=>browser.newContext({baseURL:'http://127.0.0.1:3110'})));
 try {
  const pupils=await Promise.all(contexts.map(c=>c.newPage()));
  for(let i=0;i<members;i++){await login(pupils[i],people[i][0],people[i][1]);await join(pupils[i],room);}
  if(members===1){await pupils[0].getByRole('button',{name:'ตั้งค่าเสียง',exact:true}).click();await expect(pupils[0].getByRole('button',{name:'ปิดเสียงเกม',exact:true})).toBeVisible();await pupils[0].keyboard.press('Escape');await pupils[0].setViewportSize({width:320,height:400});} await page.getByRole('button',{name:'เริ่ม Boss Raid',exact:true}).click();await expect(pupils[0].locator('.raid-question-dialog')).toBeVisible(); if(members===1){await pupils[0].locator('.raid-question-dialog').getByRole('button',{name:'ตั้งค่าเสียง',exact:true}).click();await expect(pupils[0].getByRole('button',{name:'ปิดเสียงเกม',exact:true})).toBeVisible();const visible=await pupils[0].locator('.raid-question-dialog').evaluate(dialog=>{const bounds=dialog.getBoundingClientRect(),button=dialog.querySelector('.raid-question-footer button')!.getBoundingClientRect();return button.bottom<=bounds.bottom&&button.height>=44;});expect(visible).toBe(true);await pupils[0].getByRole('button',{name:'ปิดเสียงเกม',exact:true}).click();await expect(pupils[0].getByRole('button',{name:'เปิดเสียงเกม',exact:true})).toBeVisible();await pupils[0].screenshot({path:'.impeccable/review/wallpaper-audio/raid-audio-320.png'});await pupils[0].getByRole('button',{name:'เปิดเสียงเกม',exact:true}).click();await pupils[0].keyboard.press('Escape');await expect(pupils[0].locator('.raid-question-dialog')).toBeVisible();await pupils[0].setViewportSize({width:320,height:700});}
  const states=await Promise.all(pupils.map(async p=>(await browserRequest(p,`/api/raid/${room}/snapshot`)).json()));
  expect(states[0].team.heroes).toHaveLength(members);expect(new Set(states[0].team.heroes.map((h:{heroType:string})=>h.heroType)).size).toBe(members);
  const deadlines=new Set(states.map(s=>s.deadline));expect(deadlines.size).toBe(1);
  await Promise.all(pupils.map(async(p,i)=>{const correct=await(await request.get(`${fixture}/__test/raid-correct-option?question=${states[i].question.id}`,{maxRetries:1})).json();const body={questionId:states[i].question.id,displayIndex:0,idempotencyKey:crypto.randomUUID(),answerText:correct.selectedOptionId?null:'5',selectedOptionId:correct.selectedOptionId};const replies=await Promise.all([browserRequest(p,`/api/raid/${room}/answer`,{method:'POST',data:body}),browserRequest(p,`/api/raid/${room}/answer`,{method:'POST',data:body})]);for(const reply of replies)expect(reply.status()).toBe(200);}));
  for(const p of pupils){const s=await(await browserRequest(p,`/api/raid/${room}/snapshot`)).json();expect(s.own.cursor).toBe(1);expect(s.own.score).toBe(10);}
  // Walk the full independently shuffled bank to exercise every typed/long/image question.
  let seenImage=false;const kinds=new Set();
  for(let i=1;i<10;i++){
   const current=await ready(pupils[0],room);kinds.add(current.question.questionType);seenImage ||=Boolean(current.question.imageUrl);
   if(members===1&&current.question.imageUrl){
    const pupil=pupils[0];await pupil.setViewportSize({width:320,height:400});await pupil.reload();await expect(pupil.locator('#raid-question-title')).toContainText(`ข้อ ${i+1} / 10`);await pupil.getByLabel('คำตอบของคุณ',{exact:true}).fill('5');
    await expect(pupil.locator('.raid-question-points')).toContainText(`คะแนนสะสม ${i*10}`);
    for(const confirming of [false,true]){
     if(confirming)await pupil.getByRole('button',{name:'ตรวจคำตอบก่อนส่ง',exact:true}).click();
     const visible=await pupil.locator('.raid-question-dialog').evaluate(dialog=>{const bounds=dialog.getBoundingClientRect();const input=dialog.querySelector('input')!.getBoundingClientRect(),button=dialog.querySelector('.raid-question-footer button')!.getBoundingClientRect();return input.top>=bounds.top&&input.bottom<=bounds.bottom&&button.top>=bounds.top&&button.bottom<=bounds.bottom&&button.height>=44;});expect(visible).toBe(true);
    }
    await pupil.keyboard.press('Escape');await expect(pupil.locator('.raid-question-dialog')).toBeVisible();await pupil.setViewportSize({width:320,height:700});
    await pupil.locator('.raid-question-body').evaluate(body=>body.scrollTop=body.scrollHeight);await pupil.getByRole('button',{name:'ขยายรูปคำถาม',exact:true}).click();await expect(pupil.getByRole('dialog',{name:'รูปคำถาม',exact:true})).toBeVisible();await pupil.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();await expect(pupil.locator('.raid-question-dialog')).toBeVisible();
   }
   const correct=await(await request.get(`${fixture}/__test/raid-correct-option?question=${current.question.id}`,{maxRetries:1})).json();
   const body={questionId:current.question.id,displayIndex:i,idempotencyKey:crypto.randomUUID(),answerText:correct.selectedOptionId?null:'5',selectedOptionId:correct.selectedOptionId};expect((await browserRequest(pupils[0],`/api/raid/${room}/answer`,{method:'POST',data:body})).status()).toBe(200);
  }
  kinds.add(states[0].question.questionType);seenImage ||=Boolean(states[0].question.imageUrl);expect([...kinds].sort()).toEqual(['multiple_choice','short_text','true_false']);expect(seenImage).toBe(true);
  await pupils[0].reload();await expect(pupils[0].locator('.raid-question-dialog')).toHaveCount(0);await expect(pupils[0].getByRole('status').filter({hasText:'ตอบครบ 10 ข้อแล้ว'})).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await request.post(`${fixture}/__test/raid-expire?session=${states[0].sessionId}`);
  await expect(pupils[0].getByRole('heading',{name:'ผล Boss Raid',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'อันดับและผล',exact:true}).click();await expect(page.getByRole('button',{name:'ดาวน์โหลดสรุป CSV',exact:true})).toBeVisible();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลดสรุป CSV',exact:true}).click();expect((await downloadPromise).suggestedFilename()).toBe(`boss-raid-${room}.csv`);
  const audit=await new AxeBuilder({page:pupils[0]}).include('.raid-room').analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
  if(members===1){const content=pupils[0].locator('.raid-room-content');await content.focus();await pupils[0].keyboard.press('PageDown');await expect.poll(()=>content.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);await content.evaluate(e=>e.scrollTop=0);await pupils[0].screenshot({path:'.impeccable/review/boss-raid/results-student-keyboard-320.png',fullPage:true});}
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});

test('solo knockout, self-revival, kill once and shared mutation throttle',async({browser,page,request})=>{
 await request.post(`${fixture}/__test/reset`);await request.post(`${fixture}/__test/raid-bank`);
 await login(page,'piyawatpiwsiri@gmail.com');await page.goto('/teacher/rooms/new');await page.getByLabel('Boss Raid · Time Attack').check();await page.getByLabel('จำนวนทีม',{exact:true}).fill('1');await page.getByRole('button',{name:'สร้างห้อง Boss Raid',exact:true}).click();await expect(page).toHaveURL(/\/raid\/dashboard$/);const room=page.url().match(/rooms\/(\d{4})/)![1];
 const context=await browser.newContext({baseURL:'http://127.0.0.1:3110',viewport:{width:320,height:700}});const pupil=await context.newPage();
 try{
  await login(pupil,'pupil@example.com','01234');await join(pupil,room);
  const burst=await Promise.all(Array.from({length:35},()=>browserRequest(pupil,`/api/raid/${room}/hero`,{method:'POST',data:{heroType:'warrior'}})));
  const limited=burst.filter(r=>r.status()===429);expect(limited.length).toBeGreaterThan(0);expect(limited[0].headers()['retry-after']).toBe('10');expect(limited[0].headers()['cache-control']).toContain('no-store');
  await page.getByRole('button',{name:'เริ่ม Boss Raid',exact:true}).click();await expect(pupil.locator('.raid-question-dialog')).toBeVisible();
  for(let i=0;i<10;i++){
   const s=await ready(pupil,room);const correct=await(await request.get(`${fixture}/__test/raid-correct-option?question=${s.question.id}`,{maxRetries:1})).json();
   let option=correct.selectedOptionId;const text=i<7?'deliberately wrong':'5';
   if(i<7&&option)option=s.question.options.find((o:{id:string})=>o.id!==option).id;
   if(i===9)await request.post(`${fixture}/__test/raid-boss-one-hp?session=${s.sessionId}`);
   const r=await browserRequest(pupil,`/api/raid/${room}/answer`,{method:'POST',data:{questionId:s.question.id,displayIndex:i,idempotencyKey:crypto.randomUUID(),answerText:option?null:text,selectedOptionId:option}});expect(r.status()).toBe(200);const result=await r.json();
   if(i===6){expect(result.heroHp).toBe(0);expect(result.awardedPoints).toBe(0);}
   if(i===7){expect(result.heroHp).toBe(10);expect(result.healAmount).toBe(10);expect(result.damage).toBe(0);expect(result.awardedPoints).toBe(0);}
   if(i===8){expect(result.damage).toBe(100);expect(result.awardedPoints).toBe(10);}
   if(i===9){expect(result.damage).toBe(1);expect(result.bossHp).toBe(0);}
  }
  await expect(pupil.getByRole('status').filter({hasText:'ตอบครบ 10 ข้อแล้ว'})).toBeVisible();await expect(pupil.locator('canvas')).toHaveCount(1);
  const result=await(await browserRequest(pupil,`/api/raid/${room}/snapshot`)).json();expect(result.own.score).toBe(20);expect(result.own.academicPoints).toBe(30);expect(result.team.events.filter((e:{type:string})=>e.type==='boss_defeated')).toHaveLength(1);
  await pupil.reload();const restored=await(await browserRequest(pupil,`/api/raid/${room}/snapshot`)).json();expect(restored.team.defeatedAt).toBe(result.team.defeatedAt);expect(restored.question).toBeNull();
 }finally{await context.close();}
});


test('legacy Raid stays manual and its normal combat queue remains available',async({browser,page,request})=>{
 await request.post(fixture+'/__test/reset');await request.post(fixture+'/__test/raid-bank');
 await login(page,'piyawatpiwsiri@gmail.com');await page.goto('/teacher/rooms/new');await page.getByLabel('Boss Raid · Time Attack').check();await page.getByLabel('จำนวนทีม',{exact:true}).fill('1');await page.getByRole('button',{name:'สร้างห้อง Boss Raid',exact:true}).click();await expect(page).toHaveURL(/\/raid\/dashboard$/);const room=page.url().match(/rooms\/(\d{4})/)![1];
 const context=await browser.newContext({baseURL:'http://127.0.0.1:3110'}),pupil=await context.newPage();
 try{
  await login(pupil,'pupil@example.com','01234');await join(pupil,room);let state=await(await browserRequest(pupil,`/api/raid/${room}/snapshot`)).json();expect((await request.post(fixture+`/__test/raid-legacy?session=${state.sessionId}`)).status()).toBe(200);await pupil.reload();
  await page.getByRole('button',{name:'เริ่ม Boss Raid',exact:true}).click();state=await ready(pupil,room);expect(state.rulesVersion).toBe(1);await expect(pupil.locator('.raid-question-dialog')).toBeVisible();await expect(pupil.locator('.raid-scene-notice')).toHaveCount(0);
  let submissions=0;pupil.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/answer'))submissions++;});const q=state.question;
  if(q.questionType==='short_text'){await pupil.getByLabel('คำตอบของคุณ',{exact:true}).fill('5');await pupil.getByRole('button',{name:'ตรวจคำตอบก่อนส่ง',exact:true}).click();}else await pupil.locator('input[name=raid_option]').first().check();
  await pupil.waitForTimeout(5200);expect(submissions).toBe(0);await expect(pupil.locator('#raid-question-title')).toContainText('ข้อ 1 / 10');
  const response=pupil.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/answer'));const start=Date.now();await pupil.getByRole('button',{name:/^ยืนยันคำตอบ/}).click();const result=await(await response).json();expect(result.ok).toBe(true);expect(result.presentation).toBeUndefined();
  await expect(pupil.locator('.raid-combat-feedback')).toBeVisible();await expect(pupil.locator('.raid-question-dialog')).toHaveCount(0);await expect(pupil.locator('.raid-stage')).not.toHaveAttribute('data-answer-playing','true');await expect(pupil.locator('canvas')).toHaveCount(1);
  await expect(pupil.locator('#raid-question-title')).toContainText('ข้อ 2 / 10');expect(Date.now()-start).toBeGreaterThanOrEqual(2900);expect(submissions).toBe(1);state=await ready(pupil,room);expect(state.team.events.some((e:{actorId:string;targetId:string})=>e.actorId===state.own.id||e.targetId===state.own.id)).toBe(true);
 }finally{await context.close();}
});

test('vintage question HUD, auto-confirm, choice reset, actual combat completion and urgent timer',async({browser,page,request})=>{
 const dir='.impeccable/review/raid-vintage';await fs.mkdir(dir,{recursive:true});
 await request.post(fixture+'/__test/reset');await request.post(fixture+'/__test/raid-bank');
 await page.setViewportSize({width:1440,height:900});await page.goto('/login');await page.screenshot({path:dir+'/login-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:dir+'/login-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});
 await login(page,'piyawatpiwsiri@gmail.com');await page.goto('/teacher/rooms/new');await page.getByLabel('Boss Raid · Time Attack').check();await page.getByLabel('จำนวนทีม',{exact:true}).fill('1');await page.getByRole('button',{name:'สร้างห้อง Boss Raid',exact:true}).click();await expect(page).toHaveURL(/\/raid\/dashboard$/);const room=page.url().match(/rooms\/(\d{4})/)![1];
 const context=await browser.newContext({baseURL:'http://127.0.0.1:3110',viewport:{width:390,height:844}}),pupil=await context.newPage();const reports:unknown[]=[];
 async function shot(name:string,width:number,height:number){const previous=pupil.viewportSize();await pupil.setViewportSize({width,height});await pupil.evaluate(()=>document.fonts.ready);if(await pupil.locator('canvas').count()){const size=await pupil.locator('.raid-stage').evaluate(element=>({width:element.clientWidth,height:Math.max(1,element.clientHeight-(element.parentElement!.querySelector('.raid-hero-hud')?.clientHeight??0)-22)})),expected=profileForStage(size.width,size.height,registry.scenes[0].profiles as SceneDefinition['profiles']);await expect(pupil.locator('.raid-stage')).toHaveAttribute('data-scene-profile',expected);await expect(pupil.locator('.raid-scene-notice')).toHaveCount(0);if(previous?.width!==width||previous?.height!==height)await pupil.waitForTimeout(700);}await pupil.screenshot({path:dir+'/'+name+'.png',fullPage:true,animations:'disabled'});const report=await pupil.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.raid-question-footer button')].map(b=>{const r=b.getBoundingClientRect();return {height:r.height,top:r.top,bottom:r.bottom,width:r.width};}),palette:getComputedStyle(document.body).backgroundColor}));expect(report.overflow).toBe(false);for(const b of report.buttons){expect(b.height).toBeGreaterThanOrEqual(44);expect(b.bottom).toBeLessThanOrEqual(height);}const violations=(await new AxeBuilder({page:pupil}).include('.raid-room').analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''));expect(violations).toEqual([]);reports.push({name,width,height,...report,violations});}
 try{
  await login(pupil,'pupil@example.com','01234');await join(pupil,room);await pupil.getByRole('button',{name:/พ่อมด.*เลือกฮีโร่/}).click();await expect(pupil.getByRole('button',{name:/พ่อมด.*คุณเลือกตัวนี้/})).toHaveAttribute('aria-pressed','true');await expect(pupil.getByRole('button',{name:/พ่อมด.*คุณเลือกตัวนี้/})).toBeEnabled();
  const inactive=pupil.locator('.raid-hero-picker button[aria-pressed=false] .raid-hero-portrait').first();expect(await inactive.evaluate(e=>getComputedStyle(e).filter)).toContain('grayscale');await shot('hero-mobile',390,844);await shot('hero-desktop',1440,900);
  await page.getByRole('button',{name:'เริ่ม Boss Raid',exact:true}).click();let state=await ready(pupil,room);
  while(state.question.questionType==='short_text'){const q=state.question;await browserRequest(pupil,`/api/raid/${room}/answer`,{method:'POST',data:{questionId:q.id,displayIndex:q.displayIndex,idempotencyKey:crypto.randomUUID(),answerText:'5'}});state=await ready(pupil,room);}
  await expect(pupil.locator('#raid-question-title')).toContainText(`ข้อ ${state.question.displayIndex+1}`);await pupil.getByRole('button',{name:/ปาร์ตี้/}).click();await expect(pupil.locator('.raid-party-list')).toContainText('นักเรียน หนึ่ง');await expect(pupil.locator('.raid-party-list')).toContainText('พ่อมด');await shot('question-party-desktop',1440,900);await shot('question-party-mobile',390,844);await pupil.getByRole('button',{name:/ปาร์ตี้/}).click();
  await shot('question-small',320,400);await shot('question-landscape',844,390);await shot('question-tablet',768,1024);await pupil.setViewportSize({width:390,height:844});
  let submissions=0;pupil.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/answer'))submissions++;});
  await request.post(fixture+`/__test/raid-phase-three?session=${state.sessionId}`);const expected=await(await request.get(fixture+`/__test/raid-correct-option?question=${state.question.id}`)).json(),wrong=state.question.options.find((o:{id:string})=>o.id!==expected.selectedOptionId)!;
  await pupil.locator(`input[value="${expected.selectedOptionId}"]`).check();const start=Date.now();await pupil.waitForTimeout(1800);await pupil.locator(`input[value="${wrong.id}"]`).check();const reset=Date.now();const combatVisible=pupil.locator('.raid-combat-feedback').waitFor({state:'visible'});await pupil.screenshot({path:dir+'/confirmation-mobile.png'});await pupil.waitForTimeout(Math.max(0,3300-(Date.now()-reset)));expect(submissions).toBe(0);await combatVisible;
  await expect(pupil.locator('.raid-combat-feedback')).toBeVisible();expect(Date.now()-reset).toBeGreaterThanOrEqual(4900);expect(Date.now()-start).toBeGreaterThanOrEqual(6500);expect(submissions).toBe(1);await expect(pupil.locator('.raid-question-dialog')).toHaveCount(0);
  await expect(pupil.locator('.raid-stage')).toHaveAttribute('data-answer-playing','true');await expect(pupil.locator('.raid-stage')).toHaveAttribute('data-answer-completed','true');await shot('combat-mobile',390,844);
  await expect(pupil.locator('#raid-question-title')).toContainText(`ข้อ ${state.question.displayIndex+2}`);expect(submissions).toBe(1);
  state=await ready(pupil,room);await request.post(fixture+`/__test/raid-last-thirty?session=${state.sessionId}`);await expect(pupil.locator('.raid-timer')).toHaveAttribute('data-urgent','true');await expect(pupil.locator('.raid-time-warning')).toHaveText('30 วินาทีสุดท้าย');await shot('urgent-mobile',390,844);
  const q=state.question;if(q.questionType==='short_text'){await pupil.getByLabel('คำตอบของคุณ',{exact:true}).fill('5');await pupil.getByRole('button',{name:'ตรวจคำตอบก่อนส่ง',exact:true}).click();}else await pupil.locator('input[name=raid_option]').first().check();
  await pupil.route('**/api/raid/'+room+'/snapshot*',route=>route.abort());
  await pupil.getByRole('button',{name:/^ยืนยันคำตอบ/}).click();await expect(pupil.locator('.raid-combat-feedback')).toBeVisible();expect(submissions).toBe(2);await pupil.waitForTimeout(3900);await expect(pupil.locator('.raid-question-dialog')).toHaveCount(0);await expect(pupil.locator('.raid-connection')).toContainText('คำตอบบันทึกแล้ว');
  await pupil.unroute('**/api/raid/'+room+'/snapshot*');await expect(pupil.locator('#raid-question-title')).toContainText(`ข้อ ${q.displayIndex+2}`);
  const last=await ready(pupil,room);if(last.question.questionType!=='short_text')await pupil.locator('input[name=raid_option]').first().check();else{await pupil.getByLabel('คำตอบของคุณ',{exact:true}).fill('5');await pupil.getByRole('button',{name:'ตรวจคำตอบก่อนส่ง',exact:true}).click();}
  await request.post(fixture+`/__test/raid-expire?session=${last.sessionId}`);await expect(pupil.locator('.raid-question-dialog')).toHaveCount(0);await pupil.waitForTimeout(5100);expect(submissions).toBe(2);
  await fs.writeFile(dir+'/hud-and-confirmation.json',JSON.stringify(reports,null,2));
 }finally{await context.close();}
});
