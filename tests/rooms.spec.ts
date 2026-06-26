import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const questionBankPath = path.join(
  process.cwd(),
  "data",
  "question-sets.json",
);
const gameSessionsPath = path.join(
  process.cwd(),
  "data",
  "game-sessions.json",
);

let originalQuestionBank = "[]\n";
let originalGameSessions = "[]\n";

test.beforeEach(async () => {
  originalQuestionBank = await readFile(questionBankPath, "utf8");
  originalGameSessions = await readFile(gameSessionsPath, "utf8");
  await writeFile(questionBankPath, "[]\n", "utf8");
  await writeFile(gameSessionsPath, "[]\n", "utf8");
});

test.afterEach(async () => {
  await writeFile(questionBankPath, originalQuestionBank, "utf8");
  await writeFile(gameSessionsPath, originalGameSessions, "utf8");
});

test("teacher creates a room with a 4 digit code", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("รหัสผู้ใช้").fill("admin");
  await page.getByLabel("รหัสผ่าน").fill("021044");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets$/);

  const setTitle = `Room test ${Date.now()}`;
  await page.getByLabel("ชื่อชุดคำถาม").fill(setTitle);
  await page.getByLabel("คำอธิบาย").fill("Question set for room creation");
  await page.getByRole("button", { name: "สร้างชุดคำถาม" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets\/[a-f0-9-]+$/);

  await page.getByLabel("คำถาม").fill("5 + 5 = ?");
  await page.getByLabel("คำตอบที่ถูก").fill("10");
  await page.getByLabel("คะแนน").fill("10");
  await page.getByLabel("เวลาตอบต่อข้อ").fill("30");
  await page.getByRole("button", { name: "เพิ่มคำถาม" }).click();
  await expect(page.getByText("เพิ่มคำถามแล้ว")).toBeVisible();

  await page.goto("http://127.0.0.1:3000/teacher/rooms/new");
  await page.getByLabel("ชื่อกิจกรรม").fill("กิจกรรมท้ายคาบ");
  await page.getByLabel("จำนวนกลุ่ม").fill("3");
  await page.getByLabel("จำนวนคนต่อกลุ่ม").fill("6");
  await page.getByRole("button", { name: "สร้างห้องเกม" }).click();
  await expect(page).toHaveURL(/\/teacher\/rooms\/\d{4}\/dashboard$/);

  const roomCode = page.url().match(/\/teacher\/rooms\/(\d{4})\/dashboard$/)?.[1];
  expect(roomCode).toBeTruthy();
  await expect(page.getByText(roomCode as string, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: setTitle })).toBeVisible();
  await expect(page.getByText("กลุ่ม 3").first()).toBeVisible();
  await expect(page.getByText("ให้นักเรียนกรอกเลข 4 หลักนี้")).toBeVisible();

  await page.goto("http://127.0.0.1:3000/teacher/rooms/new");
  await expect(page.getByText(`มีห้อง ${roomCode} ที่ยังไม่จบอยู่`)).toBeVisible();
  await expect(page.getByRole("link", { name: "กลับไปห้องเดิม" })).toBeVisible();
  await expect(page.getByRole("button", { name: "สร้างห้องเกม" })).toBeDisabled();
});
