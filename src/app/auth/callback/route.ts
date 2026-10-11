import { NextResponse } from "next/server";
import { getAuthMode, getTrustedAppUrl } from "@/lib/auth/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGoogleAccountState, googleStatePath } from "@/lib/auth/google-session";
import { getSessionLanding } from "@/lib/auth/landing";
import { clearSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const origin = getTrustedAppUrl();
  const go = (path: string) => NextResponse.redirect(new URL(path, origin), { headers: { "Cache-Control": "private, no-store" } });
  if (getAuthMode() !== "google") return go("/login");
  const params = new URL(request.url).searchParams;
  // Deliberately ignore next/host/forwarded-host: landing comes from permissions.
  if (params.has("error") || !params.get("code")) return go("/login?error=oauth_cancelled");
  try {
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.exchangeCodeForSession(params.get("code")!);
    if (error) return go("/login?error=oauth_failed");
    await clearSession();
    const state = await getGoogleAccountState(true);
    return go(state.kind === "linked" ? await getSessionLanding(state.session) : googleStatePath(state));
  } catch {
    return go("/login?error=oauth_failed");
  }
}
