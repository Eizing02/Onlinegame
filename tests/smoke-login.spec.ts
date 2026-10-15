import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

test.beforeEach(async () => {
  await writeFile(path.resolve("tmp/e2e-data/game-sessions.json"), "[]");
});

test("sheet login routes teachers and students by role", async ({ page }) => {
  await page.goto("http://127.0.0.1:3100/login");
  await page.getByLabel("รหัสผู้ใช้").fill("admin");
  await page.getByLabel("รหัสผ่าน").fill("teacher-test-only");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets$/);

  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await page.getByLabel("รหัสผู้ใช้").fill("02074");
  await page.getByLabel("รหัสผ่าน").fill("student-test-only");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole("heading", { name: "เข้าร่วมเกม", exact: true })).toBeVisible();
});
