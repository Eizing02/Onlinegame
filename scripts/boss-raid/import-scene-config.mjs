import fs from 'node:fs/promises';import {loadTs} from './load-ts.mjs';
const file=process.argv[2];if(!file)throw new Error('Usage: npm run raid:scenes:config -- exported-scene.json');
const {sceneSchema}=loadTs('src/features/boss-raid/scenes/registry.ts');const text=await fs.readFile(file,'utf8');if(text.length>100000)throw new Error('Config exceeds size limit');const scene=sceneSchema.parse(JSON.parse(text));
const target='src/features/boss-raid/scenes/registry.json';const registry=JSON.parse(await fs.readFile(target,'utf8'));const index=registry.scenes.findIndex(s=>s.sceneId===scene.sceneId);if(index<0)registry.scenes.push(scene);else registry.scenes[index]=scene;
await fs.writeFile(target,JSON.stringify(registry,null,2)+'\n');console.log(`Saved validated ${scene.sceneId} config to ${target}; no database writes.`);
