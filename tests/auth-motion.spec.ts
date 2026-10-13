import { browserRequest } from "./browser-request";
import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const data = path.resolve('tmp/e2e-data');
async function login(page: Page, code = 'admin', password = 'teacher-test-only') {
  await page.goto('/login');
  await page.getByLabel('รหัสผู้ใช้').fill(code);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', {name:'เข้าสู่ระบบ', exact:true}).click();
}
test.beforeEach(async () => {
  await writeFile(path.join(data, 'game-sessions.json'), '[]');
  await writeFile(path.join(data, 'question-sets.json'), '[]');
});
test('teacher-only session survives refresh, direct wrong-role URL, and another tab', async ({page, context}) => {
  await login(page, '  aDmIn  ');
  await expect(page).toHaveURL(/teacher\/question-sets$/);
  for (const url of ['/join', '/', '/login']) {
    await page.goto(url); await expect(page).toHaveURL(/teacher\/question-sets$/);
    await page.reload(); await expect(page.getByRole('link', {name:'ครู ครูทดสอบ', exact:true})).toBeVisible();
  }
  const other = await context.newPage(); await other.goto('/');
  await expect(other).toHaveURL(/teacher\/question-sets$/);
  const cookie = (await context.cookies()).find(c => c.name === 'rqg_session_v2');
  expect(cookie?.httpOnly).toBe(true); expect(cookie?.secure).toBe(true);
  expect(cookie?.value.split('.')).toHaveLength(3);
});
test('wrong password stays on form, normalized Thai digits reach student account', async ({page}) => {
  await login(page, 'admin', 'wrong-password');
  await expect(page.locator('#login-error')).toContainText('รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  await expect(page.getByLabel('รหัสผู้ใช้')).toHaveValue('ADMIN');
  await login(page, '๐๒๐๗๔', 'student-test-only');
  await expect(page).toHaveURL(/\/join$/);
  await page.goto('/teacher/question-sets'); await expect(page).toHaveURL(/\/join$/);
});
test('legacy and tampered cookies cannot grant teacher privileges', async ({page,context}) => {
  await context.addCookies([{name:'rqg_session', value:Buffer.from(JSON.stringify({role:'teacher',userCode:'ADMIN'})).toString('base64'), url:'http://127.0.0.1:3100'}]);
  await page.goto('/teacher/question-sets'); await expect(page).toHaveURL(/\/login\?/);
  await login(page); await expect(page).toHaveURL(/teacher\/question-sets$/);
  const cookie = (await context.cookies()).find(c=>c.name==='rqg_session_v2')!;
  const parts=cookie.value.split('.'); parts[1]=Buffer.from(JSON.stringify({sub:'T002',role:'teacher'})).toString('base64url');
  await context.addCookies([{...cookie, value:parts.join('.')}]);
  const response=await browserRequest(page, '/api/teacher/rooms/1234/control',{method:'POST',data:{command:'start'}});
  expect(response.status()).toBe(401);
});
test('account switch blocks stale API and locks old tab with recovery dialog', async ({page,context}) => {
  await login(page); await expect(page).toHaveURL(/teacher\/question-sets$/);
  const previous=await (await browserRequest(page, '/api/auth/session')).json();
  const other=await context.newPage(); await other.goto('/');
  await other.getByRole('button',{name:'ออกจากระบบ'}).click();
  await login(other,'T002'); await expect(other).toHaveURL(/teacher\/question-sets$/);
  const response=await browserRequest(page, '/api/teacher/rooms/1234/control',{method:'POST',headers:{'x-client-session':previous.sessionId},data:{command:'start'}});
  expect(response.status()).toBe(409);
  await page.bringToFront(); await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link',{name:'เปิดหน้าของบัญชีปัจจุบัน'})).toBeVisible();
});
test('role change revokes existing session and invalid roles never become students', async ({page,context}) => {
  const file=path.join(data,'student.csv'), original=await readFile(file,'utf8');
  try {
    await login(page); await expect(page).toHaveURL(/teacher\/question-sets$/);
    await writeFile(file, original.replace('ADMIN,ครูทดสอบ,teacher-test-only,TEACHER,TEACHER','ADMIN,ครูทดสอบ,teacher-test-only,TEACHER,STUDENT'));
    expect(await (await browserRequest(page, '/api/auth/session')).json()).toBeNull();
    await context.clearCookies();
    await writeFile(file, original.replace('ADMIN,ครูทดสอบ,teacher-test-only,TEACHER,TEACHER','ADMIN,ครูทดสอบ,teacher-test-only,TEACHER,UNKNOWN'));
    await login(page); await expect(page.locator('#login-error')).toContainText('ข้อมูลบัญชีหรือสิทธิ์ยังไม่ถูกต้อง');
    expect((await context.cookies()).some(c=>c.name==='rqg_session_v2')).toBe(false);
  } finally { await writeFile(file,original); }
});
test('full effects ignore legacy preferences and respect system accessibility',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('rqg-effects','reduced'));
  await page.goto('/login');
  await expect(page.getByLabel('ระดับเอฟเฟกต์')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-effects','full');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('html')).toHaveAttribute('data-effects','reduced');
  await expect(page.locator('.scene-3d canvas')).toHaveCount(0);
});
test('login wallpaper and authentication work without WebGL',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{value:function(this:HTMLCanvasElement,kind:string,...args:unknown[]){return kind.includes('webgl')?null:Reflect.apply(original,this,[kind,...args]);}});
  });
  await page.goto('/login');
  await expect(page.locator('.login-wallpaper video')).toBeVisible();
  await expect(page.locator('.scene-3d')).toHaveCount(0);
  await login(page);await expect(page).toHaveURL(/teacher\/question-sets$/);
});
