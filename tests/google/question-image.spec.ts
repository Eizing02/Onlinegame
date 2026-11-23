import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

const storage = "http://127.0.0.1:3111/__test/question-images";
const picker = (page: Page) => page.locator("#image_file");

async function openQuestionSet(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google", exact: true }).click();
  await page.getByRole("link", { name: "piyawatpiwsiri@gmail.com", exact: true }).click();
  await page.getByLabel("ชื่อชุดคำถาม").fill("ทดสอบรูปประกอบโจทย์");
  await page.getByRole("button", { name: "สร้างชุดคำถาม" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets\/[\da-f-]+$/);
}

test("prepares a large image, retains the draft through storage and database failures, and retries", async ({ page, request }, testInfo) => {
  test.setTimeout(150_000);
  await request.post("http://127.0.0.1:3111/__test/reset");
  await page.setViewportSize({ width: 390, height: 844 });
  await openQuestionSet(page);
  const form = page.locator("form").filter({ has: picker(page) });
  const submit = form.getByRole("button", { name: "เพิ่มคำถาม", exact: true });
  const prompt = "โจทย์จากรูปประกอบ ทดสอบการบันทึก";
  await form.getByLabel("คำถาม", { exact: true }).fill(prompt);
  await form.getByRole("button", { name: "ปรนัย 4 ตัวเลือก" }).click();
  for (const [index, letter] of ["A", "B", "C", "D"].entries()) {
    await form.getByPlaceholder("ตัวเลือก " + letter, { exact: true }).fill(String(index + 1));
  }
  await form.getByLabel("เฉลย B").check();
  await picker(page).setInputFiles({ name: "รูปเสีย.png", mimeType: "image/png", buffer: Buffer.from("invalid") });
  await expect(form.getByRole("alert")).toContainText("ไฟล์นี้ไม่ใช่รูป");
  await expect(submit).toBeDisabled();
  await form.getByRole("button", { name: "ลบรูป", exact: true }).click();
  await expect(submit).toBeEnabled();
  await expect(picker(page)).toBeFocused();

  const width = 2100, height = 1000;
  const original = await sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } }).png().toBuffer();
  expect(original.length).toBeGreaterThan(5 * 1024 ** 2);
  await picker(page).setInputFiles({ name: "ภาพโจทย์ที่ครูจัดเตรียม.png", mimeType: "image/png", buffer: original });
  await expect(form.getByRole("status")).toContainText(/รูปพร้อมส่ง.*→.*WebP/);
  await expect(form.getByRole("img", { name: "ตัวอย่างรูปประกอบ" })).toBeVisible();
  const imageControls = form.getByRole("group", { name: "รูปประกอบ" });
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await imageControls.evaluate(element => element.scrollIntoView({ block: "center" }));
    await imageControls.screenshot({ path: testInfo.outputPath(`image-ready-${width}.png`) });
  }
  const audit = await new AxeBuilder({ page }).include("fieldset").analyze();
  expect(audit.violations.filter(issue => issue.impact === "serious" || issue.impact === "critical")).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });

  await request.post(storage + "?fault=upload");
  await submit.click();
  await expect(form.getByRole("alert")).toContainText(/อัปโหลดรูปไม่สำเร็จ.*อ้างอิง/);
  await expect(form.getByRole("alert")).toBeFocused();
  await expect(form.getByLabel("คำถาม", { exact: true })).toHaveValue(prompt);
  await expect(form.getByLabel("เฉลย B")).toBeChecked();
  await expect(form.getByPlaceholder("ตัวเลือก B", { exact: true })).toHaveValue("2");
  await expect(form.getByRole("img", { name: "ตัวอย่างรูปประกอบ" })).toBeVisible();

  await request.post(storage + "?fault=options");
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("บันทึกคำถามไม่สำเร็จ");
  expect(await (await request.get(storage)).json()).toEqual({ paths: [] });
  await expect(form.getByLabel("คำถาม", { exact: true })).toHaveValue(prompt);
  await expect(form.getByRole("img", { name: "ตัวอย่างรูปประกอบ" })).toBeVisible();

  await request.post(storage + "?fault=no-bucket");
  await submit.click();
  await expect(form.getByText("เพิ่มคำถามแล้ว")).toBeVisible();
  await expect(form.getByLabel("คำถาม", { exact: true })).toHaveValue("");
  await expect(page.getByText(prompt, { exact: true })).toHaveCount(1);
  const { paths } = await (await request.get(storage)).json() as { paths: string[] };
  expect(paths).toHaveLength(1);
  expect(paths[0]).toMatch(/\/[\da-f-]+-[\da-f]{16}\.webp$/);
  const uploaded = await request.get("http://127.0.0.1:3111/storage/v1/object/public/question-images/" + paths[0]);
  expect(uploaded.ok()).toBe(true);
  const buffer = await uploaded.body();
  expect(buffer.length).toBeLessThanOrEqual(2.5 * 1024 ** 2);
  const metadata = await sharp(buffer).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.width).toBeLessThanOrEqual(1920);
});

test("converts SVG and HEIC, preserves animated GIF, and explains when GIF needs a still frame", async ({ page, request }) => {
  test.setTimeout(120_000);
  await request.post("http://127.0.0.1:3111/__test/reset");
  await openQuestionSet(page);
  const form = page.locator("form").filter({ has: picker(page) });
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="70"><rect x="4" y="4" width="64" height="54" fill="#790d16"/></svg>');
  await picker(page).setInputFiles({ name: "สูตร.svg", mimeType: "image/svg+xml", buffer: svg });
  await expect(form.getByRole("status")).toContainText(/รูปพร้อมส่ง.*WebP/);
  await form.getByLabel("คำถาม", { exact: true }).fill("ภาพโปร่งใส");
  await form.getByLabel("คำตอบที่ถูก").fill("1");
  await form.getByRole("button", { name: "เพิ่มคำถาม", exact: true }).click();
  await expect(form.getByText("เพิ่มคำถามแล้ว")).toBeVisible();
  let { paths } = await (await request.get(storage)).json() as { paths: string[] };
  const webp = await request.get("http://127.0.0.1:3111/storage/v1/object/public/question-images/" + paths[0]);
  expect((await sharp(await webp.body()).metadata()).hasAlpha).toBe(true);

  const bmp = Buffer.alloc(70);
  bmp.write("BM");
  bmp.writeUInt32LE(bmp.length, 2);
  bmp.writeUInt32LE(54, 10);
  bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(2, 18);
  bmp.writeInt32LE(2, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(24, 28);
  bmp.writeUInt32LE(16, 34);
  bmp.fill(190, 54);
  const tile = sharp({ create: { width: 24, height: 24, channels: 4, background: "#790d1680" } });
  const iconPng = await tile.clone().png().toBuffer();
  const iconHeader = Buffer.alloc(22);
  iconHeader.writeUInt16LE(1, 2);
  iconHeader.writeUInt16LE(1, 4);
  iconHeader.writeUInt8(24, 6);
  iconHeader.writeUInt8(24, 7);
  iconHeader.writeUInt16LE(1, 10);
  iconHeader.writeUInt16LE(32, 12);
  iconHeader.writeUInt32LE(iconPng.length, 14);
  iconHeader.writeUInt32LE(iconHeader.length, 18);
  for (const file of [
    { name: "รูป.bmp", mimeType: "image/bmp", buffer: bmp },
    { name: "รูป.ico", mimeType: "image/x-icon", buffer: Buffer.concat([iconHeader, iconPng]) },
    { name: "รูป.avif", mimeType: "image/avif", buffer: await tile.avif().toBuffer() },
  ]) {
    await picker(page).setInputFiles(file);
    await expect(form.getByRole("status")).toContainText(/รูปพร้อมส่ง.*WebP/);
  }
  await form.getByRole("button", { name: "ลบรูป", exact: true }).click();

  if (process.env.QUESTION_IMAGE_HEIC_FIXTURE) {
    await picker(page).setInputFiles(process.env.QUESTION_IMAGE_HEIC_FIXTURE);
    await expect(form.getByRole("status")).toContainText(/รูปพร้อมส่ง.*WebP/, { timeout: 45_000 });
    await expect(form.getByRole("img", { name: "ตัวอย่างรูปประกอบ" })).toBeVisible();
    await form.getByRole("button", { name: "ลบรูป", exact: true }).click();
  }

  const gif = await sharp(Buffer.from([255, 0, 0, 255, 0, 0, 255, 255]), {
    raw: { width: 1, height: 2, pageHeight: 1, channels: 4 },
  }).gif({ delay: [100, 100] }).toBuffer();
  expect((await sharp(gif, { animated: true }).metadata()).pages).toBe(2);
  await picker(page).setInputFiles({ name: "ภาพเคลื่อนไหว.gif", mimeType: "image/gif", buffer: gif });
  await expect(form.getByRole("status")).toContainText(/รูปพร้อมส่ง.*GIF/);
  await form.getByLabel("คำถาม", { exact: true }).fill("ภาพเคลื่อนไหว");
  await form.getByLabel("คำตอบที่ถูก").fill("2");
  await form.getByRole("button", { name: "เพิ่มคำถาม", exact: true }).click();
  await expect(form.getByText("เพิ่มคำถามแล้ว")).toBeVisible();
  ({ paths } = await (await request.get(storage)).json() as { paths: string[] });
  const gifPath = paths.find(path => path.endsWith(".gif"));
  const uploaded = await request.get("http://127.0.0.1:3111/storage/v1/object/public/question-images/" + gifPath);
  expect(await uploaded.body()).toEqual(gif);

  const oversizedGif = await sharp({ create: { width: 2000, height: 3, channels: 4, background: "#790d16" } }).gif().toBuffer();
  await picker(page).setInputFiles({ name: "ภาพขนาดเกิน.gif", mimeType: "image/gif", buffer: oversizedGif });
  await expect(form.getByRole("status")).toContainText("คุณสามารถใช้ภาพนิ่ง");
  await expect(form.getByRole("button", { name: "เพิ่มคำถาม", exact: true })).toBeDisabled();
  await form.getByRole("button", { name: "ใช้ภาพนิ่ง", exact: true }).click();
  await expect(form.getByRole("status")).toContainText(/รูปพร้อมส่ง.*WebP/);
});
