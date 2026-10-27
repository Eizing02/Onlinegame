import {test,expect,type Page} from '@playwright/test';import fs from 'node:fs/promises';
const evidence='.impeccable/review/raid-boss-roster';
const clips=['idle','ready','attack_1','attack_2','dodge','hit','death','run','breath','shield','ultimate','victory_roar'];
async function placement(page:Page){return page.locator('[data-placement]').evaluate(e=>JSON.parse((e as HTMLElement).dataset.placement!));}
async function feedback(page:Page){return page.locator('[data-feedback]').evaluate(e=>JSON.parse((e as HTMLElement).dataset.feedback!));}
async function ready(page:Page){await expect.poll(async()=>{try{return(await placement(page)).actors.length;}catch{return 0;}}).toBe(6);await expect(page.locator('.raid-scene-loading')).toHaveCount(0);}
test('Three bosses: real clips, phase effects, same damage, bounded cache and responsive grounding',async({page})=>{
 test.setTimeout(300000);await fs.mkdir(evidence,{recursive:true});const failed:string[]=[];page.on('response',r=>{if(r.url().includes('/assets/boss-raid/')&&r.status()>=400)failed.push(r.url());});
 await page.goto('/dev/boss-raid/scene');await ready(page);await page.getByLabel('แสดงจุดยืนและ Polygon',{exact:true}).uncheck();
 for(const[boss,name,effects]of [
  ['shadow_dragon','มังกรเงา',['dragon-claw','dragon-flame','dragon-ultimate']],
  ['stone_titan','ไททันศิลา',['titan-stone-fist','titan-rune-wave','titan-earth-burst']],
  ['crystal_scorpion','แมงป่องผลึก',['scorpion-crystal-claw','scorpion-stinger-bolt','scorpion-crystal-storm']]
 ] as const){
  await page.getByLabel('บอส',{exact:true}).selectOption(boss);await ready(page);await expect(page.locator('.raid-boss-hud strong')).toHaveText(name);
  for(const clip of clips){await page.getByLabel('ท่า',{exact:true}).selectOption(clip);await page.getByRole('button',{name:'ลองท่า',exact:true}).click();await expect.poll(async()=>(await placement(page)).actors.find((a:{id:string})=>a.id==='boss').clip).toBe(clip);const p=await placement(page);expect(p.actors.every((a:{grounded:boolean})=>a.grounded)).toBe(true);await page.waitForTimeout(90);}
  await page.getByRole('button',{name:'รีเซ็ตตัวอย่าง',exact:true}).click();await ready(page);
  let seq=0;for(let phase=1;phase<=3;phase++){
   // Phase two alternates strike/ranged by event sequence. A real heal advances
   // the queue so its damage event is odd and exercises the ranged effect.
   if(phase===2){await page.getByRole('button',{name:'heal',exact:true}).click();seq++;await page.waitForTimeout(1200);}
   seq++;
   await page.getByLabel('เฟสบอส',{exact:true}).selectOption(String(phase));await page.getByRole('button',{name:'จับจังหวะกระแทก',exact:true}).click();await page.getByRole('button',{name:'hero_hit',exact:true}).click();
   await expect.poll(async()=>(await feedback(page)).shown.find((s:{seq:number})=>s.seq===seq)?.effect).toBe(effects[phase-1]);
   expect((await feedback(page)).shown.find((s:{seq:number})=>s.seq===seq).amount).toBe(15);await expect(page.locator('.raid-stage')).toHaveAttribute('data-preview-paused','true');
   await page.locator('.raid-arena').screenshot({path:`${evidence}/${boss}-phase-${phase}.png`});await page.getByRole('button',{name:'เล่นฉากต่อ',exact:true}).click();await page.waitForTimeout(1600);
  }
  for(const[label,width,height]of [['desktop',1366,768],['tablet',768,1024],['phone',390,844],['small-phone',320,568],['landscape',844,390]] as const){
   await page.setViewportSize({width,height});await page.getByRole('button',{name:'รีเซ็ตตัวอย่าง',exact:true}).click();await ready(page);await page.waitForTimeout(350);
   const p=await placement(page);expect(p.actors.every((a:{grounded:boolean})=>a.grounded)).toBe(true);await page.locator('.raid-arena').screenshot({path:`${evidence}/${boss}-${label}.png`});
  }
  await page.getByRole('button',{name:'ตรวจสถานะเสียง',exact:true}).click();const metrics=JSON.parse(await page.getByTestId('audio-diagnostics').innerText());
  expect(metrics.render.bossType).toBe(boss);expect(metrics.render.sprites.decodedBytes).toBeLessThanOrEqual(64*1024*1024);expect(metrics.render.sprites.sheets).toBeLessThanOrEqual(8);await fs.writeFile(`${evidence}/${boss}-metrics.json`,JSON.stringify(metrics,null,2)+'\n');
 }
 expect(failed).toEqual([]);await expect(page.locator('.raid-scene-notice')).toHaveCount(0);
});
