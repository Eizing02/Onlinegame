import { readFile } from "node:fs/promises";
import path from "node:path";

import { isSupabaseDataBackend } from "@/lib/data/backend";
import { findSupabaseAccountByCredentials } from "@/lib/auth/supabase-accounts";
import type { SheetAccount } from "@/types/auth";

const ACCOUNT_FILE = path.join(process.cwd(), "data", "student.csv");

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function pick(record: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key.toLowerCase()];

    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeRole(role: string, grade: string) {
  const normalizedRole = role.trim().toUpperCase();
  const normalizedGrade = grade.trim().toUpperCase();

  if (normalizedRole === "TEACHER" || normalizedGrade === "TEACHER") {
    return "teacher";
  }

  return "student";
}

async function readAccountsFromFile(filePath: string): Promise<SheetAccount[]> {
  const csv = await readFile(filePath, "utf8");
  const [headerLine, ...rows] = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headers = parseCsvLine(headerLine).map((header) =>
    header.trim().toLowerCase(),
  );

  return rows.map((row) => {
    const values = parseCsvLine(row);
    const record = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
    const userCode = pick(record, "id", "user_code").toUpperCase();
    const displayName = pick(record, "name", "display_name");
    const grade = pick(record, "grade", "classroom");
    const role = normalizeRole(pick(record, "role"), grade);

    return {
      userCode,
      password: pick(record, "password"),
      role,
      displayName,
      grade,
    };
  });
}

export async function getSheetAccounts(): Promise<SheetAccount[]> {
  const accounts = await readAccountsFromFile(ACCOUNT_FILE);
  const accountsByCode = new Map<string, SheetAccount>();

  for (const account of accounts) {
    if (!account.userCode || !account.password || !account.displayName) {
      continue;
    }

    accountsByCode.set(account.userCode, account);
  }

  return Array.from(accountsByCode.values());
}

export async function findAccountByCredentials(
  userCode: string,
  password: string,
) {
  if (isSupabaseDataBackend()) {
    return findSupabaseAccountByCredentials(userCode, password);
  }

  const accounts = await getSheetAccounts();
  const normalizedCode = userCode.trim().toUpperCase();

  return (
    accounts.find(
      (account) =>
        account.userCode === normalizedCode && account.password === password,
    ) ?? null
  );
}

