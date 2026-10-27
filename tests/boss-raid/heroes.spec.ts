import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {browserRequest} from '../browser-request';
const fixture='http://127.0.0.1:3111',evidence='.impeccable/review/raid-heroes-v2';
async function login(page:Page,email:string,code?:string){await page.goto('/login');await page.getByRole('button',{name:'เข้าสู่ระบบด้วย Google',exact:true}).click();await page.getByRole('link',{name:email,exact:true}).click();if(code){await page.getByLabel('รหัสประจำตัวนักเรียน',{exact:true}).fill(code);await page.getByRole('button',{name:'ตรวจสอบรหัส',exact:true}).click();await page.getByRole('button',{name:'ยืนยันและเข้าเกม',exact:true}).click();await expect(page).toHaveURL(/\/join$/);}}
test('Ten-hero lobby: responsive pages, independent swipe, duplicates, role parity and real answer pacing',async({page,browser,request})=>{
 await fs.mkdir(evidence,{recursive:true});await request.post(`${fixture}/__test/reset`);await request.post(`${fixture}/__test/raid-bank`);
 await login(page,'piyawatpiwsiri@gmail.com');await page.goto('/teacher/rooms/new');await page.getByLabel('Boss Raid · Time Attack').check();await page.getByLabel('จำนวนทีม',{exact:true}).fill('1');await page.getByRole('button',{name:'สร้างห้อง Boss Raid',exact:true}).click();await expect(page).toHaveURL(/\/raid\/dashboard$/);
 const room=page.url().match(/rooms\/(\d{4})/)![1],context=await browser.newContext({baseURL:'http://127.0.0.1:3110',hasTouch:true}),otherContext=await browser.newContext({baseURL:'http://127.0.0.1:3110'});
 try{
  const pupil=await context.newPage(),other=await otherContext.newPage();await login(pupil,'pupil@example.com','01234');await pupil.goto(`/join?room_code=${room}`);await pupil.getByRole('button',{name:/ทีม 1/}).click();await pupil.getByRole('button',{name:/^ยืนยันเข้าทีม/}).click();await expect(pupil).toHaveURL(/\/raid$/);
  await expect(pupil.locator('.raid-hero-picker button')).toHaveCount(10);
  const requests:string[]=[];pupil.on('request',r=>requests.push(r.url()));await pupil.reload();await expect(pupil.getByRole('heading',{name:'เลือกฮีโร่ของคุณ'})).toBeVisible();
  for(const [name,width,height]of [['desktop',1366,768],['tablet',768,1024],['phone',390,844],['small-phone',320,568],['landscape',844,390]] as const){
   await pupil.setViewportSize({width,height});await pupil.getByRole('region',{name:'รายชื่อตัวละคร เลื่อนภายในได้'}).focus();await pupil.keyboard.press('End');
   const hero=pupil.getByRole('button',{name:/นักธนูสายลม.*เลือกฮีโร่/});await expect(hero).toBeVisible();
   expect(await pupil.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
   await pupil.screenshot({path:`${evidence}/hero-lobby-${name}.png`});
  }
  expect(requests.some(url=>/\/heroes\/[^/]+\/idle\.png/.test(url))).toBe(false);
  await pupil.setViewportSize({width:390,height:844});const region=pupil.getByRole('region',{name:'รายชื่อตัวละคร เลื่อนภายในได้'});await region.focus();await pupil.keyboard.press('Home');
  await region.dispatchEvent('touchstart',{touches:[{identifier:1,clientX:280,clientY:200}]});await region.dispatchEvent('touchend',{changedTouches:[{identifier:1,clientX:100,clientY:204}]});
  await expect(pupil.getByRole('button',{name:/นักธนูสายลม.*เลือกฮีโร่/})).toBeVisible();await expect(pupil.getByRole('heading',{name:'เลือกฮีโร่ของคุณ'})).toBeVisible();
  await pupil.getByRole('button',{name:/นักธนูสายลม.*เลือกฮีโร่/}).click();await expect(pupil.getByRole('button',{name:/นักธนูสายลม.*คุณเลือกตัวนี้/})).toHaveAttribute('aria-pressed','true');
  await expect(pupil.locator('.app-loading-overlay')).toHaveCount(0);await pupil.screenshot({path:evidence+'/hero-selected-phone.png'});
  const audit=await new AxeBuilder({page:pupil}).include('.raid-expanded-lobby').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations).toEqual([]);
  await login(other,'other@example.com','01235');await other.goto(`/join?room_code=${room}`);await other.getByRole('button',{name:/ทีม 1/}).click();await other.getByRole('button',{name:/^ยืนยันเข้าทีม/}).click();await other.getByRole('button',{name:/นักธนูสายลม.*เลือกฮีโร่/}).click();
  await page.getByRole('button',{name:'เริ่ม Boss Raid',exact:true}).click();await expect(pupil.locator('.raid-question-dialog')).toBeVisible();
  const snapshot=await(await browserRequest(pupil,`/api/raid/${room}/snapshot`)).json();expect(snapshot.availableHeroes).toHaveLength(10);expect(snapshot.heroCatalogVersion).toBe(2);expect(snapshot.team.heroes.every((h:{heroType:string})=>h.heroType==='ranger')).toBe(true);
  const correct=await(await request.get(`${fixture}/__test/raid-correct-option?question=${snapshot.question.id}`)).json();
  const answerResponse=pupil.waitForResponse(r=>r.url().endsWith('/answer')&&r.request().method()==='POST');
  if(correct.selectedOptionId)await pupil.locator(`input[value="${correct.selectedOptionId}"]`).check();else{await pupil.getByLabel('คำตอบของคุณ',{exact:true}).fill('5');await pupil.getByRole('button',{name:'ตรวจคำตอบก่อนส่ง',exact:true}).click();}
  const answerReply=await answerResponse;expect(answerReply.status()).toBe(200);const sent=Date.now();await expect(pupil.locator('.raid-question-dialog')).toHaveCount(0);await expect(pupil.locator('.raid-combat-feedback')).toBeVisible();
  await expect(pupil.locator('#raid-question-title')).toContainText('ข้อ 2 / 10');expect(Date.now()-sent).toBeGreaterThanOrEqual(2700);
  const after=await(await browserRequest(pupil,`/api/raid/${room}/snapshot`)).json();expect(after.own.score).toBe(10);expect(after.own.hp).toBe(100);expect(after.deadline).toBe(snapshot.deadline);expect(after.team.events.filter((e:{type:string})=>e.type==='hero_attack')).toHaveLength(1);
  const teacher=await(await browserRequest(page,`/api/teacher/raid/${room}/overview`)).json();expect(JSON.stringify(teacher)).toContain('ranger');
 }finally{await context.close();await otherContext.close();}
});
