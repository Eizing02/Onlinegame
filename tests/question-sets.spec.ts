import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const questionBankPath = path.join(
  process.cwd(),
  "data",
  "question-sets.json",
);

let originalQuestionBank = "[]\n";

test.beforeEach(async () => {
  originalQuestionBank = await readFile(questionBankPath, "utf8");
  await writeFile(questionBankPath, "[]\n", "utf8");
});

test.afterEach(async () => {
  await writeFile(questionBankPath, originalQuestionBank, "utf8");
});

test("teacher creates a question set and adds a question", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("รหัสผู้ใช้").fill("admin");
  await page.getByLabel("รหัสผ่าน").fill("021044");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets$/);

  const setTitle = `ชุดทดสอบ ${Date.now()}`;
  await page.getByLabel("ชื่อชุดคำถาม").fill(setTitle);
  await page.getByLabel("คำอธิบาย").fill("สร้างจาก automated smoke test");
  await page.getByRole("button", { name: "สร้างชุดคำถาม" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets\/[a-f0-9-]+$/);
  await expect(page.getByRole("heading", { name: setTitle })).toBeVisible();

  await page.getByLabel("คำถาม").fill("2 + 2 เท่ากับเท่าไร");
  await page.getByLabel("คำตอบที่ถูก").fill("4");
  await page.getByLabel("คะแนน").fill("10");
  await page.getByLabel("เวลาตอบต่อข้อ").fill("30");
  await page.getByRole("button", { name: "เพิ่มคำถาม" }).click();

  await expect(page.getByText("เพิ่มคำถามแล้ว")).toBeVisible();
  await expect(page.getByRole("heading", { name: "2 + 2 เท่ากับเท่าไร" })).toBeVisible();
  await expect(page.getByText("4", { exact: true })).toBeVisible();
  await expect(page.getByText("30 วินาที")).toBeVisible();
});
