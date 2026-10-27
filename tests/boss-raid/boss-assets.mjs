import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import sharp from 'sharp';import {loadTs} from '../../scripts/boss-raid/load-ts.mjs';
const {BOSS_TYPES,BOSS_DEFINITIONS,resolveBossType,bossName,bossSpritePath,bossAttackEffect,bossAttackSound}=loadTs('src/features/boss-raid/assets/boss-definitions.ts');
assert.equal(BOSS_TYPES.length,3);assert.equal(resolveBossType(undefined),'shadow_dragon');assert.equal(resolveBossType('unknown'),'shadow_dragon');assert.equal(bossName(null),'มังกรเงา');
const assets=JSON.parse(await fs.readFile('docs/raid-boss-roster/generated-assets.json','utf8'));assert.equal(assets.length,32);assert.equal(new Set(assets.map(a=>a.id)).size,32);
for(const[kind,count]of [['sheet',24],['master',2],['vfx',6]])assert.equal(assets.filter(a=>a.kind===kind).length,count);
let bytes=0;
for(const asset of assets){
 const file=await fs.readFile(asset.path),meta=await sharp(file).metadata();bytes+=file.length;
 assert.equal(createHash('sha256').update(file).digest('hex'),asset.sha256,asset.id);assert.equal(meta.hasAlpha,true);
 assert.equal(meta.width,asset.kind==='sheet'?1536:asset.kind==='master'?256:320);assert.equal(meta.height,meta.width);
 assert.equal(asset.prompt,(await fs.readFile(asset.promptFile,'utf8')).trimEnd());assert.equal(asset.tool,'native image_gen');
 if(asset.kind==='sheet'){
  const hashes=[];for(let frame=0;frame<16;frame++){
   const data=await sharp(file).extract({left:frame%4*384,top:Math.floor(frame/4)*384,width:384,height:384}).ensureAlpha().raw().toBuffer();let visible=0;
   for(let y=0;y<384;y++)for(let x=0;x<384;x++){const alpha=data[(y*384+x)*4+3];if(alpha>32)visible++;if(x<23||x>360||y<23||y>360)assert.equal(alpha,0,`${asset.id}/${frame}: clear cell margin`);}
   assert.ok(visible>500,`${asset.id}/${frame}: painted silhouette`);hashes.push(createHash('sha256').update(data).digest('hex'));
  }assert.ok(new Set(hashes).size>=8,`${asset.id}: real animation`);
 }
}
for(const type of BOSS_TYPES){
 const def=BOSS_DEFINITIONS[type],portrait=await sharp(`public/assets/boss-raid/portraits/${type}.png`).metadata();assert.equal(portrait.width,256);assert.equal(portrait.hasAlpha,true);
 for(const clip of ['idle','ready','attack_1','attack_2','dodge','hit','death','run','breath','shield','ultimate','victory_roar'])assert.ok((await fs.stat('public'+bossSpritePath(type,clip))).size>0);
 assert.equal(bossAttackEffect(type,'breath'),def.effects.ranged);assert.equal(bossAttackEffect(type,'ultimate'),def.effects.ultimate);assert.equal(bossAttackSound(type,'ready'),null);
 assert.ok(!Object.keys(def).some(k=>/damage|score|hp|resistance/i.test(k)),'Definitions contain no gameplay advantages');
}
const report=JSON.parse(await fs.readFile('docs/boss-raid/asset-validation.json','utf8'));assert.equal(report.failures,0);assert.equal(report.sheets,96);assert.equal(report.frames,1536);
console.log(`Boss assets PASS: three identities, 32 native assets, 24 atlases/384 actual padded frames, six effects, alpha/prompts/hashes; runtime ${bytes} bytes.`);
