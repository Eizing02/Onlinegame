import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const questionBankPath = path.join(
  process.cwd(),
  "tmp", "e2e-data",
  "question-sets.json",
);
const gameSessionsPath = path.join(
  process.cwd(),
  "tmp", "e2e-data",
  "game-sessions.json",
);
const studentCsvPath = path.join(process.cwd(), "tmp", "e2e-data", "student.csv");
const studentId = "02074";
const studentPassword = "student-test-only";

let originalQuestionBank = "[]\n";
let originalGameSessions = "[]\n";

async function getStudentName() {
  const csv = await readFile(studentCsvPath, "utf8");
  const row = csv
    .split(/\r?\n/)
    .find((line) => line.startsWith(`${studentId},`));

  return row?.split(",")[1] ?? studentId;
}

async function loginTeacher(page: Page) {
  await page.goto("http://127.0.0.1:3100/login");
  await page.getByLabel("รหัสผู้ใช้").fill("admin");
  await page.getByLabel("รหัสผ่าน").fill("teacher-test-only");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/teacher\/(question-sets|rooms\/\d{4}\/dashboard)$/);
}

async function createRoom(page: Page) {
  const setTitle = `Join test ${Date.now()}`;
  await page.getByLabel("ชื่อชุดคำถาม").fill(setTitle);
  await page.getByLabel("คำอธิบาย").fill("Question set for student join");
  await page.getByRole("button", { name: "สร้างชุดคำถาม" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets\/[a-f0-9-]+$/);

  await page.getByLabel("คำถาม").fill("1 + 1 = ?");
  await page.getByLabel("คำตอบที่ถูก").fill("2");
  await page.getByLabel("คะแนน").fill("10");
  await page.getByLabel("เวลาตอบต่อข้อ").fill("30");
  await page.getByRole("button", { name: "เพิ่มคำถาม" }).click();
  await expect(page.getByText("เพิ่มคำถามแล้ว")).toBeVisible();

  await page.goto("http://127.0.0.1:3100/teacher/rooms/new");
  await page.getByLabel("ชื่อกิจกรรม").fill("Join flow");
  await page.getByLabel("จำนวนทีม").fill("2");
  await page.getByLabel("จำนวนคนต่อทีม").fill("2");
  await page.getByRole("button", { name: "สร้างห้องเกม" }).click();
  await expect(page).toHaveURL(/\/teacher\/rooms\/\d{4}\/dashboard$/);

  const roomCode = page.url().match(/\/teacher\/rooms\/(\d{4})\/dashboard$/)?.[1];
  expect(roomCode).toBeTruthy();
  return roomCode as string;
}

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

test("student selects a team and appears on teacher dashboard", async ({
  page,
  context,
}) => {
  const studentName = await getStudentName();

  await loginTeacher(page);
  const roomCode = await createRoom(page);

  await context.clearCookies();
  await page.goto("http://127.0.0.1:3100/login");
  await page.getByLabel("รหัสผู้ใช้").fill(studentId);
  await page.getByLabel("รหัสผ่าน").fill(studentPassword);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/join$/);

  // Invalid PIN triggers red shake & alert without leaving /join
  await page.getByLabel("รหัสห้อง").fill("0000");
  await expect(page.locator(".join-message[role=alert]")).toContainText("ไม่พบห้อง");
  await expect(page.locator('.join-pin-slot[data-state="invalid"]')).toHaveCount(4);

  // Valid PIN auto-verifies, triggers green wave, and opens team selection
  await page.getByLabel("รหัสห้อง").fill(roomCode);
  await expect(page).toHaveURL(new RegExp(`/join\\?room_code=${roomCode}$`));
  await page.getByRole("button", { name: /กลุ่ม 1/ }).click();await page.getByRole('button',{name:/^ยืนยันเข้าทีม/}).click();
  await expect(page).toHaveURL(new RegExp(`/play/${roomCode}$`));
  await expect(page.getByRole("heading", {name:"กลุ่ม 1",exact:true})).toBeVisible();
  await expect(page.getByText("รอครูเริ่มเกม", { exact: true })).toBeVisible();
  // First member in the team receives the captain modal with rename instructions
  const captainDialog = page.locator(".captain-notice-dialog");
  await expect(captainDialog).toBeVisible();
  await expect(captainDialog).toContainText("คุณคือหัวหน้าทีม");
  await expect(captainDialog).toContainText("วิธีเปลี่ยนชื่อทีม");
  await captainDialog.getByRole("button", { name: "ไปเปลี่ยนชื่อทีมเลย" }).click();
  await expect(captainDialog).toHaveCount(0);
  await expect(page.getByText("ร่วมคะแนน", { exact: true }).first()).toBeVisible();

  await context.clearCookies();
  await loginTeacher(page);
  await page.goto(`http://127.0.0.1:3100/teacher/rooms/${roomCode}/dashboard`);
  await page.getByRole("tab",{name:"ผู้เล่น",exact:true}).click();
  await expect(page.getByText(studentName).first()).toBeVisible();
  await expect(page.getByText("1/2 คน").first()).toBeVisible();
  await expect(page.getByText(/อัปเดตล่าสุด/)).toBeVisible();
});
