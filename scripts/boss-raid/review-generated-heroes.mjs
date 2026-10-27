// QA contact sheets: real atlas frames composited on cream, never replacement art.
import fs from 'node:fs/promises';import sharp from 'sharp';
const dir='.impeccable/review/raid-heroes-v2';await fs.mkdir(dir,{recursive:true});
const heroes=['ranger','ninja','monk','engineer','bard'];
const clips=['idle','attack_1','attack_2','hit','victory','defeat'];
for(const hero of heroes){
 const cells=[];
 for(let row=0;row<clips.length;row++)for(const [col,frame]of [0,7,15].entries()){
  const input=await sharp(`public/assets/boss-raid/heroes/${hero}/${clips[row]}.png`).extract({left:frame%4*320,top:Math.floor(frame/4)*320,width:320,height:320}).resize(160,160).png().toBuffer();
  cells.push({input,left:col*160,top:row*160});
 }
 await sharp({create:{width:480,height:960,channels:4,background:'#f5efe1'}}).composite(cells).png().toFile(`${dir}/${hero}-frames-0-7-15.png`);
}
const effects=JSON.parse(await fs.readFile('docs/raid-heroes-v2/generated-assets.json','utf8')).filter(a=>a.kind==='vfx');
const cells=await Promise.all(effects.map(async(a,i)=>({input:await sharp(a.path).resize(160,160).png().toBuffer(),left:i%5*160,top:Math.floor(i/5)*160})));
await sharp({create:{width:800,height:320,channels:4,background:'#392829'}}).composite(cells).png().toFile(`${dir}/new-vfx-alpha.png`);
console.log('Five contact sheets: rows idle/attack_1/attack_2/hit/victory/defeat, columns frames 0/7/15; VFX dark-alpha check.');
