import { readFile } from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual, createHash } from "node:crypto";
import { isSupabaseDataBackend } from "@/lib/data/backend";
import { getDataDirectory } from "@/lib/data/paths";
import { findSupabaseAccountByCode } from "@/lib/auth/supabase-accounts";
import { normalizeUserCode, parseAccountRole, parseCsv } from "@/lib/auth/account-format";
import type { SheetAccount } from "@/types/auth";
import { getAuthMode } from "@/lib/auth/mode";

export async function getSheetAccounts(): Promise<SheetAccount[]> {
  const csv = await readFile(path.join(getDataDirectory(), "student.csv"), "utf8");
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new Error("ACCOUNT_CSV_EMPTY");
  const headers = header.map(value => value.trim().toLowerCase());
  const accounts = new Map<string, SheetAccount>();
  for (const row of rows) {
    const record = Object.fromEntries(headers.map((key, index) => [key, row[index] ?? ""]));
    const userCode = normalizeUserCode(record.id || record.user_code || "");
    const displayName = (record.name || record.display_name || "").trim();
    const grade = (record.grade || record.classroom || "").trim();
    if (!userCode || !displayName || !record.password) throw new Error("ACCOUNT_CSV_INCOMPLETE");
    if (accounts.has(userCode)) throw new Error("ACCOUNT_CODE_DUPLICATE");
    accounts.set(userCode, { userCode: (record.id || record.user_code).trim(), displayName, grade, password: record.password, role: parseAccountRole(record.role || "", grade) });
  }
  return [...accounts.values()];
}
export async function findAccountByCode(userCode: string) {
  const normalized = normalizeUserCode(userCode);
  if (isSupabaseDataBackend()) return findSupabaseAccountByCode(normalized);
  return (await getSheetAccounts()).find(account => normalizeUserCode(account.userCode) === normalized) ?? null;
}
export async function findAccountByCredentials(userCode: string, password: string) {
  if (getAuthMode() !== "legacy") return null;
  const account = await findAccountByCode(userCode);
  if (!account?.password) return null;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(account.password), digest(password)) ? account : null;
}
