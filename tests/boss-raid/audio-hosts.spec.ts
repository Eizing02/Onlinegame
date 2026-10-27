import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const fixture = 'http://127.0.0.1:3111', dir = process.env.RAID_AUDIO_EVIDENCE_DIR ?? '.impeccable/review/wallpaper-audio';
async function login(page: Page, email: string, code?: string) {
  await page.goto('/login'); await page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google', exact: true }).click();
  await page.getByRole('link', { name: email, exact: true }).click();
  if (code) { await expect(page).toHaveURL(/verify-student/); await page.getByLabel('รหัสประจำตัวนักเรียน', { exact: true }).fill(code); await page.getByRole('button', { name: 'ตรวจสอบรหัส', exact: true }).click(); await page.getByRole('button', { name: 'ยืนยันและเข้าเกม', exact: true }).click(); await expect(page).toHaveURL(/\/join$/); }
  else await expect(page).toHaveURL(/\/teacher\/question-sets$/);
}
test('teacher and student header audio panels share readable controls at both widths', async ({ page, browser, request }) => {
  await mkdir(dir, { recursive: true }); await request.post(`${fixture}/__test/reset`); await request.post(`${fixture}/__test/raid-bank`);
  await login(page, 'piyawatpiwsiri@gmail.com'); await page.goto('/teacher/rooms/new');
  await page.getByLabel('Boss Raid · Time Attack').check(); await page.getByLabel('จำนวนทีม', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'สร้างห้อง Boss Raid', exact: true }).click(); await expect(page).toHaveURL(/\/raid\/dashboard$/);
  const room = page.url().match(/rooms\/(\d{4})/)![1];
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3110' }), pupil = await context.newPage(), reports = [];
  try {
    await login(pupil, 'pupil@example.com', '01234'); await expect(pupil).toHaveURL(/\/join$/);
    await pupil.getByLabel('รหัสห้อง').fill(room); await pupil.getByRole('button', { name: 'ค้นหาห้อง' }).click();
    await pupil.getByRole('button', { name: /ทีม 1/ }).click();await pupil.getByRole('button',{name:/^ยืนยันเข้าทีม/}).click(); await expect(pupil).toHaveURL(/\/raid$/);
    for (const [host, target] of [['teacher', page], ['student-header', pupil]] as [string, Page][]) for (const [size, width, height] of [['desktop', 1366, 768], ['phone', 390, 844]] as [string, number, number][]) {
      await target.setViewportSize({ width, height }); await target.getByRole('button', { name: 'ตั้งค่าเสียง', exact: true }).click();
      const panel = target.locator('.audio-panel:popover-open'); await expect(panel).toBeVisible();
      await target.mouse.move(6, 1);
      const styles = await panel.evaluate(element => { const label = element.querySelector('.audio-level')!, input = label.querySelector('input')!, button = element.querySelector('.audio-mute')!; return { font: getComputedStyle(label).fontSize, range: input.getBoundingClientRect().width, label: label.getBoundingClientRect().width, background: getComputedStyle(button).backgroundColor, color: getComputedStyle(button).color }; });
      expect(styles.font).toBe('16px'); expect(styles.range).toBeCloseTo(styles.label, 0); expect(styles.background).toBe('rgb(121, 13, 22)'); expect(styles.color).toBe('rgb(245, 239, 225)');
      const violations = (await new AxeBuilder({ page: target }).include('.audio-panel:popover-open').analyze()).violations;
      expect(violations).toEqual([]); reports.push({ host, size, styles, violations });
      await target.screenshot({ path: `${dir}/${host}-audio-${size}.png` }); await target.keyboard.press('Escape'); await expect(panel).toHaveCount(0);
    }
    await pupil.setViewportSize({ width: 320, height: 400 }); await page.getByRole('button', { name: 'เริ่ม Boss Raid', exact: true }).click();
    const question = pupil.locator('.raid-question-dialog'); await expect(question).toBeVisible();
    await question.getByRole('button', { name: 'ตั้งค่าเสียง', exact: true }).click();
    await pupil.getByRole('button', { name: 'ปิดเสียงเกม', exact: true }).click();
    await expect(pupil.getByRole('button', { name: 'เปิดเสียงเกม', exact: true })).toBeVisible();
    await pupil.screenshot({ path: `${dir}/raid-audio-320.png` });
    await pupil.getByRole('button', { name: 'เปิดเสียงเกม', exact: true }).click(); await pupil.keyboard.press('Escape'); await expect(question).toBeVisible();
    await writeFile(`${dir}/audio-host-audit.json`, JSON.stringify(reports, null, 2));
  } finally { await context.close(); }
});
