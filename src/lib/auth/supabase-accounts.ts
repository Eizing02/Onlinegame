import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SheetAccount } from "@/types/auth";

type AccountRow = {
  user_code: string;
  display_name: string;
  password: string;
  grade: string | null;
  role: "teacher" | "student";
};

function toSheetAccount(row: AccountRow): SheetAccount {
  return {
    userCode: row.user_code,
    password: row.password,
    role: row.role,
    displayName: row.display_name,
    grade: row.grade ?? "",
  };
}

export async function findSupabaseAccountByCredentials(
  userCode: string,
  password: string,
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("user_code, display_name, password, grade, role")
    .eq("user_code", userCode.trim().toUpperCase())
    .eq("password", password)
    .maybeSingle<AccountRow>();

  if (error) {
    throw error;
  }

  return data ? toSheetAccount(data) : null;
}
