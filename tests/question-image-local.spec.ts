import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("retries a lost response without duplicates and serves the uploaded picture to Classic students", async ({ page, request, browser }) => {
  await page.goto("/login");
  await page.getByLabel("รหัสผู้ใช้").fill("admin");
  await page.getByLabel("รหัสผ่าน").fill("teacher-test-only");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.getByLabel("ชื่อชุดคำถาม").fill("ชุดทดสอบรูปโหมด Local");
  await page.getByRole("button", { name: "สร้างชุดคำถาม" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets\/[\da-f-]+$/);
  const picker = page.locator("#image_file");
  const form = page.locator("form").filter({ has: picker });
  const submit = form.getByRole("button", { name: "เพิ่มคำถาม", exact: true });
  const png = await sharp({ create: { width: 44, height: 34, channels: 4, background: "#790d1680" } }).png().toBuffer();
  await picker.setInputFiles({ name: "รูปโจทย์.png", mimeType: "image/png", buffer: png });
  await expect(form.getByRole("status")).toContainText(/รูปพร้อมส่ง.*PNG/);
  const prompt = "โจทย์ที่ส่งซ้ำหลังขาดการเชื่อมต่อ";
  await form.getByLabel("คำถาม", { exact: true }).fill(prompt);
  await form.getByLabel("คำตอบที่ถูก").fill("42");

  const detailUrl = page.url();
  await page.route(detailUrl, async route => {
    if (!route.request().headers()["next-action"]) return route.continue();
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    await route.abort("failed");
  }, { times: 1 });
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("ส่งคำถามไม่สำเร็จ");
  await expect(form.getByLabel("คำถาม", { exact: true })).toHaveValue(prompt);
  await expect(form.getByRole("img", { name: "ตัวอย่างรูปประกอบ" })).toBeVisible();
  await submit.click();
  await expect(form.getByText("เพิ่มคำถามแล้ว")).toBeVisible();
  await expect(page.getByText(prompt, { exact: true })).toHaveCount(1);

  const src = await page.getByRole("img", { name: "รูปประกอบคำถามข้อ 1", exact: true }).getAttribute("src");
  expect(src).toMatch(/^\/uploads\/question-images\/[^/]+\/[\da-f-]{36}\/[\da-f-]{36}\.png$/);
  const stored = await request.get(src!);
  expect(stored.ok()).toBe(true);
  expect(await stored.body()).toEqual(png);

  await page.goto("/teacher/rooms/new");
  await page.getByRole("button", { name: "สร้างห้องเกม", exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/rooms\/\d{4}\/dashboard$/);
  const room = page.url().match(/rooms\/(\d{4})/)![1];
  const pupil = await browser.newPage({ baseURL: "http://127.0.0.1:3100", viewport: { width: 390, height: 844 } });
  try {
    await pupil.goto("/login");
    await pupil.getByLabel("รหัสผู้ใช้").fill("02074");
    await pupil.getByLabel("รหัสผ่าน").fill("student-test-only");
    await pupil.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await expect(pupil).toHaveURL(/\/join$/);
    await pupil.goto("/join?room_code=" + room);
    await pupil.getByRole("button", { name: /กลุ่ม 1/ }).click();
    await pupil.getByRole("button", { name: /^ยืนยันเข้าทีม/ }).click();
    await page.getByRole("button", { name: "เริ่มเกม", exact: true }).click();
    const illustration = pupil.getByRole("img", { name: "รูปประกอบคำถามข้อ 1", exact: true });
    await expect(illustration).toBeVisible();
    await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(44);
    await pupil.getByRole("button", { name: "ขยายรูปคำถาม", exact: true }).click();
    await expect(pupil.getByRole("dialog", { name: "รูปคำถาม" })).toBeVisible();
  } finally {
    await pupil.close();
  }
});
