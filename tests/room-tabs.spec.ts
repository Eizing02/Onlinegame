import { test, expect, type Page } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { browserRequest } from './browser-request';

test.use({actionTimeout:15000});

test('one-screen room: all tabs, long choice question, draft, swipe, keyboard viewport and next question', async ({ page, browser }) => {
  test.setTimeout(180000);
  const directory=path.resolve('tmp/e2e-data'), output=path.resolve('tmp/room-tabs-audit'); await mkdir(output,{recursive:true});
  const now=new Date().toISOString(), set='11111111-1111-4111-8111-111111111111';
  const q=(id:string,questionText:string,orderIndex:number)=>({id,questionText,correctAnswer:'5',questionType:'short_text',options:[],imageUrl:null,imagePath:null,points:10,timeLimitSeconds:300,orderIndex,createdAt:now});
  await writeFile(path.join(directory,'game-sessions.json'),'[]');
  await writeFile(path.join(directory,'question-sets.json'),JSON.stringify([{id:set,teacherCode:'ADMIN',title:'ภารกิจเต็มจอ',createdAt:now,updatedAt:now,questions:[q('22222222-2222-4222-8222-222222222222','2 + 3 ได้เท่าไร?',0),{...q('33333333-3333-4333-8333-333333333333','อ่านโจทย์อย่างรอบคอบก่อนตอบ '.repeat(35)+'จบโจทย์ครบทุกบรรทัด',1),questionType:'multiple_choice',imageUrl:'/assets/brand/logo.png',options:Array.from({length:4},(_,i)=>({id:`44444444-4444-4444-8444-44444444444${i}`,optionText:'ตัวเลือกที่ '+(i+1)+' อธิบายเหตุผลและคำตอบ '.repeat(8),isCorrect:i===0,orderIndex:i}))}]}]));
  async function login(target:Page,code:string,password:string){await target.goto('/login');await target.getByLabel('รหัสผู้ใช้').fill(code);await target.getByLabel('รหัสผ่าน').fill(password);await target.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();await expect(target).toHaveURL(code==='ADMIN'?/question-sets$/:/join$/);}
  await login(page,'ADMIN','teacher-test-only');await page.goto('/teacher/rooms/new');await page.getByLabel('จำนวนกลุ่ม').fill('2');await page.getByLabel('จำนวนคนต่อกลุ่ม').fill('4');await page.getByRole('button',{name:'สร้างห้องเกม'}).click();await expect(page).toHaveURL(/dashboard$/);
  const room=page.url().match(/rooms\/(\d{4})/)![1], control=`/api/teacher/rooms/${room}/control`;
  const context=await browser.newContext({baseURL:'http://127.0.0.1:3100',hasTouch:true,viewport:{width:390,height:844}}), student=await context.newPage();
  await login(student,'02074','student-test-only');await student.getByLabel('รหัสห้อง').fill(room);await student.getByRole('button',{name:'ค้นห้อง',exact:true}).count();await student.getByRole('button',{name:'ค้นหาห้อง'}).click();await student.getByRole('button',{name:/กลุ่ม 1/}).click();await student.getByRole('button',{name:/^ยืนยันเข้าทีม/}).click();await expect(student).toHaveURL(/play\//);await student.getByRole('button',{name:'เข้าใจแล้ว'}).click();
  const report:unknown[]=[];
  async function inspect(target:Page,name:string,width:number,height:number){
    await target.setViewportSize({width,height}); await target.evaluate(()=>document.fonts.ready);
    // Measure the settled control, rather than an interpolated enabled/disabled color.
    await target.locator('.power-button').evaluateAll(async nodes=>{
      await Promise.all(nodes.flatMap(node=>node.getAnimations()).filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));
    });
    const geometry=await target.evaluate(()=>({height:innerHeight,scrollHeight:document.documentElement.scrollHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    const audit=await new AxeBuilder({page:target}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    report.push({name,width,height,geometry,violations:audit.violations});
    await target.screenshot({path:path.join(output,`${name}-${width}x${height}.png`)});
    expect.soft(geometry.scrollHeight).toBeLessThanOrEqual(height+1);expect.soft(geometry.scrollWidth).toBeLessThanOrEqual(width);expect.soft(audit.violations).toEqual([]);
  }
  await browserRequest(page,control,{method:'POST',data:{command:'start'}});await expect(student.getByLabel('คำตอบของคุณ')).toBeEnabled();
  for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
    await inspect(student,'answer',width,height);
    const rect=await student.getByRole('button',{name:'ส่งคำตอบ',exact:true}).boundingBox();expect.soft(rect!.y+rect!.height).toBeLessThanOrEqual(height);
  }
  for(const tab of ['ทีม','อันดับ']){await student.getByRole('tab',{name:tab,exact:true}).click();await inspect(student,tab,390,844);}
  await student.getByRole('tab',{name:'เล่น',exact:true}).click();await student.getByLabel('คำตอบของคุณ').fill('draft 5');
  await student.locator('.question-reading').evaluate(element=>{const start=new Touch({identifier:1,target:element,clientX:280,clientY:250}),end=new Touch({identifier:1,target:element,clientX:80,clientY:255});element.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[start]}));element.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[end]}));});await expect(student.getByRole('tab',{name:'ทีม',exact:true})).toHaveAttribute('aria-selected','true');
  await student.getByRole('tab',{name:'เล่น',exact:true}).click();await expect(student.getByLabel('คำตอบของคุณ')).toHaveValue('draft 5');
  // A visualViewport resize exercises the keyboard layout without claiming a real device keyboard test.
  await student.getByLabel('คำตอบของคุณ').focus();await student.evaluate(()=>{Object.defineProperty(window.visualViewport!,'height',{configurable:true,value:430});window.visualViewport!.dispatchEvent(new Event('resize'));});
  await expect(student.locator('.room-app')).toHaveAttribute('data-keyboard','true');await expect(student.getByRole('tablist')).toBeHidden();
  const submit=await student.getByRole('button',{name:'ส่งคำตอบ',exact:true}).boundingBox();expect(submit!.y+submit!.height).toBeLessThanOrEqual(430);
  await student.screenshot({path:path.join(output,'keyboard-viewport.png')});
  await student.evaluate(()=>{Reflect.deleteProperty(window.visualViewport!,'height');window.visualViewport!.dispatchEvent(new Event('resize'));});
  await student.getByLabel('คำตอบของคุณ').fill('5');await student.getByRole('button',{name:'ส่งคำตอบ',exact:true}).click();await expect(student.getByText('ส่งคำตอบแล้ว รอครูเฉลย')).toBeVisible();
  await browserRequest(page,control,{method:'POST',data:{command:'reveal'}});await expect(student.locator('.contribution-result')).toBeVisible();
  await student.getByRole('tab',{name:'อันดับ',exact:true}).click();await browserRequest(page,control,{method:'POST',data:{command:'next'}});await expect(student.getByRole('tab',{name:'เล่น',exact:true})).toHaveAttribute('aria-selected','true');
  for(const [width,height] of [[390,844],[320,568],[844,390]]) await inspect(student,'long-choice',width,height);
  await student.getByRole('button',{name:'ขยายโจทย์',exact:true}).click();await expect(student.getByRole('dialog',{name:'โจทย์เต็ม'})).toContainText('จบโจทย์ครบทุกบรรทัด');await student.keyboard.press('Escape');await expect(student.getByRole('dialog')).toHaveCount(0);
  await student.setViewportSize({width:390,height:844});await student.locator('.answer-options button').first().click({position:{x:20,y:20}});await student.getByRole('tab',{name:'ทีม',exact:true}).click();await student.getByRole('tab',{name:'เล่น',exact:true}).click();await expect(student.locator('.answer-options button').first()).toHaveClass(/border-primary/);await expect(student.getByRole('button',{name:'ส่งคำตอบ',exact:true})).toBeEnabled();
  for(const tab of ['คุมเกม','ผู้เล่น','คะแนน']){await page.getByRole('tab',{name:tab,exact:true}).click();await inspect(page,'teacher-'+tab,1440,900);await inspect(page,'teacher-'+tab,390,844);}
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await context.close();
});
