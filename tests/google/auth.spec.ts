import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { browserRequest } from '../browser-request';

const origin = 'http://127.0.0.1:3110';
const fixture = 'http://127.0.0.1:3111';
async function login(page: Page, email = 'pupil@example.com') {
  await page.goto('/login');
  await page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google', exact: true }).click();
  await page.getByRole('link', { name: email, exact: true }).click();
}
async function link(page: Page, code = '01234') {
  await page.getByLabel('รหัสประจำตัวนักเรียน', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'ตรวจสอบรหัส', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยันและเข้าเกม', exact: true }).click();
  await expect(page).toHaveURL(/\/join$/);
}
test.beforeEach(async ({ request }) => { expect((await request.post(`${fixture}/__test/reset`)).ok()).toBeTruthy(); });

test('Google PKCE links a pupil after preview/edit and remembers the binding', async ({ page }) => {
  await login(page); await expect(page).toHaveURL(/verify-student$/);
  await page.getByLabel('รหัสประจำตัวนักเรียน', { exact: true }).fill('๐๑๒๓๕');
  await page.getByRole('button', { name: 'ตรวจสอบรหัส', exact: true }).click();
  await expect(page.getByText('นักเรียน สอง', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'แก้ไขรหัส', exact: true }).click();
  await link(page);
  await page.getByRole('link', { name: 'ข้อมูลบัญชี', exact: true }).click();
  await expect(page.getByText('01234', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await expect(page).toHaveURL(/login\?notice=signed_out$/);
  await login(page); await expect(page).toHaveURL(/join$/);
});

test('code changes are atomic, reset the client identity and preserve refresh identity', async ({ page, context, request }) => {
  await login(page); await link(page);
  const before = await (await browserRequest(page, '/api/auth/session')).json();
  await page.goto('/account');
  await page.getByText('เปลี่ยนรหัสประจำตัวนักเรียน', { exact: true }).click();
  await page.getByLabel('รหัสนักเรียนใหม่', { exact: true }).fill('01235');
  await page.getByRole('button', { name: 'ตรวจสอบรหัส', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยันเปลี่ยนรหัส', exact: true }).click();
  await expect(page).toHaveURL(/join$/);
  const after = await (await browserRequest(page, '/api/auth/session')).json();
  expect(after.sessionId).not.toBe(before.sessionId);
  const stale = await browserRequest(page, '/api/auth/student/change-code', { method:'POST', headers: { 'x-client-session': before.sessionId }, data: { studentCode: '01236' } });
  expect(stale.status()).toBe(409);
  // Expire the mock Supabase token, then exercise the real SSR proxy refresh.
  const cookies = (await context.cookies()).filter(c=>/^sb-.+-auth-token(?:\.\d+)?$/.test(c.name)).sort((a,b)=>a.name.localeCompare(b.name));
  const raw = cookies.map(c=>c.value).join('');
  const session = JSON.parse(Buffer.from(raw.replace('base64-', ''), 'base64url').toString());
  const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString());
  const refreshed = await (await request.get(`${fixture}/__test/expire?id=${claims.sub}&session=${claims.session_id}`)).json();
  await context.clearCookies();
  await context.addCookies([{ name: cookies[0].name.replace(/\.\d+$/, ''), value: 'base64-'+Buffer.from(JSON.stringify(refreshed)).toString('base64url'), url: origin, httpOnly: true, sameSite: 'Lax', secure: true }]);
  await page.reload();
  const stable = await (await browserRequest(page, '/api/auth/session')).json();
  expect(stable.sessionId).toBe(after.sessionId);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('duplicate claims, invalid codes, durable limits and untrusted origins are denied', async ({ page, browser }) => {
  await login(page);
  expect((await page.request.post('/api/auth/student/lookup', { headers: { Origin: 'https://evil.example' }, data: { studentCode: '01234' } })).status()).toBe(403);
  expect((await browserRequest(page, '/api/auth/student/lookup', { method:'POST', data: { studentCode: 'ADMIN' } })).status()).toBe(409);
  const other = await browser.newContext({ baseURL: origin }); const second = await other.newPage();
  await login(second, 'other@example.com');
  const results = await Promise.all([page, second].map(target=>browserRequest(target, '/api/auth/student/claim', { method:'POST', data: { studentCode: '01234' } })));
  expect(results.map(r=>r.status()).sort()).toEqual([200,409]);
  for (let i=0;i<10;i++) await browserRequest(page, '/api/auth/student/lookup', { method:'POST', data: { studentCode: '99999' } });
  expect((await browserRequest(page, '/api/auth/student/lookup', { method:'POST', data: { studentCode: '01236' } })).status()).toBe(429);
  await other.close();
});

test('admin adds teachers, ordinary teachers cannot see another teacher room, suspension is immediate', async ({ page, browser, request }) => {
  await login(page, 'piyawatpiwsiri@gmail.com'); await expect(page).toHaveURL(/question-sets$/);
  await page.getByRole('link', { name: 'จัดการครู', exact: true }).click();
  await page.getByText('เพิ่มครูใหม่', { exact: true }).click();
  await page.getByLabel('อีเมล Google ของครู').fill('TEACHER@example.com');
  await page.locator('.identity-disclosure').getByLabel('ชื่อ–นามสกุลที่แสดง', { exact: true }).fill('ครู Google ทดสอบ');
  await page.getByRole('button', { name: 'เพิ่มครู', exact: true }).click();
  await expect(page.getByText(/เพิ่มครูแล้ว \(T000001\)/)).toBeVisible();
  await expect(page.getByText('teacher@example.com', { exact: true })).toBeVisible();
  await request.post(`${fixture}/__test/room`);
  const context = await browser.newContext({ baseURL: origin }); const teacher = await context.newPage();
  await login(teacher, 'teacher@example.com'); await expect(teacher).toHaveURL(/question-sets$/);
  expect((await browserRequest(teacher, '/api/teacher/rooms/1234/dashboard')).status()).toBe(404);
  expect((await browserRequest(teacher, '/api/teacher/rooms/1234/control', { method:'POST', data: { command: 'end' } })).status()).toBe(400);
  await teacher.goto('/admin/teachers'); await expect(teacher).toHaveURL(/access-denied$/);
  await request.post(`${fixture}/__test/suspend-teacher`);
  expect((await browserRequest(teacher, '/api/teacher/rooms/1234/dashboard')).status()).toBe(403);
  await teacher.goto('/teacher/question-sets'); await expect(teacher).toHaveURL(/access-denied$/);
  await expect(teacher.getByText(/บัญชีครูนี้ถูกระงับ/)).toBeVisible();
  await context.close();
});

test('Google student join uses the existing classroom and blocks a code change during a game', async ({ page, request }) => {
  await login(page); await link(page); await request.post(`${fixture}/__test/room`);
  await page.getByLabel('รหัสห้อง', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'ค้นหาห้อง', exact: true }).click();
  await page.getByRole('button', { name: /กลุ่ม 1/ }).click();
  await expect(page).toHaveURL(/play\/1234$/);
  await page.goto('/account');
  await page.getByText('เปลี่ยนรหัสประจำตัวนักเรียน', { exact: true }).click();
  await page.getByLabel('รหัสนักเรียนใหม่', { exact: true }).fill('01235');
  await page.getByRole('button', { name: 'ตรวจสอบรหัส', exact: true }).click();
  await expect(page.locator('#student-link-error')).toContainText('ยังมีห้องเกมที่ไม่จบ');
});

test('Google gameplay keeps teams and scoring through reload, power, reveal, next and end', async ({ page, browser, request }) => {
  await login(page); await link(page);
  await request.post(`${fixture}/__test/room?questions=2`);
  await page.getByLabel('รหัสห้อง', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'ค้นหาห้อง', exact: true }).click();
  await page.getByRole('button', { name: /กลุ่ม 1/ }).click();
  await expect(page).toHaveURL(/play\/1234$/);
  await page.getByRole('button', { name: 'เข้าใจแล้ว', exact: true }).click();
  const context = await browser.newContext({ baseURL: origin }); const teacher = await context.newPage();
  try {
    await login(teacher, 'piyawatpiwsiri@gmail.com'); await expect(teacher).toHaveURL(/rooms\/1234\/dashboard$/);
    const control = async (command: string) => {
      const response = await browserRequest(teacher, '/api/teacher/rooms/1234/control', { method: 'POST', data: { command } });
      expect(response.status()).toBe(200); return response.json();
    };
    await control('start');
    await expect(page.getByLabel('คำตอบของคุณ')).toBeEnabled();
    const initial = await (await browserRequest(page, '/api/play/1234')).json();
    await page.reload();
    const reconnected = await (await browserRequest(page, '/api/play/1234')).json();
    expect(reconnected.sessionId).toBe(initial.sessionId); expect(reconnected.team.id).toBe(initial.team.id);
    expect(reconnected.teamPower.canActivate).toBe(true);
    await expect(page.getByRole('button', { name: 'ใช้พลังทีม +50%', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'ใช้พลังทีม +50%', exact: true }).click();
    await expect(page.getByRole('button', { name: 'ใช้พลังทีม +50%', exact: true })).toHaveCount(0);
    await page.getByLabel('คำตอบของคุณ').fill('5');
    await page.getByRole('button', { name: 'ส่งคำตอบ', exact: true }).click();
    await expect(page.getByText('ส่งคำตอบแล้ว รอครูเฉลย')).toBeVisible();
    const hidden = await (await browserRequest(page, '/api/play/1234')).json();
    expect(hidden.teamScore.rawScore).toBe(0); expect(hidden.contribution).toBeNull();
    await control('lock'); await control('reveal');
    await expect(page.locator('.contribution-result')).toBeVisible();
    const first = await (await browserRequest(page, '/api/play/1234')).json();
    expect(first.teamScore.rawScore).toBe(15); expect(first.teamScore.averageScore).toBe(15);
    await control('next');
    await expect(page.getByLabel('คำตอบของคุณ')).toBeEnabled();
    await page.getByLabel('คำตอบของคุณ').fill('6');
    await page.getByRole('button', { name: 'ส่งคำตอบ', exact: true }).click();
    await expect(page.getByText('ส่งคำตอบแล้ว รอครูเฉลย')).toBeVisible();
    await control('reveal');
    const final = await (await browserRequest(page, '/api/play/1234')).json();
    expect(final.teamScore.rawScore).toBe(30); expect(final.teamScore.averageScore).toBe(30);
    expect(final.contribution.total).toBe(15);
    await control('end');
    expect((await (await browserRequest(page, '/api/play/1234')).json()).status).toBe('ended');
    await page.goto('/account'); await expect(page.getByText('01234', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
    await login(page); await expect(page).toHaveURL(/join$/);
  } finally { await context.close(); }
});

test('non-Google identity, forged legacy cookie and OAuth redirect tricks fail closed', async ({ page, context, request }) => {
  await context.addCookies([{ name:'rqg_session', value: Buffer.from(JSON.stringify({ role: 'teacher', userCode: 'ADMIN' })).toString('base64'), url:origin }]);
  await page.goto('/teacher/question-sets'); await expect(page).toHaveURL(/login$/);
  await expect(page.getByLabel('รหัสผ่าน', { exact:true })).toHaveCount(0);
  const callback = await request.get('/auth/callback?error=access_denied&next=https://evil.example', { maxRedirects:0, headers:{'x-forwarded-host':'evil.example'} });
  expect(callback.headers().location).toBe(`${origin}/login?error=oauth_cancelled`);
  await login(page, 'email@example.com'); await expect(page).toHaveURL(/access-denied$/);
  await expect(page.locator('main [role="alert"]')).toContainText('บัญชี Google');
  await page.getByRole('button', { name:'ออกจากระบบ', exact:true }).click();
  await expect(page).toHaveURL(/login\?notice=signed_out$/);
  expect((await context.cookies()).filter(c=>c.name.startsWith('sb-') || c.name.startsWith('rqg_'))).toHaveLength(0);
});

test('Google surfaces: desktop/mobile accessibility, long names and keyboard input', async ({ page, request }) => {
  test.setTimeout(180000);
  const output = path.resolve('tmp/google-ui-audit'); await mkdir(output, { recursive: true });
  const report: unknown[] = [];
  async function capture(name:string) {
    for (const [width,height] of [[1440,900],[390,844],[320,740]]) {
      await page.setViewportSize({width,height}); await page.evaluate(()=>document.fonts.ready);
      const audit = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      const overflow = await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      report.push({name,width,overflow,violations:audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
      await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true});
      expect(overflow).toBe(0); expect(audit.violations).toEqual([]);
    }
  }
  await page.goto('/login'); await capture('login');
  await login(page); await capture('verify');
  await page.getByLabel('รหัสประจำตัวนักเรียน', {exact:true}).fill('01234');
  await page.getByLabel('รหัสประจำตัวนักเรียน', {exact:true}).press('Enter');
  await expect(page.getByRole('button',{name:'ยืนยันและเข้าเกม',exact:true})).toBeVisible(); await capture('preview');
  await page.getByRole('button',{name:'ยืนยันและเข้าเกม',exact:true}).click(); await expect(page).toHaveURL(/join$/);
  await page.goto('/account'); await capture('account');
  await page.getByText('เปลี่ยนรหัสประจำตัวนักเรียน',{exact:true}).click(); await capture('account-change');
  await page.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();
  await request.post(`${fixture}/__test/allow-teacher`);
  await login(page,'piyawatpiwsiri@gmail.com'); await page.goto('/admin/teachers'); await capture('teachers');
  await page.getByText('เพิ่มครูใหม่',{exact:true}).click(); await capture('teacher-add');
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
});
