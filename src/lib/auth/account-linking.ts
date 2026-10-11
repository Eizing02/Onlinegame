import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { normalizeStudentCode, type GoogleIdentity } from "./google-identity";

export type StudentPreview = { userCode: string; displayName: string; grade: string };
export type LinkResult = { ok: true; student?: StudentPreview } | { ok: false; code: string };
export async function studentAccountOperation(identity: GoogleIdentity, action: "lookup" | "claim" | "switch", code: string): Promise<LinkResult> {
  const network = (await headers()).get("x-forwarded-for")?.split(",")[0].trim();
  const salt = getSupabaseServiceRoleKey();
  const clientKey = network && salt ? createHmac("sha256", salt).update(network).digest("hex") : null;
  const { data, error } = await createSupabaseAdminClient().rpc("student_account_operation", {
    p_auth_user_id: identity.authUserId, p_action: action,
    p_student_code: normalizeStudentCode(code), p_client_key: clientKey,
  });
  return error || !data ? { ok: false, code: "AUTH_CONFIGURATION" } : data as LinkResult;
}

export { authMessage } from "./auth-messages";
