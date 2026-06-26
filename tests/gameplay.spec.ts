import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Browser, type Page, test } from "@playwright/test";

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

const students = [
  { id: "02074", password: "43524353" },
  { id: "02075", password: "384651" },
  { id: "02077", password: "064037" },
];

let originalQuestionBank = "[]\n";
let originalGameSessions = "[]\n";

async function loginTeacher(page: Page) {
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("รหัสผู้ใช้").fill("admin");
  await page.getByLabel("รหัสผ่าน").fill("021044");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets$/);
}

async function loginStudent(page: Page, student: (typeof students)[number]) {
  await page.goto("http://127.0.0.1:3000/login");
  await page.getByLabel("รหัสผู้ใช้").fill(student.id);
  await page.getByLabel("รหัสผ่าน").fill(student.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/join$/);
}

async function createGameRoom(page: Page) {
  const setTitle = `Gameplay test ${Date.now()}`;
  await page.getByLabel("ชื่อชุดคำถาม").fill(setTitle);
  await page.getByLabel("คำอธิบาย").fill("Question set for gameplay");
  await page.getByRole("button", { name: "สร้างชุดคำถาม" }).click();
  await expect(page).toHaveURL(/\/teacher\/question-sets\/[a-f0-9-]+$/);

  await page.getByLabel("คำถาม").fill("2 + 3 = ?");
  await page.getByLabel("คำตอบที่ถูก").fill("5");
  await page.getByLabel("คะแนน").fill("10");
  await page.getByLabel("เวลาตอบต่อข้อ").fill("30");
  await page.getByRole("button", { name: "เพิ่มคำถาม" }).click();
  await expect(page.getByText("เพิ่มคำถามแล้ว")).toBeVisible();

  await page.getByLabel("คำถาม").fill("10 - 4 = ?");
  await page.getByLabel("คำตอบที่ถูก").fill("6");
  await page.getByLabel("คะแนน").fill("10");
  await page.getByLabel("เวลาตอบต่อข้อ").fill("30");
  await page.getByRole("button", { name: "เพิ่มคำถาม" }).click();
  await expect(page.getByText("10 - 4 = ?")).toBeVisible();

  await page.goto("http://127.0.0.1:3000/teacher/rooms/new");
  await page.getByLabel("ชื่อกิจกรรม").fill("Gameplay flow");
  await page.getByLabel("จำนวนกลุ่ม").fill("2");
  await page.getByLabel("จำนวนคนต่อกลุ่ม").fill("3");
  await page.getByRole("button", { name: "สร้างห้องเกม" }).click();
  await expect(page).toHaveURL(/\/teacher\/rooms\/\d{4}\/dashboard$/);

  const roomCode = page.url().match(/\/teacher\/rooms\/(\d{4})\/dashboard$/)?.[1];
  expect(roomCode).toBeTruthy();
  return roomCode as string;
}

async function joinTeam({
  browser,
  roomCode,
  student,
  teamName,
}: {
  browser: Browser;
  roomCode: string;
  student: (typeof students)[number];
  teamName: RegExp;
}) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await loginStudent(page, student);
  await page.getByLabel("รหัสห้อง").fill(roomCode);
  await page.getByRole("button", { name: "ค้นหาห้อง" }).click();
  await expect(page.getByText("Gameplay flow")).toBeVisible();
  await expect(page.getByText("จำนวนทีม")).toBeVisible();
  await page.getByRole("button", { name: teamName }).click();
  await expect(page).toHaveURL(new RegExp(`/play/${roomCode}$`));

  return { context, page };
}

async function answerCurrentQuestion(page: Page, answer: string) {
  await page.getByPlaceholder("พิมพ์คำตอบ...").fill(answer);
  await page.getByRole("button", { name: "ส่งคำตอบ" }).click();
  await expect(page.getByText("ส่งคำตอบแล้ว").first()).toBeVisible();
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

test("teacher runs a full averaged-score game with ties, late join, and duplicate answer guard", async ({
  page: teacherPage,
  browser,
}) => {
  await loginTeacher(teacherPage);
  const roomCode = await createGameRoom(teacherPage);

  const studentOne = await joinTeam({
    browser,
    roomCode,
    student: students[0],
    teamName: /กลุ่ม 1/,
  });
  const studentTwo = await joinTeam({
    browser,
    roomCode,
    student: students[1],
    teamName: /กลุ่ม 2/,
  });

  await teacherPage.goto(
    `http://127.0.0.1:3000/teacher/rooms/${roomCode}/dashboard`,
  );
  await expect(teacherPage.getByText("1/3 คน").first()).toBeVisible();
  await expect(
    teacherPage.getByText("มีทีมที่ยังไม่ครบ 2 ทีม"),
  ).toBeVisible();
  await teacherPage.getByRole("button", { name: "เริ่มเกม" }).click();
  await expect(teacherPage.getByText("เปิดรับคำตอบ")).toBeVisible();
  await expect(teacherPage.getByText(/ข้อ 1\/2: 2 \+ 3 = \?/)).toBeVisible();

  await expect(studentOne.page.getByText("2 + 3 = ?")).toBeVisible();
  await expect(studentTwo.page.getByText("2 + 3 = ?")).toBeVisible();

  const lateStudent = await joinTeam({
    browser,
    roomCode,
    student: students[2],
    teamName: /กลุ่ม 1/,
  });
  await expect(
    lateStudent.page.getByText("ร่วมเล่น ไม่นับคะแนน"),
  ).toBeVisible();

  await answerCurrentQuestion(studentOne.page, "5");
  const duplicateStatus = await studentOne.page.evaluate(async (code) => {
    const response = await fetch(`/api/play/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerText: "5" }),
    });
    return response.status;
  }, roomCode);
  expect(duplicateStatus).toBe(400);

  await studentOne.page.reload();
  await expect(studentOne.page.getByText("ส่งคำตอบแล้ว").first()).toBeVisible();
  await answerCurrentQuestion(studentTwo.page, "5");
  await answerCurrentQuestion(lateStudent.page, "5");

  await teacherPage.getByRole("button", { name: "เฉลย" }).click();
  await expect(teacherPage.getByText("เฉลย: 5")).toBeVisible();
  await expect(teacherPage.getByText("อันดับร่วม 1").first()).toBeVisible();
  await expect(studentOne.page.getByText("เฉลย: 5")).toBeVisible();
  await expect(lateStudent.page.getByText("คะแนนที่ได้: 0")).toBeVisible();

  await teacherPage.getByRole("button", { name: "ข้อถัดไป" }).click();
  await expect(teacherPage.getByText(/ข้อ 2\/2: 10 - 4 = \?/)).toBeVisible();
  await expect(studentOne.page.getByText("10 - 4 = ?")).toBeVisible();
  await expect(studentTwo.page.getByText("10 - 4 = ?")).toBeVisible();

  await answerCurrentQuestion(studentOne.page, "6");
  await answerCurrentQuestion(studentTwo.page, "0");
  await teacherPage.getByRole("button", { name: "เฉลย" }).click();
  await expect(teacherPage.getByText("เฉลย: 6")).toBeVisible();
  await expect(teacherPage.getByText(/เฉลี่ย 20/).first()).toBeVisible();

  await teacherPage.getByRole("button", { name: /^จบเกม$/ }).click();
  await expect(teacherPage.getByText("จบเกม")).toBeVisible();
  await expect(studentOne.page.getByText("สรุปอันดับ")).toBeVisible();

  await teacherPage.goto(
    `http://127.0.0.1:3000/teacher/rooms/${roomCode}/results`,
  );
  await expect(
    teacherPage.getByRole("columnheader", { name: "คะแนนเฉลี่ย" }),
  ).toBeVisible();
  await expect(teacherPage.getByRole("cell", { name: "20" }).first()).toBeVisible();
  await expect(teacherPage.getByRole("cell", { name: "10" }).first()).toBeVisible();

  await studentOne.context.close();
  await studentTwo.context.close();
  await lateStudent.context.close();
});
