import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
const evidence='.impeccable/review/raid-heroes-v2';
async function placement(page:Page){return page.locator('[data-placement]').evaluate(e=>JSON.parse((e as HTMLElement).dataset.placement!));}
async function ready(page:Page){await expect.poll(async()=>{try{return (await placement(page)).actors.length;}catch{return 0;}}).toBe(6);await expect(page.locator('.raid-scene-loading')).toHaveCount(0);}
async function feedback(page:Page){return page.locator('[data-feedback]').evaluate(e=>JSON.parse((e as HTMLElement).dataset.feedback!));}
test('Ranger pilot: both real clips, distinct effects, actual damage and five-slot compatibility',async({page})=>{
 await fs.mkdir(evidence,{recursive:true});await page.goto('/dev/boss-raid/scene');await ready(page);
 await page.getByLabel('ชุดฮีโร่',{exact:true}).selectOption('ranger');await ready(page);
 expect((await placement(page)).actors.slice(1).map((a:{type:string})=>a.type)).toEqual(['ranger','mage','wizard','witch','fairy']);
 await page.getByLabel('แสดงจุดยืนและ Polygon',{exact:true}).uncheck();
 for(const [seq,effect]of [[1,'ranger-wind-arrow'],[2,'ranger-storm']] as const){
  await page.getByRole('button',{name:'hero_attack',exact:true}).click();
  await expect.poll(async()=>(await feedback(page)).shown.find((s:{seq:number})=>s.seq===seq)?.effect).toBe(effect);
  expect((await feedback(page)).shown.find((s:{seq:number})=>s.seq===seq).amount).toBe(100);
  await page.waitForTimeout(1600);
 }
 expect((await feedback(page)).shown).toHaveLength(2);expect((await placement(page)).actors.every((a:{grounded:boolean})=>a.grounded)).toBe(true);
 await page.locator('.raid-arena').screenshot({path:`${evidence}/ranger-pilot.png`});
});
test('New five: each attack effect and shared sounds, all clips grounded, duplicate formation and mobile',async({page})=>{
 test.setTimeout(240000);const duplicateKeyErrors:string[]=[];page.on('console',m=>{if(m.type()==='error'&&m.text().includes('same key'))duplicateKeyErrors.push(m.text());});
 await fs.mkdir(evidence,{recursive:true});await page.goto('/dev/boss-raid/scene');await ready(page);await page.getByLabel('ชุดฮีโร่',{exact:true}).selectOption('new');await ready(page);
 await page.getByLabel('แสดงจุดยืนและ Polygon',{exact:true}).uncheck();
 expect((await placement(page)).actors.slice(1).map((a:{type:string})=>a.type)).toEqual(['ranger','ninja','monk','engineer','bard']);
 const effects=[['ranger-wind-arrow','ranger-storm'],['ninja-shadow-cut','ninja-moon-star'],['monk-dawn-fist','monk-sun-kick'],['engineer-gear-shot','engineer-core-blast'],['bard-lyre-wave','bard-star-song']];
 let seq=0;
 for(let actor=0;actor<5;actor++){
  await page.getByLabel('ตัวละคร',{exact:true}).selectOption(String(actor));
  for(let attack=0;attack<2;attack++){
   seq++;await page.getByRole('button',{name:'จับจังหวะกระแทก',exact:true}).click();await page.getByRole('button',{name:'hero_attack',exact:true}).click();
   await expect.poll(async()=>(await feedback(page)).shown.find((s:{seq:number})=>s.seq===seq)?.effect).toBe(effects[actor][attack]);
   expect((await feedback(page)).shown.find((s:{seq:number})=>s.seq===seq).amount).toBe(100);
   await expect(page.locator('.raid-stage')).toHaveAttribute('data-preview-paused','true');await page.locator('.raid-arena').screenshot({path:evidence+'/new-attack-'+actor+'-'+attack+'.png'});await page.getByRole('button',{name:'เล่นฉากต่อ',exact:true}).click();await page.waitForTimeout(1500);
  }
  for(const clip of ['hit','victory','defeat']){
   await page.getByLabel('ท่า',{exact:true}).selectOption(clip);await page.getByRole('button',{name:'ลองท่า',exact:true}).click();await page.waitForTimeout(250);
   const p=await placement(page),a=p.actors.find((a:{id:string})=>a.id===String(actor));
   expect(a.grounded).toBe(true);expect(Math.abs(a.shadowScreen.y-a.anchorScreen.y)).toBeLessThan(1);
  }
 }
 expect((await feedback(page)).shown).toHaveLength(10);
 await page.getByRole('button',{name:'ตรวจสถานะเสียง',exact:true}).click();const mixedMetrics=JSON.parse(await page.getByTestId('audio-diagnostics').innerText());expect(mixedMetrics.render.sprites.decodedBytes).toBeLessThanOrEqual(64*1024*1024);expect(mixedMetrics.render.sprites.sheets).toBeLessThanOrEqual(8);await fs.writeFile(evidence+'/new-five-cache-metrics.json',JSON.stringify(mixedMetrics,null,2)+'\n');
 for(const [name,width,height]of [['desktop',1366,768],['phone',390,844],['landscape',844,390]] as const){
  await page.setViewportSize({width,height});await page.getByRole('button',{name:'รีเซ็ตตัวอย่าง',exact:true}).click();await ready(page);await page.waitForTimeout(400);
  expect((await placement(page)).actors.every((a:{grounded:boolean})=>a.grounded)).toBe(true);
  await page.locator('.raid-arena').screenshot({path:`${evidence}/new-five-${name}.png`});
 }
 await page.getByLabel('ชุดฮีโร่',{exact:true}).selectOption('duplicates');await ready(page);
 expect(duplicateKeyErrors).toEqual([]);const duplicates=(await placement(page)).actors.slice(1);expect(duplicates.every((a:{type:string})=>a.type==='ranger')).toBe(true);
 expect(new Set(duplicates.map((a:{foot:{u:number;v:number}})=>`${a.foot.u}:${a.foot.v}`)).size).toBe(5);
 await page.getByRole('button',{name:'ตรวจสถานะเสียง',exact:true}).click();
 const metrics=JSON.parse(await page.getByTestId('audio-diagnostics').innerText());
 expect(metrics.render.sprites.decodedBytes).toBeLessThanOrEqual(64*1024*1024);
 await fs.writeFile(`${evidence}/new-hero-scene-metrics.json`,JSON.stringify(metrics,null,2)+'\n');
});
