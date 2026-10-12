import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const source=path.resolve(process.argv[2]??'D:/ภาพใช้ในเกม/background arena');
const sceneId=process.argv[3]??'shadow-citadel';
if(!/^[a-z][a-z0-9-]{0,40}$/.test(sceneId))throw new Error('Invalid scene ID');
const target=path.resolve('public/assets/boss-raid/scenes',sceneId);await fs.mkdir(target,{recursive:true});
const names=await fs.readdir(source);if(new Set(names.map(n=>n.normalize('NFC').toLowerCase())).size!==names.length)throw new Error('Ambiguous normalized filenames');
const files=[];
const impeccable=path.resolve('.agents/skills/impeccable/scripts/bin/windows-x64/impeccable.exe');
for(const profile of ['wide','phone'])for(const layer of ['far','mid','fight']){
 const name=`background ${layer}${profile==='phone'?' phone':''}.png`;
 if(!names.includes(name))throw new Error(`Missing exact image: ${name}`);
 const original=await fs.readFile(path.join(source,name));const sha256=createHash('sha256').update(original).digest('hex');
 const meta=await sharp(original).metadata();const {data,info}=await sharp(original).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let transparent=0,solid=0,min=255,max=0;for(let i=3;i<data.length;i+=4){const a=data[i];min=Math.min(min,a);max=Math.max(max,a);if(a<255)transparent++;if(a>32)solid++;}
 if(layer!=='far'&&!transparent)throw new Error(`${name}: no actual alpha transparency`);
 const destination=path.join(target,name);await fs.writeFile(destination,original);
 execFileSync(impeccable,['embed-prompt',destination,'--prompt',`Source: user-provided ${path.join(source,name)}. Original SHA-256 ${sha256}. Original arena layer; no AI generation or pixel edits.`],{windowsHide:true,stdio:'pipe'});
 files.push({sceneId,profile,layer,filename:name,url:`/assets/boss-raid/scenes/${sceneId}/${encodeURIComponent(name)}`,sha256,destinationSha256:createHash('sha256').update(await fs.readFile(destination)).digest('hex'),bytes:original.length,width:meta.width,height:meta.height,mime:'image/png',hasAlpha:meta.hasAlpha,alphaMin:min,alphaMax:max,transparentFraction:transparent/(info.width*info.height),visibleFraction:solid/(info.width*info.height),decodedBytes:info.width*info.height*4,status:'READY',alignment:profile==='phone'&&layer==='far'?'Uniform cover into 1024x1536; center crop, no stretch':'Native identity alignment'});
}
const extras=names.filter(n=>!files.some(f=>f.filename===n));
await fs.mkdir('docs/boss-raid/scene-audio',{recursive:true});
await fs.writeFile('docs/boss-raid/scene-audio/scene-import.json',JSON.stringify({sceneId,source,files,extras,notes:['Phone far 941x1672 differs from 1024x1536 mid/fight; alignment is explicit.','Calibration must be verified in the actual renderer before reviewed=true.']},null,2)+'\n');
console.log(`${files.length} original scene layers copied with provenance; originals unchanged.`);
