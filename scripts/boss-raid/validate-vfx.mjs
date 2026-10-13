import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const assets=JSON.parse(await fs.readFile('docs/raid-combat-feedback/generated-assets.json','utf8'));
assert.equal(assets.length,9);
let decoded=0,bytes=0;
for(const asset of assets){
 assert.match(asset.path,/^public\/assets\/boss-raid\/vfx\/[a-z-]+\.png$/);
 const file=await fs.readFile(asset.path),metadata=await sharp(file).metadata();
 assert.equal(createHash('sha256').update(file).digest('hex'),asset.sha256);
 assert.equal(metadata.width,asset.width);assert.equal(metadata.height,asset.height);assert.equal(metadata.hasAlpha,true);
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let clear=0,visible=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;else visible++;}
 assert.ok(clear>0&&visible>0,`${asset.name}: real alpha and painted content required`);
 const pixels=info.width*info.height;assert.ok(clear/pixels>.05,`${asset.name}: missing transparent margin`);
 assert.ok(asset.prompt.includes('transparent')||asset.prompt.includes('transparency'));
 decoded+=pixels*4;bytes+=file.length;
}
assert.ok(decoded<=8*1024*1024,'VFX decoded texture budget exceeded');
console.log(`9 generated VFX PNGs PASS: hash, dimensions, alpha, prompts; ${bytes} bytes, ${decoded} decoded bytes (<8 MiB).`);
