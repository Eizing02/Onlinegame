// Deterministic packing/thumbnail derivation; source artwork is native ImageGen RGBA.
import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';
import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import catalog from '../../src/features/boss-raid/assets/catalog.json' with {type:'json'};
import {packGeneratedAtlas} from './pack-generated-atlas.mjs';
const root='docs/raid-boss-roster',only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const index=JSON.parse(await fs.readFile(`${root}/generation-index.json`,'utf8'));
const binary=path.resolve(`.agents/skills/impeccable/scripts/bin/${process.platform==='win32'?'windows':'linux'}-x64/impeccable${process.platform==='win32'?'.exe':''}`);
const stamp=(file,prompt)=>execFileSync(binary,['embed-prompt',path.resolve(file),'--prompt',prompt],{stdio:'pipe'});
const reportPath=`${root}/generated-assets.json`;let report=JSON.parse(await fs.readFile(reportPath,'utf8').catch(()=>'[]'));
for(const job of index.filter(j=>!only||only.includes(j.boss)||only.includes(j.id))){
 const prompt=(await fs.readFile(job.promptFile,'utf8')).trimEnd();
 if(!(await sharp(job.source).metadata()).hasAlpha)throw new Error(`${job.id}: native alpha required`);
 stamp(job.source,prompt);let destination;
 if(job.kind==='master'){
  destination=`public/assets/boss-raid/portraits/${job.boss}.png`;await fs.mkdir(path.dirname(destination),{recursive:true});
  await sharp(job.source).trim({threshold:1}).resize(240,240,{fit:'contain',background:'#00000000'}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).png({compressionLevel:9}).toFile(destination);
 }else if(job.kind==='vfx'){
  destination=`public/assets/boss-raid/vfx/${job.id}.png`;await fs.mkdir(path.dirname(destination),{recursive:true});
  await sharp(job.source).resize(320,320,{fit:'contain',background:'#00000000'}).png({compressionLevel:9}).toFile(destination);
 }else{
  destination=`public/assets/boss-raid/${catalog.bosses[job.boss].folder}/${catalog.bossClips[job.clip]}.png`;await fs.mkdir(path.dirname(destination),{recursive:true});
  const atlas=await packGeneratedAtlas(job.source,384,24);await fs.writeFile(destination,atlas.png);
  await fs.writeFile(`${root}/sources/${job.id}.packing.json`,JSON.stringify({cellSize:384,padding:24,scale:atlas.scale,frames:atlas.frames},null,2)+'\n');
 }
 stamp(destination,prompt);const file=await fs.readFile(destination),meta=await sharp(file).metadata();
 const row={id:job.id,kind:job.kind,boss:job.boss,clip:job.clip,path:destination,source:job.source,promptFile:job.promptFile,prompt,tool:'native image_gen',
  transform:job.kind==='sheet'?'Native silhouettes isolated, one common scale per clip, exact 4x4 padded 384px cells; no generated poses or color key':'Resize only; native alpha and white paint preserved',
  width:meta.width,height:meta.height,decodedBytes:meta.width*meta.height*4,bytes:file.length,sha256:createHash('sha256').update(file).digest('hex')};
 report=report.filter(r=>r.id!==job.id);report.push(row);console.log(`${job.id}: ${meta.width}x${meta.height}, ${file.length} bytes`);
}
const reference=`${root}/sources/dragon-style-reference.png`;
stamp(reference,'Source: user-provided original public/assets/boss-raid/boss/idle.png, first real frame extracted for rendering-style reference; original sprite pixels unchanged.');
if(!only||only.includes('legacy')){
 const destination='public/assets/boss-raid/portraits/shadow_dragon.png';await fs.mkdir(path.dirname(destination),{recursive:true});
 await sharp(reference).trim({threshold:1}).resize(240,240,{fit:'contain',background:'#00000000'}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).png({compressionLevel:9}).toFile(destination);
 stamp(destination,'Source: user-provided original dragon idle sprite, first actual frame. Deterministic portrait; no AI generation or recoloring; original sheet unchanged.');
}
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
