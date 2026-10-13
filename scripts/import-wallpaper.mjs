import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import sharp from 'sharp';

const source = resolve(process.argv[2] ?? '../wallpaper');
const target = resolve('public/assets/wallpaper');
await mkdir(target, { recursive: true });
const files = [
  ['wallpaper phone.png', 'phone.png'],
  ['wallpaper tablet.png', 'tablet.png'],
  ['wallpaper pc.png', 'pc.png'],
];
for (const [original, output] of files) {
  await copyFile(resolve(source, original), resolve(target, output));
  await sharp(resolve(source, original)).webp({ quality: 86 }).toFile(resolve(target, output.replace('.png', '.webp')));
}
const videos = [
  ['wallpaper phone vdo loop.mp4', 'login-phone.mp4'],
  ['wallpaper pc & tablet vdo loop.mp4', 'login-wide.mp4'],
];
for (const [original, output] of videos) {
  execFileSync('ffmpeg', ['-y', '-i', resolve(source, original), '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', resolve(target, output)], { stdio: 'pipe', windowsHide: true });
}
await writeFile(resolve(target, 'provenance.json'), JSON.stringify({
  source: 'User supplied wallpaper directory',
  images: files.map(([original, output]) => ({ original, output, derived: output.replace('.png', '.webp'), transform: 'Original PNG unchanged; WebP quality 86 for login poster only' })),
  videos: videos.map(([original, output]) => ({ original, output, transform: 'H.264 CRF 24, original dimensions and frame rate, AAC 128k, faststart. Original audio retained.' })),
}, null, 2) + '\n');
console.log('Imported 3 original PNGs, 3 login posters and 2 video loops.');
