import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

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
const studentCsvPath = path.join(process.cwd(), "data", "student.csv");
const studentId = "02074";
const studentPassword = "43524353";

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
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("รหัสผู้ใช้").fill("admin");
  await page.getByLabel("รหัสผ่าน").fill("021044");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets$/);
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

  await page.goto("http://127.0.0.1:3000/teacher/rooms/new");
  await page.getByLabel("ชื่อกิจกรรม").fill("Join flow");
  await page.getByLabel("จำนวนกลุ่ม").fill("2");
  await page.getByLabel("จำนวนคนต่อกลุ่ม").fill("2");
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
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("รหัสผู้ใช้").fill(studentId);
  await page.getByLabel("รหัสผ่าน").fill(studentPassword);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/join$/);

  await page.getByLabel("รหัสห้อง").fill(roomCode);
  await page.getByRole("button", { name: "ค้นหาห้อง" }).click();
  await expect(page).toHaveURL(new RegExp(`/join\\?room_code=${roomCode}$`));
  await page.getByRole("button", { name: /กลุ่ม 1/ }).click();
  await expect(page).toHaveURL(new RegExp(`/play/${roomCode}$`));
  await expect(page.getByText("กลุ่ม 1")).toBeVisible();
  await expect(page.getByText("รอครูเริ่มเกม", { exact: true })).toBeVisible();
  await expect(page.getByText("ร่วมคะแนน", { exact: true })).toBeVisible();

  await context.clearCookies();
  await loginTeacher(page);
  await page.goto(`http://127.0.0.1:3000/teacher/rooms/${roomCode}/dashboard`);
  await expect(page.getByText(studentName).first()).toBeVisible();
  await expect(page.getByText("1/2 คน").first()).toBeVisible();
  await expect(page.getByText(/อัปเดตล่าสุด/)).toBeVisible();
});
