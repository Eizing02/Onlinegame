import { cache } from "react";
import { createHash } from "node:crypto";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { verifiedGoogleIdentity, type GoogleIdentity } from "./google-identity";
import type { AppSession } from "@/types/auth";

export type GoogleAccountState =
  | { kind: "signed_out" }
  | { kind: "denied"; code: string; identity?: GoogleIdentity }
  | { kind: "unlinked"; identity: GoogleIdentity }
  | { kind: "linked"; identity: GoogleIdentity; session: AppSession };

export function googleAppSessionId(identity: GoogleIdentity, userCode: string) {
  return createHash("sha256").update(JSON.stringify([identity.authUserId, identity.authSessionId, userCode])).digest("hex");
}

export const getGoogleAccountState = cache(async (touch = false): Promise<GoogleAccountState> => {
  try {
    const client = await createSupabaseServerClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return { kind: "signed_out" };
    const { data: claimData, error: claimError } = await client.auth.getClaims();
    if (claimError || !claimData?.claims) return { kind: "signed_out" };
    const identity = verifiedGoogleIdentity(userData.user, claimData.claims);
    if (!identity) return { kind: "denied", code: "GOOGLE_IDENTITY_REQUIRED" };
    const { data, error } = await createSupabaseAdminClient().rpc("resolve_google_account", {
      p_auth_user_id: identity.authUserId,
      p_bootstrap_email: process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || "piyawatpiwsiri@gmail.com",
      p_touch: touch,
    });
    if (error || !data) return { kind: "denied", code: "AUTH_CONFIGURATION", identity };
    if (data.state === "unlinked") return { kind: "unlinked", identity };
    if (data.state !== "linked" || !['student', 'teacher'].includes(data.role) || typeof data.userCode !== "string") {
      return { kind: "denied", code: data.code || "ACCESS_DENIED", identity };
    }
    return { kind: "linked", identity, session: {
      userCode: data.userCode, displayName: data.displayName, grade: data.grade, role: data.role,
      sessionId: googleAppSessionId(identity, data.userCode), authUserId: identity.authUserId,
      email: identity.email, authMode: "google", accessLevel: data.accessLevel || undefined,
    } };
  } catch {
    // No tokens, emails, credentials, or underlying SQL errors enter logs/UI.
    return { kind: "denied", code: "AUTH_CONFIGURATION" };
  }
});

export function googleStatePath(state: GoogleAccountState) {
  return state.kind === "unlinked" ? "/verify-student" : state.kind === "denied" ? "/access-denied" : "/login";
}
