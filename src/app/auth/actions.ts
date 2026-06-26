"use server";

import { redirect } from "next/navigation";

import { findAccountByCredentials } from "@/lib/auth/accounts";
import { clearSession, createSession } from "@/lib/auth/session";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function encodedRedirect(
  path: string,
  key: "error" | "notice",
  message: string,
): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

export async function signInWithSheetAction(formData: FormData) {
  const userCode = getFormString(formData, "user_code");
  const password = getFormString(formData, "password");

  if (!userCode || !password) {
    encodedRedirect("/login", "error", "กรุณากรอกรหัสผู้ใช้และรหัสผ่าน");
  }

  let account: Awaited<ReturnType<typeof findAccountByCredentials>>;

  try {
    account = await findAccountByCredentials(userCode, password);
  } catch (error) {
    console.error("Login backend error", error);
    encodedRedirect(
      "/login",
      "error",
      "ระบบเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจค่า Environment Variables บน Vercel",
    );
  }

  if (!account) {
    encodedRedirect("/login", "error", "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }

  await createSession(account);

  if (account.role === "teacher") {
    redirect("/teacher/question-sets");
  }

  redirect("/join");
}

export async function signOutAction() {
  await clearSession();
  redirect("/");
}
