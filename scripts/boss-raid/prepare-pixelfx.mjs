import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Render offline from the reviewed MIT source. No PixelFX runtime dependency.
const revision = "5294518ce7c72e48b6100a744596e0acf57f2826";
if (!process.argv[2]) throw new Error("Usage: node scripts/boss-raid/prepare-pixelfx.mjs <local PixelFX checkout>");
const checkout = path.resolve(process.argv[2]);
const actual = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (actual !== revision || execFileSync("git", ["-C", checkout, "status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim()) {
  throw new Error("PixelFX checkout must match the reviewed, clean revision: " + revision);
}
const { loadEffect, renderFrames } = await import(pathToFileURL(path.join(checkout, "tools/lib/fxlib.mjs")).href);
const assetDir = "public/assets/boss-raid/vfx/animated";
await fs.mkdir(assetDir, { recursive: true });

// Source time (seconds), played time (ms), sample count, and optional art direction.
const clips = {
  spark: ["impacts/hit-spark", .03, .46, 420, 10],
  slash: ["melee/sword-slash", .02, .55, 520, 12],
  thud: ["impacts/blunt-hit", .03, .78, 580, 12],
  frost: ["ice/frost-nova", .38, 1.8, 760, 15],
  fireball: ["fire/fireball", .05, .65, 350, 10, { centered: true }],
  lightning: ["lightning/lightning-strike", .87, 1.68, 720, 15],
  sigil: ["shadow/hex-sigil", .85, 2.7, 700, 14],
  heal: ["holy/heal-aoe", .26, 1.55, 720, 14],
  star: ["holy/sunburst", .08, .8, 540, 12, { centered: true }],
  wind: ["water/ripples", .15, 1.24, 580, 12],
  daggers: ["melee/dagger-flurry", .04, .83, 620, 13],
  spin: ["melee/spin-slash", .08, .54, 520, 12, {
    palette: ["#43221c", "#734126", "#c67a36", "#f5a84e", "#ffd489", "#fff2c3", "#fffdfa"],
  }],
  plasma: ["explosions/plasma-explosion", .04, .59, 620, 14],
  claws: ["melee/claw-swipe", .03, .55, 520, 12, {
    centered: true,
    palette: ["#2b1538", "#4d2059", "#7c329b", "#a753dc", "#cc83f1", "#eeb9ff", "#f9dfff", "#fffbff"],
    sparks: ["#f9dfff", "#eeb9ff", "#cc83f1", "#7c329b"],
  }],
  breath: ["fire/fire-breath", 0, .64, 350, 10, {
    centered: true,
    palette: ["#26132c", "#552155", "#864297", "#ae62c0", "#d493e0", "#f3c7d7", "#ffeadb", "#fff4dc", "#ffffff"],
  }],
  shadow: ["shadow/dark-explosion", .94, 2.0, 820, 16],
  quake: ["nature/quake", .1, 1.16, 730, 14, { pivotX: 145 }],
  stone: ["nature/earth-spike", .08, 1.44, 860, 16],
  pincers: ["melee/double-slash", .04, .67, 560, 12],
  crystal: ["ice/ice-spikes", .08, 1.83, 1020, 18, { pivotX: 108 }],
  firework: ["explosions/firework-burst", .47, 1.88, 1150, 18, { centered: true, maxDimension: 138 }],
};

function trim(frames, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (const frame of frames) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (frame[(y * width + x) * 4 + 3] < 9) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error("Effect is entirely transparent");
  // Preserve a clear border in the source and another gutter in the atlas.
  left = Math.max(0, left - 2);
  top = Math.max(0, top - 2);
  right = Math.min(width - 1, right + 2);
  bottom = Math.min(height - 1, bottom + 2);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

const skill = path.resolve(".agents/skills/impeccable/scripts");
const engineVersion = (await fs.readFile(path.join(skill, "VERSION"), "utf8")).trim();
const bundled = path.join(skill, "bin", "windows-" + process.arch, "impeccable.exe");
const launcher = process.platform === "win32"
  ? [process.env.IMPECCABLE_BIN, bundled, path.join(os.homedir(), ".impeccable", "bin", engineVersion, "impeccable.exe")].find(file => file && existsSync(file))
  : path.join(skill, "impeccable");
if (!launcher) throw new Error("Run the project Impeccable launcher once to cache its engine, or set IMPECCABLE_BIN.");
const manifest = {};
for (const [id, [source, from, to, durationMs, count, art = {}]] of Object.entries(clips)) {
  const effect = await loadEffect(source);
  const sourceFps = 30;
  const options = { ...(art.palette && { palette: art.palette }), ...(art.sparks && { sparks: art.sparks }) };
  const sourceFrames = renderFrames(effect, { fps: sourceFps, actor: false, bg: "none", seed: 19, options });
  const { w, h } = sourceFrames;
  const frames = Array.from({ length: count }, (_, i) => {
    const index = Math.round((from + (to - from) * i / (count - 1)) * sourceFps);
    return sourceFrames.frames[Math.min(index, sourceFrames.frames.length - 1)].clear;
  });
  const bounds = trim(frames, w, h);
  const scale = Math.min(1, (art.maxDimension ?? 112) / Math.max(bounds.width, bounds.height));
  const width = Math.max(1, Math.round(bounds.width * scale)), height = Math.max(1, Math.round(bounds.height * scale));
  const columns = Math.min(5, count), rows = Math.ceil(count / columns);
  const sheetWidth = columns * (width + 2), sheetHeight = rows * (height + 2);
  const [originX, originY] = effect.meta.origin;
  const layers = [];
  for (const [i, frame] of frames.entries()) {
    const input = await sharp(Buffer.from(frame), { raw: { width: w, height: h, channels: 4 } })
      .extract(bounds).resize(width, height, { kernel: "lanczos3" }).png().toBuffer();
    layers.push({ input, left: (i % columns) * (width + 2) + 1, top: Math.floor(i / columns) * (height + 2) + 1 });
  }
  const output = path.join(assetDir, id + ".png");
  await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 4, background: "#00000000" } })
    .composite(layers).png({ compressionLevel: 9 }).toFile(output);
  const anchor = art.centered ? [.5, .5] : [((art.pivotX ?? originX) - bounds.left) / bounds.width, (originY - bounds.top) / bounds.height];
  const provenance = `Source: PixelFX (MIT), https://github.com/patch-gg/pixelfx/blob/${revision}/src/fx/${source}.js. Rendered without stand-in actors or background; seed 19, ${from}–${to}s, ${count} real frames. Deterministic crop, resample and pack via scripts/boss-raid/prepare-pixelfx.mjs.`;
  execFileSync(launcher, ["embed-prompt", path.resolve(output), "--prompt", provenance], { stdio: "pipe" });
  const buffer = await fs.readFile(output);
  manifest[id] = {
    source, from, to, durationMs, count, columns, width, height, sheetWidth, sheetHeight,
    anchor: anchor.map(n => Math.round(n * 10000) / 10000),
    bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex"),
  };
  console.log(id, count + " frames", width + "x" + height, Math.round(buffer.length / 1024) + " KiB");
}
await fs.writeFile("src/features/boss-raid/assets/animated-fx.json", JSON.stringify({ revision, clips: manifest }, null, 2) + "\n");
await fs.copyFile(path.join(checkout, "LICENSE"), path.join(assetDir, "LICENSE.txt"));
await fs.copyFile(path.join(checkout, "NOTICE.md"), path.join(assetDir, "NOTICE.md"));
