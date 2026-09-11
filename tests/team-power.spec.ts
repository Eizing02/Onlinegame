import {test, expect, type Page} from '@playwright/test';
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {browserRequest} from './browser-request';
async function login(page:Page, code:string, password:string) {
 await page.goto('/login'); await page.getByLabel('รหัสผู้ใช้').fill(code); await page.getByLabel('รหัสผ่าน').fill(password); await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();
 await expect(page).toHaveURL(code==='ADMIN'?/question-sets$/:/join$/);
}
test('captain power, simultaneous reveal fireworks, contribution and refresh recovery',async({page,browser})=>{
 test.setTimeout(120000);
 const data=path.resolve('tmp/e2e-data'), output=path.resolve('tmp/team-power-audit'); await mkdir(output,{recursive:true});
 const now=new Date().toISOString(), qid='22222222-2222-4222-8222-222222222222';
 await writeFile(path.join(data,'game-sessions.json'),'[]');
 await writeFile(path.join(data,'question-sets.json'),JSON.stringify([{id:'11111111-1111-4111-8111-111111111111',teacherCode:'ADMIN',title:'พลังทีมรอบสุดท้าย',description:null,createdAt:now,updatedAt:now,questions:[{id:qid,questionText:'2 + 3 ได้เท่าไร?',correctAnswer:'5',questionType:'short_text',options:[],imageUrl:null,imagePath:null,points:10,timeLimitSeconds:120,orderIndex:0,createdAt:now}]}]));
 await login(page,'ADMIN','teacher-test-only');await page.goto('/teacher/rooms/new');await page.getByLabel('จำนวนกลุ่ม').fill('2');await page.getByLabel('จำนวนคนต่อกลุ่ม').fill('4');await page.getByRole('button',{name:'สร้างห้องเกม'}).click();await expect(page).toHaveURL(/dashboard$/);
 const room=page.url().match(/rooms\/(\d{4})/)![1], teacherApi=`/api/teacher/rooms/${room}/control`, api=`/api/play/${room}`;
 const context=await browser.newContext({baseURL:'http://127.0.0.1:3100',viewport:{width:390,height:844}}), student=await context.newPage();
 await login(student,'02074','student-test-only');await student.getByLabel('รหัสห้อง').fill(room);await student.getByRole('button',{name:'ค้นหาห้อง'}).click();await student.getByRole('button',{name:/กลุ่ม 1/}).click();await expect(student).toHaveURL(/play\//);await student.getByRole('button',{name:'เข้าใจแล้ว'}).click();
 await browserRequest(page,teacherApi,{method:'POST',data:{command:'start'}});
 await expect(student.getByRole('button',{name:'ใช้พลังทีม +50%'})).toBeEnabled();
 await student.getByRole('button',{name:'ใช้พลังทีม +50%'}).click();await expect(student.locator('.play-power')).toBeVisible();
 await expect(student.locator('.final-round-banner')).toContainText('×2.25');
 for(const width of [1440,390,320]) {
  await student.setViewportSize({width,height:900});
  expect(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page:student}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await student.screenshot({path:path.join(output,`power-${width}.png`),fullPage:true});
 }
 await student.setViewportSize({width:390,height:844});
 await student.getByPlaceholder('พิมพ์คำตอบ...').fill('5');await student.getByRole('button',{name:'ส่งคำตอบ',exact:true}).click();await expect(student.getByText('ส่งคำตอบแล้ว').first()).toBeVisible();
 const hidden=await (await browserRequest(page,`/api/teacher/rooms/${room}/dashboard`)).json();expect(hidden.teams[0].rawScore).toBe(0);
 await page.reload();
 await browserRequest(page,teacherApi,{method:'POST',data:{command:'reveal'}});
 await expect(page.locator('.reveal-announcement')).toBeVisible();await expect(student.locator('.reveal-announcement')).toContainText('ตอบถูก!');
 await expect(student.locator('.reveal-fireworks')).toHaveCount(1);
 await Promise.all([page.screenshot({path:path.join(output,'teacher-fireworks.png')}),student.screenshot({path:path.join(output,'student-fireworks.png')})]);
 const revealed=await (await browserRequest(student,api)).json();expect(revealed.contribution).toEqual({base:15,bonus:7.5,total:22.5});expect(revealed.teamScore.averageScore).toBe(22.5);
 await expect(student.locator('.contribution-result')).toContainText('+22.5');
 await student.reload();await expect(student.locator('.reveal-announcement')).toHaveCount(0);await expect(student.locator('.contribution-result')).toContainText('+22.5');
 await context.close();
});
