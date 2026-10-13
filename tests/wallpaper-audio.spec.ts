import { test, expect, devices, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const evidence = '.impeccable/review/wallpaper-audio';
test.beforeEach(async () => {
  // Other classroom suites intentionally leave active rooms. Isolate login landing tests.
  await writeFile('tmp/e2e-data/game-sessions.json', '[]\n');
});
const viewports = [
  { name: 'phone', width: 390, height: 844, touch: true, image: 'phone' },
  { name: 'phone-small', width: 320, height: 568, touch: true, image: 'phone' },
  { name: 'phone-landscape', width: 844, height: 390, touch: true, image: 'phone' },
  { name: 'tablet', width: 768, height: 1024, touch: true, image: 'tablet' },
  { name: 'tablet-landscape', width: 1024, height: 768, touch: true, image: 'tablet' },
  { name: 'desktop', width: 1366, height: 768, touch: false, image: 'pc' },
];
async function login(page: Page) {
  await page.getByLabel('รหัสผู้ใช้').fill('02074');
  await page.getByLabel('รหัสผ่าน').fill('student-test-only');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/join$/);
}
async function openAudio(page: Page) { await page.getByRole('button', { name: 'ตั้งค่าเสียง', exact: true }).click(); await expect(page.locator('.audio-panel:popover-open')).toBeVisible(); }
async function outsideInput(page: Page, touch = false) {
  // Click a genuinely exposed part of the input, outside the floating panel.
  const input = page.getByLabel('รหัสผู้ใช้'), bounds = await input.boundingBox(), popup = await page.locator('.audio-panel:popover-open').boundingBox();
  expect(bounds).not.toBeNull(); expect(popup).not.toBeNull();
  const x = bounds!.x < popup!.x ? Math.min(bounds!.width / 2, Math.max(2, popup!.x - bounds!.x - 4)) : bounds!.width - 4;
  if (touch) await input.tap({ position: { x, y: bounds!.height / 2 } });
  else await input.click({ position: { x, y: bounds!.height / 2 } });
}
test('wallpaper devices, login and room entry stay readable without overflow', async ({ browser }) => {
  await mkdir(evidence, { recursive: true }); const reports = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, screen: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, isMobile: viewport.touch });
    const page = await context.newPage(); const media: string[] = []; const errors: string[] = [];
    page.on('request', request => { if (request.url().includes('/assets/wallpaper/') && request.url().endsWith('.mp4')) media.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/login'); const video = page.locator('.login-wallpaper video');
    await expect(video).toHaveAttribute('src', `/assets/wallpaper/login-${viewport.image === 'phone' ? 'phone' : 'wide'}.mp4`);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
    await video.evaluate((v: HTMLVideoElement) => { v.pause(); v.currentTime = 3; });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${evidence}/login-${viewport.name}.png`, fullPage: true });
    expect(new Set(media).size, JSON.stringify({ viewport: viewport.name, media })).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await openAudio(page); await page.getByRole('button', { name: 'ปิดเสียงเกม', exact: true }).click();
    if (viewport.name === 'phone' || viewport.name === 'desktop') await page.screenshot({ path: `${evidence}/audio-${viewport.name}.png`, fullPage: true });
    await page.mouse.click(6, 40); await expect(page.locator('.audio-panel:popover-open')).toHaveCount(0);
    await login(page);
    const image = page.locator('.join-wallpaper > img');
    await expect(image).toHaveAttribute('src', `/assets/wallpaper/${viewport.image}.png`);
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await image.evaluate(img => getComputedStyle(img).opacity)).toBe('0.5');
    await page.screenshot({ path: `${evidence}/join-${viewport.name}.png`, fullPage: true });
    await openAudio(page); await expect(page.getByRole('button', { name: 'เปิดเสียงเกม', exact: true })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.locator('.audio-panel:popover-open')).toHaveCount(0);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    expect(errors).toEqual([]);
    reports.push({ ...viewport, media: [...new Set(media)], errors, axe: axe.violations.map(v => v.id), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    expect(reports.at(-1)!.overflow).toBe(false); await context.close();
  }
  await writeFile(`${evidence}/responsive-audit.json`, JSON.stringify(reports, null, 2));
});
test('video loops with clip sound, mute persists, outside and Escape dismiss', async ({ page }) => {
  await page.goto('/login'); const video = page.locator('.login-wallpaper video');
  await openAudio(page);
  await expect(page.getByRole('button', { name: 'ปิดเสียงเกม', exact: true })).toBeVisible();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.muted && !v.paused)).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.loop && v.playsInline)).toBe(true);
  await video.evaluate((v: HTMLVideoElement) => { v.currentTime = 9.7; });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10000 }).toBeLessThan(3);
  const slider = page.getByRole('slider', { name: 'ระดับเสียงรวม', exact: true });
  await slider.focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.audio-panel:popover-open')).toBeVisible();
  expect(await slider.inputValue()).toBe('0.6');
  await page.getByRole('button', { name: 'ปิดเสียงเกม', exact: true }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted && !v.paused)).toBe(true);
  await outsideInput(page); await expect(page.locator('.audio-panel:popover-open')).toHaveCount(0);
  await expect(page.getByLabel('รหัสผู้ใช้')).toBeFocused();
  await page.reload(); await openAudio(page); await expect(slider).toHaveValue('0.6');
  await expect(page.getByRole('button', { name: 'เปิดเสียงเกม', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'เปิดเสียงเกม', exact: true }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.muted && !v.paused)).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.locator('.audio-panel:popover-open')).toHaveCount(0);
});
test('blocked autoplay retries on a real click while login stays usable', async ({ page }) => {
  await page.addInitScript(() => {
    let tapped = false;
    document.addEventListener('pointerdown', event => { if (event.isTrusted) tapped = true; }, true);
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!this.muted && !tapped) return Promise.reject(new DOMException('Fixture: gesture required', 'NotAllowedError'));
      return play.call(this);
    };
  });
  await page.goto('/login'); const video = page.locator('video');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted && !v.paused)).toBe(true);
  await expect(page.getByLabel('รหัสผู้ใช้')).toBeEnabled();
  await page.getByLabel('รหัสผู้ใช้').click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.muted && !v.paused)).toBe(true);
  await login(page);
});
test('missing video uses poster and does not block authentication', async ({ page }) => {
  await page.route('**/assets/wallpaper/*.mp4', route => route.abort());
  await page.goto('/login'); await expect(page.locator('.login-wallpaper > img')).toBeVisible();
  await expect(page.locator('.login-wallpaper > img')).toHaveAttribute('src', /\.webp$/);
  await login(page); await expect(page.getByLabel('รหัสห้อง')).toBeEnabled();
});
test('old clip stops on navigation and there is only one background music owner', async ({ page }) => {
  await page.addInitScript(() => {
    const scope = window as unknown as { trackedMedia: HTMLMediaElement[] }; scope.trackedMedia = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!scope.trackedMedia.includes(this)) scope.trackedMedia.push(this); return play.call(this); };
  });
  await page.goto('/login'); await login(page); await openAudio(page);
  await expect.poll(() => page.evaluate(() => {
    const media = (window as unknown as { trackedMedia: HTMLMediaElement[] }).trackedMedia;
    return media.filter(m => !m.paused && !m.muted).map(m => m.getAttribute('src'));
  })).toEqual(['/assets/audio/bg-sci-fi.wav']);
  await page.getByRole('button', { name: 'ปิดเสียงเกม', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { trackedMedia: HTMLMediaElement[] }).trackedMedia.filter(m => !m.paused && !m.muted).length)).toBe(0);
});
test('touch slider responds without dismissing and outside tap still focuses input', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'] }); const page = await context.newPage();
  await page.goto('/login'); await page.getByRole('button', { name: 'ตั้งค่าเสียง', exact: true }).tap();
  const slider = page.getByRole('slider', { name: 'ระดับเสียงรวม', exact: true }), bounds = await slider.boundingBox(); expect(bounds).not.toBeNull();
  await page.touchscreen.tap(bounds!.x + bounds!.width * .25, bounds!.y + bounds!.height / 2);
  expect(Number(await slider.inputValue())).toBeLessThan(.4); await expect(page.locator('.audio-panel:popover-open')).toBeVisible();
  const cdp = await context.newCDPSession(page);
  const y = bounds!.y + bounds!.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds!.x + bounds!.width * .25, y }] });
  for (const fraction of [.4, .6, .8]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds!.x + bounds!.width * fraction, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(Number(await slider.inputValue())).toBeGreaterThan(.6);
  await expect(page.locator('.audio-panel:popover-open')).toBeVisible();
  await outsideInput(page, true); await expect(page.locator('.audio-panel:popover-open')).toHaveCount(0);
  await expect(page.getByLabel('รหัสผู้ใช้')).toBeFocused(); await context.close();
});
