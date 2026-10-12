// Metadata-only: preserves source files and PNG pixel data.
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const binary=path.resolve(`.agents/skills/impeccable/scripts/bin/${process.platform==='win32'?'windows':'linux'}-x64/impeccable${process.platform==='win32'?'.exe':''}`);
await access(binary);
const report=JSON.parse(await readFile('docs/boss-raid/asset-import.json','utf8'));
const root=path.resolve('public/assets/boss-raid');
for(const file of report.files){
 const destination=path.resolve(root,file.destination);if(!destination.startsWith(root+path.sep))throw new Error('Asset path escaped root');
 const origin=`Source: user-provided D:/ภาพใช้ในเกม/${file.source}. Original SHA-256 ${file.sha256}. Real 4x4 sprite; pixels preserved; no AI generation.`;
 execFileSync(binary,['embed-prompt',destination,'--prompt',origin],{stdio:'pipe'});
 file.destinationSha256=createHash('sha256').update(await readFile(destination)).digest('hex');file.origin='User-provided original sprite; pixels preserved. Distribution copy embeds source provenance metadata.';
}
await writeFile('docs/boss-raid/asset-import.json',JSON.stringify(report,null,2)+'\n');
console.log(`Stamped source provenance on ${report.files.length} distribution copies; originals untouched.`);
