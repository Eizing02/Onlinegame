import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseAccountRole } from "@/lib/auth/account-format";
import type { SheetAccount } from "@/types/auth";
export async function findSupabaseAccountByCode(userCode: string): Promise<SheetAccount | null> {
  const { data, error } = await createSupabaseAdminClient().from("accounts")
    .select("user_code, display_name, password, grade, role").ilike("user_code", userCode.replace(/[\\%_]/g, "\\$&")).maybeSingle();
  if (error) throw error;
  return data ? { userCode: data.user_code, displayName: data.display_name, password: data.password,
    grade: data.grade ?? "", role: parseAccountRole(data.role, data.grade ?? "") } : null;
}
