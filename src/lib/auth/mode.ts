import { getDataBackend } from "@/lib/data/backend";

export function getAuthMode(): "legacy" | "google" {
  const mode = process.env.AUTH_MODE?.trim().toLowerCase() || "legacy";
  if (mode !== "legacy" && mode !== "google") throw new Error("AUTH_MODE_INVALID");
  if (mode === "google" && getDataBackend() !== "supabase") throw new Error("AUTH_BACKEND_MISMATCH");
  return mode;
}

export function getTrustedAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("AUTH_APP_URL_MISSING");
  const url = new URL(configured || "http://localhost:3000");
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
    url.pathname !== "/" || (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !loopback)) {
    throw new Error("AUTH_APP_URL_INVALID");
  }
  return url;
}

export function isTrustedMutation(request: Request) {
  return request.headers.get("origin") === getTrustedAppUrl().origin;
}
