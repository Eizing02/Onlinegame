import { readdir, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assetFiles, normalizeName } from './asset-files.mjs';

const args = process.argv.slice(2);
const source = args.find(arg => !arg.startsWith('--')) || process.env.BOSS_RAID_ASSETS_DIR;
if (!source) throw new Error('Supply source folder: npm run raid:assets:import -- "path/to/assets" [--mapping=map.json]');
const mappingArg = args.find(arg => arg.startsWith('--mapping='));
const mapping = mappingArg ? JSON.parse(await readFile(mappingArg.slice(10),'utf8')) : {};
const directories = await readdir(source, {withFileTypes:true});
const targetRoot = path.resolve('public/assets/boss-raid');
const report=[];
for (const asset of assetFiles()) {
  const folder=directories.find(dir=>dir.isDirectory()&&normalizeName(dir.name)===normalizeName(asset.sourceFolder??'boss'));
  if (!folder) throw new Error(`Missing source directory: ${asset.key}`);
  const candidates=await readdir(path.join(source,folder.name));
  const supplied=mapping[asset.key];
  const matches=candidates.filter(file=>path.extname(file).toLowerCase()==='.png'&&(supplied ? file===supplied : asset.aliases.some(alias=>normalizeName(path.parse(file).name)===normalizeName(alias))));
  if(matches.length!==1) throw new Error(`Ambiguous/missing ${asset.key}. Supply --mapping=map.json with {"${asset.key}":"exact filename.png"}.`);
  const sourceFile=path.join(source,folder.name,matches[0]);
  const destination=path.join(targetRoot,asset.folder,asset.file);
  if (!destination.startsWith(targetRoot+path.sep)) throw new Error('Invalid destination');
  await mkdir(path.dirname(destination),{recursive:true});
  await copyFile(sourceFile,destination);
  report.push({key:asset.key,source:`${folder.name}/${matches[0]}`,destination:path.relative(targetRoot,destination).replaceAll('\\','/'),sha256:createHash('sha256').update(await readFile(sourceFile)).digest('hex'),origin:'User-provided original sprite sheet; copied unchanged.'});
}
await mkdir('docs/boss-raid',{recursive:true});
await writeFile('docs/boss-raid/asset-import.json',JSON.stringify({sheets:report.length,files:report},null,2)+'\n');
console.log(`Imported ${report.length} original sheets without changing source files.`);
