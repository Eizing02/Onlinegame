// Read-only source inspection; composites are QA evidence, never shipped artwork.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const output='.impeccable/review/scene-audio';await fs.mkdir(output,{recursive:true});
const sceneRoot='D:/ภาพใช้ในเกม/background arena';
for(const profile of ['wide','phone']){
 const suffix=profile==='phone'?' phone':'';
 const layers=await Promise.all(['far','mid','fight'].map(async layer=>({layer,file:path.join(sceneRoot,`background ${layer}${suffix}.png`)})));
 const fight=await sharp(layers[2].file).metadata();
 const buffers=await Promise.all(layers.map(({file})=>sharp(file).resize(fight.width,fight.height,{fit:'cover'}).toBuffer()));
 const composite=await sharp(buffers[0]).composite(buffers.slice(1).map(input=>({input}))).png().toBuffer();
 await sharp(composite).resize({width:profile==='wide'?1400:768}).png().toFile(`${output}/source-${profile}-composite.png`);
}
const catalog=JSON.parse(await fs.readFile('src/features/boss-raid/assets/catalog.json','utf8'));
const actors=['boss','warrior','mage','wizard','witch','fairy'];
for(const actor of actors){
 const clips=actor==='boss'?Object.values(catalog.bossClips):['idle','attack_1','attack_2','hit','victory','defeat'];
 const cells=[];
 for(let row=0;row<clips.length;row++){
  const file=`public/assets/boss-raid/${actor==='boss'?'boss':`heroes/${actor}`}/${clips[row]}.png`;const meta=await sharp(file).metadata();
  for(let col=0;col<3;col++){
   const frame=[0,7,15][col],fw=meta.width/4,fh=meta.height/4;
   const image=await sharp(file).extract({left:frame%4*fw,top:Math.floor(frame/4)*fh,width:fw,height:fh}).resize(260,250,{fit:'contain',background:'#111f42'}).png().toBuffer();
   cells.push({input:image,left:col*280,top:row*280+25});
  }
 }
 const labels=Buffer.from(`<svg width="840" height="${clips.length*280}">${clips.map((name,i)=>`<text x="8" y="${i*280+20}" fill="white" font-size="16">${actor}/${name} - frames 0,7,15</text>`).join('')}</svg>`);
 await sharp({create:{width:840,height:clips.length*280,channels:4,background:'#111f42'}}).composite([...cells,{input:labels,left:0,top:0}]).png().toFile(`${output}/source-${actor}-clips.png`);
}
console.log('QA composites and all 42 clip contact sheets saved; source artwork unchanged.');
