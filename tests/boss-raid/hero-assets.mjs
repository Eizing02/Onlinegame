import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import sharp from 'sharp';
const assets=JSON.parse(await fs.readFile('docs/raid-heroes-v2/generated-assets.json','utf8'));
assert.equal(assets.length,45);assert.equal(new Set(assets.map(a=>a.id)).size,45);
for(const [kind,count]of [['sheet',30],['master',5],['vfx',10]])assert.equal(assets.filter(a=>a.kind===kind).length,count);
let bytes=0;
for(const asset of assets){
 const file=await fs.readFile(asset.path),meta=await sharp(file).metadata();bytes+=file.length;
 assert.equal(createHash('sha256').update(file).digest('hex'),asset.sha256,asset.id);
 assert.equal(meta.hasAlpha,true,`${asset.id}: native alpha`);
 assert.equal(meta.width,asset.kind==='sheet'?1280:asset.kind==='master'?256:320);assert.equal(meta.height,meta.width);
 assert.equal(asset.prompt,(await fs.readFile(asset.promptFile,'utf8')).trimEnd());assert.equal(asset.tool,'native image_gen');
 if(asset.kind==='sheet'){
  const frames=[];for(let frame=0;frame<16;frame++){
   const {data}=await sharp(file).extract({left:frame%4*320,top:Math.floor(frame/4)*320,width:320,height:320}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let visible=0;for(let y=0;y<320;y++)for(let x=0;x<320;x++){const alpha=data[(y*320+x)*4+3];if(alpha>32)visible++;if(x<15||x>304||y<15||y>304)assert.equal(alpha,0,`${asset.id}/${frame}: cell margin`);}
   assert.ok(visible>500,`${asset.id}/${frame}: complete painted frame`);frames.push(createHash('sha256').update(data).digest('hex'));
  }
  assert.ok(new Set(frames).size>=8,`${asset.id}: real sequential animation, no repeated filler`);
 }
}
let portraits=0;for(const hero of ['warrior','mage','wizard','witch','fairy','ranger','ninja','monk','engineer','bard']){
 const file=await fs.readFile(`public/assets/boss-raid/portraits/${hero}.png`),meta=await sharp(file).metadata();portraits+=file.length;assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.hasAlpha,true);
}assert.ok(portraits<1024*1024,'Ten lobby portraits stay below 1 MiB total');
const old=JSON.parse(await fs.readFile('docs/raid-combat-feedback/generated-assets.json','utf8'));
const common=old.filter(a=>['dragon-claw','dragon-flame','dragon-ultimate','healing-light'].includes(a.name));
const activeVfx=common.reduce((n,a)=>n+a.width*a.height*4,0)+10*320*320*4;
assert.ok(activeVfx<8*1024*1024,'New five plus common combat VFX stay below 8 MiB decoded');
const validation=JSON.parse(await fs.readFile('docs/boss-raid/asset-validation.json','utf8'));assert.equal(validation.failures,0);assert.equal(validation.sheets,96);assert.equal(validation.frames,1536);
console.log(`Hero assets PASS: 45 native generated assets; 30 padded atlases/480 real frames; hashes/prompts/alpha; portraits ${portraits} bytes; active VFX ${activeVfx} decoded bytes; runtime files ${bytes} bytes.`);
