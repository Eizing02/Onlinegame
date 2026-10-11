import type { User } from "@supabase/supabase-js";

export type GoogleIdentity = { authUserId: string; email: string; authSessionId: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Inputs must come from auth.getUser() and auth.getClaims(), never a request body.
export function verifiedGoogleIdentity(user: User, claims: Record<string, unknown>): GoogleIdentity | null {
  const email = user.email?.trim().toLowerCase();
  const amr = claims.amr;
  const appMetadata = claims.app_metadata as Record<string, unknown> | undefined;
  if (!email || !user.email_confirmed_at || claims.sub !== user.id || !uuid.test(user.id) ||
    typeof claims.session_id !== "string" || !uuid.test(claims.session_id) ||
    user.app_metadata.provider !== "google" || appMetadata?.provider !== "google" ||
    !Array.isArray(amr) || !amr.some(value => value?.method === "oauth")) return null;
  const google = user.identities?.find(identity => identity.provider === "google" &&
    identity.identity_data?.email_verified === true &&
    String(identity.identity_data?.email || "").trim().toLowerCase() === email);
  return google ? { authUserId: user.id, email, authSessionId: claims.session_id } : null;
}

export function normalizeStudentCode(value: string) {
  return value.trim().normalize("NFKC").replace(/[๐-๙]/g, digit => String(digit.charCodeAt(0) - 3664));
}
export function isStudentCode(value: string) { return /^[0-9]{5}$/.test(value); }
