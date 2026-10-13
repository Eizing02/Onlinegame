import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const dir='.impeccable/review/combat-feedback';
type Feedback={textures:number;active:number;shown:{seq:number;target:string;amount:number|null;effect:string}[]};
async function feedback(page:Page):Promise<Feedback>{return page.locator('.raid-stage').evaluate(e=>JSON.parse((e as HTMLElement).dataset.feedback??'{}'));}
async function ready(page:Page){await expect.poll(async()=> (await feedback(page)).textures).toBe(9);await page.getByLabel('แสดงจุดยืนและ Polygon',{exact:true}).uncheck();}
test('combat feedback: five elemental assets, incoming phases, heal, floating numbers and dedup',async({page})=>{
 await mkdir(dir,{recursive:true});await page.goto('/dev/boss-raid/scene');await ready(page);const reports=[];
 const effects=['warrior-slash','mage-energy','wizard-fire','witch-curse','fairy-light'];
 for(let i=0;i<5;i++){
  await page.getByLabel('ตัวละคร',{exact:true}).selectOption(String(i));
  const before=(await feedback(page)).shown.length;await page.getByRole('button',{name:'จับจังหวะกระแทก',exact:true}).click();await page.getByRole('button',{name:'hero_attack',exact:true}).click();
  await expect.poll(async()=>(await feedback(page)).shown.length,{intervals:[50]}).toBe(before+1);
  const f=await feedback(page);expect(f.shown.at(-1)).toMatchObject({amount:100,target:'boss',effect:effects[i]});
  expect(f.active).toBeGreaterThan(0);await expect(page.locator('.raid-stage')).toHaveAttribute('data-preview-paused','true');await page.locator('.raid-arena').screenshot({path:`${dir}/effect-${effects[i]}.png`});await page.getByRole('button',{name:'เล่นฉากต่อ',exact:true}).click();reports.push(f.shown.at(-1));
  await page.waitForTimeout(1250);expect((await feedback(page)).active).toBe(0);
 }
 for(const phase of [1,2,3]){
  await page.getByLabel('เฟสบอส',{exact:true}).selectOption(String(phase));await page.getByLabel('ตัวละคร',{exact:true}).selectOption('1');const before=(await feedback(page)).shown.length;
  await page.getByRole('button',{name:'จับจังหวะกระแทก',exact:true}).click();await page.getByRole('button',{name:'hero_hit',exact:true}).click();await expect.poll(async()=>(await feedback(page)).shown.length,{intervals:[50]}).toBe(before+1);
  const f=await feedback(page);expect(f.shown.at(-1)?.amount).toBe(15);if(phase===1)expect(f.shown.at(-1)?.effect).toBe('dragon-claw');if(phase===3)expect(f.shown.at(-1)?.effect).toBe('dragon-ultimate');
  await expect(page.locator('.raid-stage')).toHaveAttribute('data-preview-paused','true');await page.locator('.raid-arena').screenshot({path:`${dir}/effect-boss-phase-${phase}.png`});reports.push(f.shown.at(-1));await page.getByRole('button',{name:'เล่นฉากต่อ',exact:true}).click();await page.waitForTimeout(1400);
 }
 const before=(await feedback(page)).shown.length;await page.getByRole('button',{name:'จับจังหวะกระแทก',exact:true}).click();await page.getByRole('button',{name:'heal',exact:true}).click();await expect.poll(async()=>(await feedback(page)).shown.length,{intervals:[50]}).toBe(before+1);expect((await feedback(page)).shown.at(-1)).toMatchObject({amount:10,effect:'healing-light'});await expect(page.locator('.raid-stage')).toHaveAttribute('data-preview-paused','true');await page.locator('.raid-arena').screenshot({path:`${dir}/effect-heal.png`});await page.getByRole('button',{name:'เล่นฉากต่อ',exact:true}).click();await page.waitForTimeout(1200);
 const count=(await feedback(page)).shown.length;await page.getByRole('button',{name:'ส่ง Event เดิมซ้ำ',exact:true}).click();await page.waitForTimeout(700);expect((await feedback(page)).shown.length).toBe(count);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'รีเซ็ตตัวอย่าง',exact:true}).click();await ready(page);await page.getByLabel('ตัวละคร',{exact:true}).selectOption('0');await page.getByRole('button',{name:'จับจังหวะกระแทก',exact:true}).click();await page.getByRole('button',{name:'hero_hit',exact:true}).click();await expect.poll(async()=>(await feedback(page)).shown.length,{intervals:[50]}).toBe(1);await expect(page.locator('.raid-stage')).toHaveAttribute('data-preview-paused','true');await page.locator('.raid-arena').screenshot({path:`${dir}/effect-mobile-hit.png`});
 await writeFile(`${dir}/effects-validation.json`,JSON.stringify(reports,null,2));
});
test('combat feedback: concurrent incoming hits, texture failure, remount',async({page})=>{
 await page.goto('/dev/boss-raid/scene');await ready(page);
 for(const id of ['0','1','2']){await page.getByLabel('ตัวละคร',{exact:true}).selectOption(id);await page.getByRole('button',{name:'hero_hit',exact:true}).click();}
 await expect.poll(async()=>(await feedback(page)).shown.length,{intervals:[50]}).toBe(3);expect(new Set((await feedback(page)).shown.map(e=>e.target)).size).toBe(3);
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'รีเซ็ตตัวอย่าง',exact:true}).click();await ready(page);expect(await page.locator('canvas').count()).toBe(1);expect((await feedback(page)).active).toBe(0);expect((await feedback(page)).shown.length).toBe(0);}
 await page.route('**/assets/boss-raid/vfx/*.png',route=>route.abort());await page.reload();await expect.poll(async()=>(await feedback(page)).textures).toBe(0);await expect(page.locator('canvas')).toHaveCount(1);await page.getByRole('button',{name:'hero_attack',exact:true}).click();await expect.poll(async()=>(await feedback(page)).shown.length,{intervals:[50]}).toBe(1);expect((await feedback(page)).shown[0].amount).toBe(100);
});
