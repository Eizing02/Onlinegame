import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthMode } from "@/lib/auth/mode";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (getAuthMode() !== "google") return response;
  response.headers.set("Cache-Control", "private, no-store");
  const url = getSupabaseUrl(), key = getSupabaseAnonKey();
  if (!url || !key) return response;
  const client = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  try { await client.auth.getClaims(); } catch { /* The authoritative guards fail closed; login remains reachable during an outage. */ }
  // This refresh is not a permission check. Pages/actions/APIs verify the user
  // and current database access independently on every request.
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|assets/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav)$).*)"] };
