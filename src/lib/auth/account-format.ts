import type { AppRole } from "@/types/auth";
export function normalizeUserCode(value: string) {
  return value.trim().normalize("NFKC").replace(/[๐-๙]/g, (digit) => String(digit.charCodeAt(0) - 3664)).toUpperCase();
}
export function parseAccountRole(role: string, grade = ""): AppRole {
  const normalized = role.trim().toLowerCase();
  if (["teacher", "ครู"].includes(normalized)) return "teacher";
  if (["student", "นักเรียน"].includes(normalized)) return "student";
  if (!normalized && ["teacher", "ครู"].includes(grade.trim().toLowerCase())) return "teacher";
  throw new Error("ACCOUNT_ROLE_INVALID");
}
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const input = csv.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (!quoted && char === ",") { row.push(field); field = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && input[index + 1] === "\n") index++;
      row.push(field); if (row.some(value => value.trim())) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("ACCOUNT_CSV_INVALID");
  row.push(field); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}
