import { expect, test } from "@playwright/test";

test("sheet login routes teachers and students by role", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("รหัสผู้ใช้").fill("admin");
  await page.getByLabel("รหัสผ่าน").fill("021044");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets$/);

  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("รหัสผู้ใช้").fill("02074");
  await page.getByLabel("รหัสผ่าน").fill("43524353");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByText("ผู้เล่น")).toBeVisible();
});
