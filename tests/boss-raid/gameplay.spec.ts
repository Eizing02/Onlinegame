import { test,expect,type Page } from '@playwright/test';
import { browserRequest } from '../browser-request';
import AxeBuilder from '@axe-core/playwright';
const fixture='http://127.0.0.1:3111';
async function login(page:Page,email:string,code?:string) {
 await page.goto('/login');await page.getByRole('button',{name:'เข้าสู่ระบบด้วย Google',exact:true}).click();await page.getByRole('link',{name:email,exact:true}).click();
 if(code){await page.getByLabel('รหัสประจำตัวนักเรียน',{exact:true}).fill(code);await page.getByRole('button',{name:'ตรวจสอบรหัส',exact:true}).click();await page.getByRole('button',{name:'ยืนยันและเข้าเกม',exact:true}).click();await expect(page).toHaveURL(/\/join$/);}
}
async function join(page:Page,room:string) {
 await page.goto(`/join?room_code=${room}`);await page.getByRole('button',{name:/ทีม 1/}).click();await expect(page).toHaveURL(new RegExp(`play/${room}/raid$`));
}
test('Google classroom Raid: independent answer, idempotency, visibility, spectator, reconnect, end and access guards',async({browser,page,request})=>{
 await request.post(`${fixture}/__test/reset`);await request.post(`${fixture}/__test/raid-bank`);
 await login(page,'piyawatpiwsiri@gmail.com');expect((await request.get('http://127.0.0.1:3110/dev/boss-raid/scene')).status()).toBe(404);await page.goto('/teacher/rooms/new');
 await page.getByLabel('Boss Raid · Time Attack').check();await page.getByLabel('จำนวนทีม',{exact:true}).fill('2');await page.getByLabel('ชื่อกิจกรรม',{exact:true}).fill('ทดสอบ Boss Raid');
 await page.getByRole('button',{name:'สร้างห้อง Boss Raid',exact:true}).click();await expect(page).toHaveURL(/\/raid\/dashboard$/);const room=page.url().match(/rooms\/(\d{4})/)![1];
 const studentContext=await browser.newContext({baseURL:'http://127.0.0.1:3110'});const student=await studentContext.newPage();
 const otherContext=await browser.newContext({baseURL:'http://127.0.0.1:3110'});const other=await otherContext.newPage();
 try {
  await login(student,'pupil@example.com','01234');await join(student,room);await student.getByRole('button',{name:/นักรบ.*เลือกฮีโร่/}).click();
  await login(other,'other@example.com','01235');await join(other,room);await expect(other.getByRole('button',{name:/นักรบ/})).toBeDisabled();await other.getByRole('button',{name:/จอมเวท.*เลือกฮีโร่/}).click();
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
  await student.getByRole('button',{name:'ตรวจคำตอบก่อนส่ง',exact:true}).click();await student.getByRole('button',{name:'ยืนยันคำตอบ',exact:true}).click();
  await expect(student.locator('#raid-question-title')).toContainText('ข้อ 2 / 10');
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
  if(members===1){await pupils[0].getByRole('button',{name:'ตั้งค่าภาพ',exact:true}).click();await pupils[0].getByRole('button',{name:'เปิดเสียงเกม',exact:true}).click();await pupils[0].getByRole('button',{name:'ตั้งค่าภาพ',exact:true}).click();await pupils[0].setViewportSize({width:320,height:400});} await page.getByRole('button',{name:'เริ่ม Boss Raid',exact:true}).click();await expect(pupils[0].locator('.raid-question-dialog')).toBeVisible(); if(members===1){await expect(pupils[0].getByRole('button',{name:'ปิดเสียงเกม',exact:true})).toBeVisible();const visible=await pupils[0].locator('.raid-question-dialog').evaluate(dialog=>{const bounds=dialog.getBoundingClientRect(),button=dialog.querySelector('.raid-question-footer button')!.getBoundingClientRect();return button.bottom<=bounds.bottom&&button.height>=44;});expect(visible).toBe(true);await pupils[0].getByRole('button',{name:'ปิดเสียงเกม',exact:true}).click();await pupils[0].setViewportSize({width:320,height:700});}
  const states=await Promise.all(pupils.map(async p=>(await browserRequest(p,`/api/raid/${room}/snapshot`)).json()));
  expect(states[0].team.heroes).toHaveLength(members);expect(new Set(states[0].team.heroes.map((h:{heroType:string})=>h.heroType)).size).toBe(members);
  const deadlines=new Set(states.map(s=>s.deadline));expect(deadlines.size).toBe(1);
  await Promise.all(pupils.map(async(p,i)=>{const correct=await(await request.get(`${fixture}/__test/raid-correct-option?question=${states[i].question.id}`,{maxRetries:1})).json();const body={questionId:states[i].question.id,displayIndex:0,idempotencyKey:crypto.randomUUID(),answerText:correct.selectedOptionId?null:'5',selectedOptionId:correct.selectedOptionId};const replies=await Promise.all([browserRequest(p,`/api/raid/${room}/answer`,{method:'POST',data:body}),browserRequest(p,`/api/raid/${room}/answer`,{method:'POST',data:body})]);for(const reply of replies)expect(reply.status()).toBe(200);}));
  for(const p of pupils){const s=await(await browserRequest(p,`/api/raid/${room}/snapshot`)).json();expect(s.own.cursor).toBe(1);expect(s.own.score).toBe(10);}
  // Walk the full independently shuffled bank to exercise every typed/long/image question.
  let seenImage=false;const kinds=new Set();
  for(let i=1;i<10;i++){
   const current=await(await browserRequest(pupils[0],`/api/raid/${room}/snapshot`)).json();kinds.add(current.question.questionType);seenImage ||=Boolean(current.question.imageUrl);
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
   const s=await(await browserRequest(pupil,`/api/raid/${room}/snapshot`)).json();const correct=await(await request.get(`${fixture}/__test/raid-correct-option?question=${s.question.id}`,{maxRetries:1})).json();
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
