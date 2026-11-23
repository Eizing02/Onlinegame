import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import { HERO_IMPACT } from "../../../src/features/boss-raid/assets/animated-fx";
import { HERO_TYPES } from "../../../src/features/boss-raid/assets/manifest";

const review = ".impeccable/review/raid-pixelfx";
const capture = process.env.RAID_FX_CAPTURE === "1";
const read = <T>(page: Page, attribute: string) =>
  page.getByTestId("raid-stage").getAttribute(attribute).then(json => json ? JSON.parse(json) as T : null);
type Stats = { loaded: string[]; active: string[]; decodedBytes: number };
type Feedback = { shown: { seq: number; amount: number | null; effect: string; animated?: string }[] };

async function setup(page: Page) {
  await page.goto("/dev/boss-raid/scene");
  await page.getByLabel("แสดงจุดยืนและ Polygon", { exact: true }).uncheck();
  await expect(page.locator(".raid-scene-loading")).toHaveCount(0);
}

async function loaded(page: Page, effects: string[]) {
  await expect.poll(async () => {
    const stats = await read<Stats>(page, "data-animated-fx");
    return effects.every(id => stats?.loaded.includes(id));
  }).toBe(true);
}

async function impact(page: Page, event: "hero_attack" | "hero_hit" | "heal", seq: number, effect: string, amount: number, evidence?: string) {
  if (capture && evidence) await page.getByRole("button", { name: "จับจังหวะกระแทก", exact: true }).click();
  await page.getByRole("button", { name: event, exact: true }).click();
  await expect.poll(async () => {
    const stats = await read<Feedback>(page, "data-feedback");
    return stats?.shown.find(hit => hit.seq === seq);
  }).toMatchObject({ animated: effect, amount });
  if (capture && evidence) {
    await expect(page.getByTestId("raid-stage")).toHaveAttribute("data-preview-paused", "true");
    await page.locator(".raid-arena").screenshot({ path: review + "/" + evidence + ".png" });
    await page.getByRole("button", { name: "เล่นฉากต่อ", exact: true }).click();
  }
}

test("Paired PixelFX impacts render for every hero and the three bosses at real combat timing", async ({ page }) => {
  test.setTimeout(420_000);
  if (capture) await fs.mkdir(review, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await setup(page);

  for (const roster of ["legacy", "new"] as const) {
    await page.getByLabel("ชุดฮีโร่", { exact: true }).selectOption(roster);
    await page.getByRole("button", { name: "รีเซ็ตตัวอย่าง", exact: true }).click();
    const heroes = roster === "legacy" ? HERO_TYPES.slice(0, 5) : HERO_TYPES.slice(5);
    await loaded(page, heroes.flatMap(hero => Object.values(HERO_IMPACT[hero]).map(look => look.id)));
    let seq = 0;
    for (const [index, hero] of heroes.entries()) {
      await page.getByLabel("ตัวละคร", { exact: true }).selectOption(String(index));
      for (const attack of ["attack_1", "attack_2"] as const) {
        await impact(page, "hero_attack", ++seq, HERO_IMPACT[hero][attack].id, 100, hero + "-" + attack);
        await page.waitForTimeout(640);
      }
    }
    const stats = await read<Stats>(page, "data-animated-fx");
    expect(stats!.decodedBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const [boss, effects] of [
    ["shadow_dragon", ["claws", "spark", "claws", "shadow"]],
    ["stone_titan", ["thud", "quake", "quake", "stone"]],
    ["crystal_scorpion", ["pincers", "spark", "pincers", "crystal"]],
  ] as const) {
    await page.getByLabel("บอส", { exact: true }).selectOption(boss);
    await page.getByRole("button", { name: "รีเซ็ตตัวอย่าง", exact: true }).click();
    await loaded(page, [...effects, "heal", "firework"]);
    for (const [phase, damageSeq, index, shot] of [
      [1, 1, 0, "phase-1"], [2, 3, 1, "phase-2"], [2, 4, 2, "phase-2-secondary"], [3, 5, 3, "phase-3"],
    ] as const) {
      await page.getByLabel("เฟสบอส", { exact: true }).selectOption(String(phase));
      if (damageSeq === 3) await impact(page, "heal", 2, "heal", 10, boss === "shadow_dragon" ? "heal-phone" : undefined);
      await impact(page, "hero_hit", damageSeq, effects[index], 15, boss + "-" + shot);
      await page.waitForTimeout(1100);
    }
    await expect.poll(async () => (await read<Stats>(page, "data-animated-fx"))?.active).toEqual([]);
  }
  if (capture) await page.getByRole("button", { name: "จับจังหวะกระแทก", exact: true }).click();
  await page.getByRole("button", { name: "boss_defeated", exact: true }).click();
  await expect.poll(async () => (await read<Stats>(page, "data-animated-fx"))?.active).toContain("firework");
  if (capture) {
    await expect(page.getByTestId("raid-stage")).toHaveAttribute("data-preview-paused", "true");
    await page.locator(".raid-arena").screenshot({ path: review + "/victory-phone.png" });
    await page.getByRole("button", { name: "เล่นฉากต่อ", exact: true }).click();
  }
  await expect.poll(async () => (await read<Stats>(page, "data-animated-fx"))?.active).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("A missing effect and reduced motion each preserve confirmed damage feedback", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const page = await browser.newPage({ reducedMotion, viewport: { width: 320, height: 568 } });
    try {
      await page.route("**/animated/slash.png", route => route.abort());
      await setup(page);
      if (reducedMotion === "no-preference") await loaded(page, ["thud"]);
      await page.getByRole("button", { name: "hero_attack", exact: true }).click();
      await expect.poll(async () => (await read<Feedback>(page, "data-feedback"))?.shown[0])
        .toMatchObject({ amount: 100, effect: "warrior-slash" });
      const hit = (await read<Feedback>(page, "data-feedback"))?.shown[0];
      expect(hit?.animated).toBeUndefined();
      if (reducedMotion === "reduce") {
        expect((await read<Stats>(page, "data-animated-fx"))?.loaded).toEqual([]);
        if (capture) await page.locator(".raid-arena").screenshot({ path: review + "/reduced-small-phone.png" });
      }
    } finally {
      await page.close();
    }
  }
});
