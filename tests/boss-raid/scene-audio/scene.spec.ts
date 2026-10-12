import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const evidence='.impeccable/review/scene-audio';
async function placement(page:Page){return page.locator('[data-placement]').evaluate(e=>JSON.parse((e as HTMLElement).dataset.placement!));}
async function ready(page:Page){await expect.poll(async()=>{try{return(await placement(page)).fallback;}catch{return true;}}).toBe(false);await expect(page.locator('canvas')).toHaveCount(1);await page.evaluate(()=>{if(!document.getElementById('scene-hide-dev-ui')){const style=document.createElement('style');style.id='scene-hide-dev-ui';style.textContent='nextjs-portal{display:none!important}';document.head.append(style);}});}
async function metrics(page:Page){await page.getByRole('button',{name:'ตรวจสถานะเสียง',exact:true}).click();return JSON.parse(await page.getByTestId('audio-diagnostics').innerText());}
test('grounded scene matrix, 1–5 formation, orientation and native frame grounding',async({page})=>{
 await fs.mkdir(evidence,{recursive:true});await page.goto('/dev/boss-raid/scene');await ready(page);await page.getByLabel('แสดงจุดยืนและ Polygon',{exact:true}).uncheck();
 const reports=[];
 for(const [name,width,height,count]of [
  ...[1,2,3,4,5].map(n=>[`desktop-${n}`,1366,768,n]),
  ...[1,2,3,4,5].map(n=>[`phone-${n}`,390,844,n]),
  ['small-phone',320,568,5],['phone-9-16',360,640,5],['phone-landscape',844,390,5],['ipad-portrait',768,1024,5],['ipad-landscape',1024,768,5],['desktop-large',1920,1080,5]
 ] as [string,number,number,number][]){
  await page.setViewportSize({width,height});await page.getByLabel('ผู้เล่น',{exact:true}).selectOption(String(count));await ready(page);await expect.poll(async()=>(await placement(page)).actors.length).toBe(count+1);await page.waitForTimeout(400);
  const p=await placement(page);expect(p.actors.every((a:{grounded:boolean})=>a.grounded)).toBe(true);expect(p.actors.filter((a:{id:string})=>a.id!=='boss').every((a:{foot:{u:number}})=>a.foot.u>p.actors[0].foot.u)).toBe(true);
  if(count>1)expect(new Set(p.actors.slice(1).map((a:{foot:{u:number}})=>a.foot.u)).size).toBeGreaterThan(1);
  await page.locator('.raid-arena').screenshot({path:path.join(evidence,`${name}.png`),animations:'disabled'});reports.push({name,width,height,count,profile:p.profile,actors:p.actors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await page.setViewportSize({width:1366,height:768});await ready(page);const before=await placement(page);
 for(const actor of ['boss','0','1','2','3','4'])for(const clip of actor==='boss'?['idle','attack_1','attack_2','hit','breath','ultimate','death']:['idle','attack_1','attack_2','hit','victory','defeat']){
  await page.getByLabel('ตัวละคร',{exact:true}).selectOption(actor);await page.getByLabel('ท่า',{exact:true}).selectOption(clip);await page.getByRole('button',{name:'ลองท่า',exact:true}).click();await page.waitForTimeout(200);const now=await placement(page),a=now.actors.find((x:{id:string})=>x.id===actor),b=before.actors.find((x:{id:string})=>x.id===actor);
  expect(a.foot).toEqual(b.foot);expect(Math.abs(a.shadowScreen.y-a.y)).toBeLessThan(1);expect(Math.abs(a.anchorScreen.y-a.shadowScreen.y+(a.type==='fairy'?24*now.camera.scale:0))).toBeLessThan(1);
 }
 await page.getByRole('button',{name:'รีเซ็ตตัวอย่าง',exact:true}).click();await ready(page);await page.getByLabel('ชุดภาพ',{exact:true}).selectOption('phone');await page.getByLabel('ขนาดทดลอง',{exact:true}).selectOption('phone');await ready(page);await page.locator('.raid-arena').screenshot({path:path.join(evidence,'phone-verified.png'),animations:'disabled'});
 await page.getByLabel('ชุดภาพ',{exact:true}).selectOption('wide');await page.getByLabel('ขนาดทดลอง',{exact:true}).selectOption('desktop');await ready(page);await page.locator('.raid-arena').screenshot({path:path.join(evidence,'wide-verified.png'),animations:'disabled'});
 await fs.writeFile(path.join(evidence,'matrix.json'),JSON.stringify(reports,null,2)+'\n');
});
test('calibration pointer drag, keyboard position, export and single renderer',async({page})=>{
 await page.goto('/dev/boss-raid/scene');await ready(page);await page.getByLabel('ชุดภาพ',{exact:true}).selectOption('wide');await ready(page);const handle=page.locator('[data-handle="boss"]'),bounds=await handle.boundingBox();expect(bounds).not.toBeNull();const before=await placement(page);
 await page.mouse.move(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);await page.mouse.down();await page.mouse.move(bounds!.x+bounds!.width/2+25,bounds!.y+bounds!.height/2+5,{steps:5});await page.mouse.up();await expect.poll(async()=>(await placement(page)).actors[0].foot.u).toBeGreaterThan(before.actors[0].foot.u);await expect(page.locator('canvas')).toHaveCount(1);
 await page.getByLabel('จุดยืน U',{exact:true}).fill('0.32');await expect.poll(async()=>(await placement(page)).actors[0].foot.u).toBeCloseTo(.32);await page.getByLabel('แสดงจุดยืนและ Polygon',{exact:true}).uncheck();await expect(page.locator('.raid-calibration-overlay')).toHaveCount(0);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'ส่งออก Scene Config',exact:true}).click();expect((await download).suggestedFilename()).toBe('shadow-citadel.json');
});
test('all real Ogg/MP3 assets decode, animation cue alignment, dedup, music and mute',async({page})=>{
 await page.goto('/dev/boss-raid/scene');await ready(page);const initial=await metrics(page);expect(initial.muted).toBe(true);expect(initial.played).toEqual([]);
 const decoded=await page.evaluate(async()=>{
  const context=new AudioContext();const files=await fetch('/assets/boss-raid/audio/manifest.json').then(r=>r.json());const results=[];
  for(const[id,sound]of Object.entries(files.sounds) as [string,{sources:{url:string;mime:string}[]}][])for(const source of sound.sources){const response=await fetch(source.url);const buffer=await context.decodeAudioData(await response.arrayBuffer());const data=buffer.getChannelData(0);results.push({id,mime:source.mime,duration:buffer.duration,nonSilent:data.some(value=>Math.abs(value)>.001)});}
  await context.close();return results;
 });expect(decoded).toHaveLength(50);expect(decoded.every(d=>d.duration>0&&d.nonSilent)).toBe(true);await fs.writeFile(path.join(evidence,'browser-decode.json'),JSON.stringify({browser:'Chromium desktop emulation; not physical iOS/Android',results:decoded},null,2)+'\n');
 await page.getByRole('button',{name:'เปิดเสียงเกม',exact:true}).click();await expect(page.getByRole('button',{name:'ปิดเสียงเกม',exact:true})).toBeVisible();await expect.poll(async()=>(await metrics(page)).musicPaused).toBe(false);await page.waitForTimeout(800);
 await page.getByRole('button',{name:'hero_attack',exact:true}).click();await expect.poll(async()=>{const m=await metrics(page);return m.played.some((c:{sound:string;seq:number})=>c.sound==='warrior1'&&c.seq===1);}).toBe(true);
 const played=await metrics(page),cue=played.played.find((c:{sound:string;seq:number})=>c.sound==='warrior1'&&c.seq===1);expect(cue.animation).toBe('attack_1');expect(cue.frame).toBeGreaterThanOrEqual(7);
 await page.getByRole('button',{name:'ส่ง Event เดิมซ้ำ',exact:true}).click();await page.waitForTimeout(900);expect((await metrics(page)).played.filter((c:{sound:string;seq:number})=>c.sound==='warrior1'&&c.seq===1)).toHaveLength(1);
 await page.getByLabel('เฟสบอส',{exact:true}).selectOption('3');await expect.poll(async()=>(await metrics(page)).music).toBe('raid_final_phase');
 await page.getByRole('button',{name:'boss_defeated',exact:true}).click();await expect.poll(async()=>(await metrics(page)).played.some((c:{sound:string})=>c.sound==='death')).toBe(true);await page.getByRole('button',{name:'ส่ง Event เดิมซ้ำ',exact:true}).click();await page.waitForTimeout(900);expect((await metrics(page)).played.filter((c:{sound:string})=>c.sound==='death')).toHaveLength(1);
 await page.getByRole('button',{name:'สลับทีมจำลอง',exact:true}).click();await page.getByRole('button',{name:'ปิดเสียงเกม',exact:true}).click();const muted=await metrics(page);expect(muted.muted).toBe(true);expect(muted.voices).toBe(0);expect(muted.played.some((c:{sound:string})=>c.sound==='critical'||c.sound==='spawn')).toBe(false);
 await fs.writeFile(path.join(evidence,'audio-playback.json'),JSON.stringify({decode:50,releaseCue:cue,final:muted},null,2)+'\n');
});
test('missing floor and audio assets degrade without crash',async({page})=>{
 await page.route('**/assets/boss-raid/scenes/**',route=>route.abort());await page.route('**/assets/boss-raid/audio/**',route=>route.abort());await page.goto('/dev/boss-raid/scene');await expect(page.getByText(/ใช้สนามสำรอง/).first()).toBeVisible();await page.getByRole('button',{name:'เปิดเสียงเกม',exact:true}).click();await page.getByRole('button',{name:'hero_attack',exact:true}).click();await expect(page.getByRole('status').filter({hasText:/เสียง|เพลง/}).first()).toBeVisible();await expect(page.locator('canvas')).toHaveCount(1);await expect(page.getByRole('button',{name:'ส่งออก Scene Config',exact:true})).toBeEnabled();
});

test('unsupported OPUS uses derived MP3 and Low releases Full scene textures',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=function(mime){return mime.includes('opus')?'':original.call(this,mime);};});
 const requested:string[]=[];page.on('request',request=>{if(request.url().includes('/audio/'))requested.push(request.url());});
 await page.goto('/dev/boss-raid/scene');await ready(page);await page.getByRole('button',{name:'เปิดเสียงเกม',exact:true}).click();
 await page.getByRole('button',{name:'hero_attack',exact:true}).click();await expect.poll(async()=>(await metrics(page)).played.some((cue:{sound:string})=>cue.sound==='warrior1')).toBe(true);
 expect(requested.some(url=>url.includes('/audio/fallback/')&&url.endsWith('.mp3'))).toBe(true);expect(requested.some(url=>url.endsWith('.opus'))).toBe(false);
 await page.waitForTimeout(2500);const full=await metrics(page);await page.getByLabel('คุณภาพ',{exact:true}).selectOption('low');await ready(page);await page.waitForTimeout(3500);const low=await metrics(page);
 expect(low.render.scene.decodedBytes).toBeLessThan(full.render.scene.decodedBytes);expect(low.render.scene.sheets).toBeLessThanOrEqual(3);await expect(page.locator('canvas')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});await ready(page);await page.waitForTimeout(1500);await page.screenshot({path:path.join(evidence,'calibration-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1366,height:768});await ready(page);await page.waitForTimeout(1500);await page.screenshot({path:path.join(evidence,'calibration-desktop.png'),fullPage:true});
 await fs.writeFile(path.join(evidence,'performance-fallback.json'),JSON.stringify({environment:'Headless Chromium on this Windows host; not physical device FPS or exact GPU allocation',full,low,requested},null,2)+'\n');
});
