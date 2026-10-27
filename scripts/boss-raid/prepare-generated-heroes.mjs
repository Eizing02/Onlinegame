// Deterministic atlas packing only. Art is generated with the native image tool;
// this script never paints, chroma-keys, synthesizes frames, or changes identity.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { packGeneratedAtlas } from './pack-generated-atlas.mjs';
import catalog from '../../src/features/boss-raid/assets/catalog.json' with { type: 'json' };

const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
const root = 'docs/raid-heroes-v2';
const jobs = JSON.parse(await fs.readFile(`${root}/generation-index.json`, 'utf8'));
const binary = path.resolve(`.agents/skills/impeccable/scripts/bin/${process.platform === 'win32' ? 'windows' : 'linux'}-x64/impeccable${process.platform === 'win32' ? '.exe' : ''}`);
const reportPath = `${root}/generated-assets.json`;
let report = JSON.parse(await fs.readFile(reportPath, 'utf8').catch(() => '[]'));
const stamp = (file, prompt) => execFileSync(binary, ['embed-prompt', path.resolve(file), '--prompt', prompt], { stdio: 'pipe' });
const selected = jobs.filter(j => !only || only.includes(j.hero) || only.includes(j.id));
for (const job of selected) {
  const prompt = (await fs.readFile(job.promptFile, 'utf8')).trimEnd();
  const meta = await sharp(job.source).metadata();
  if (!meta.hasAlpha) throw new Error(`${job.id}: native RGBA alpha required`);
  stamp(job.source, prompt);
  let destination;
  if (job.kind === 'master') {
    destination = `public/assets/boss-raid/portraits/${job.hero}.png`;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await sharp(job.source).trim({ threshold: 1 }).resize(240, 240, { fit: 'contain', background: '#00000000' })
      .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#00000000' })
      .png({ compressionLevel: 9 }).toFile(destination);
  } else if (job.kind === 'vfx') {
    destination = `public/assets/boss-raid/vfx/${job.id}.png`;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await sharp(job.source).resize(320, 320, { fit: 'contain', background: '#00000000' }).png({ compressionLevel: 9 }).toFile(destination);
  } else {
    destination = `public/assets/boss-raid/heroes/${job.hero}/${job.clip}.png`;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const atlas=await packGeneratedAtlas(job.source);
    await fs.writeFile(destination,atlas.png);
    await fs.writeFile(`${root}/sources/${job.id}.packing.json`,JSON.stringify({scale:atlas.scale,frames:atlas.frames},null,2)+'\n');
  }
  stamp(destination, prompt);
  const file = await fs.readFile(destination), runtime = await sharp(file).metadata();
  const entry = { id: job.id, kind: job.kind, hero: job.hero, clip: job.clip, path: destination,
    source: job.source, promptFile: job.promptFile, prompt, tool: 'native image_gen',
    transform: job.kind === 'sheet' ? 'Sixteen native alpha silhouettes separated by connected components; common per-sheet scale; 4x4 packing in padded 320px cells; no generated frames or color removal' : 'Resize only, native alpha preserved',
    width: runtime.width, height: runtime.height, bytes: file.length,
    sha256: createHash('sha256').update(file).digest('hex') };
  report = report.filter(r => r.id !== job.id); report.push(entry);
  console.log(`${job.id}: ${runtime.width}x${runtime.height}, ${file.length} bytes`);
}
// The old heroes get lightweight portraits from their real first idle frame.
if (!only || only.includes('legacy')) for (const hero of catalog.heroes.slice(0, 5)) {
  const source = `public/assets/boss-raid/heroes/${hero}/idle.png`;
  const destination = `public/assets/boss-raid/portraits/${hero}.png`;
  const meta = await sharp(source).metadata();
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await sharp(source).extract({ left: 0, top: 0, width: meta.width / 4, height: meta.height / 4 })
    .trim({ threshold: 1 }).resize(240, 240, { fit: 'contain', background: '#00000000' })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#00000000' })
    .png({ compressionLevel: 9 }).toFile(destination);
  stamp(destination, `Source: user-provided original ${hero}/idle.png, first real frame only. Deterministic thumbnail; no AI generation or recoloring. Original sprite unchanged.`);
}
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
