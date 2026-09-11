import { hasSupabaseAdminEnv } from "@/lib/supabase/env";

export type DataBackend = "local" | "supabase";

export function getDataBackend(): DataBackend {
  const configuredBackend = process.env.DATA_BACKEND?.toLowerCase();

  if (configuredBackend === "supabase") {
    return "supabase";
  }

  if (configuredBackend === "local") {
    return "local";
  }

  return hasSupabaseAdminEnv() ? "supabase" : "local";
}

export function isSupabaseDataBackend() {
  return getDataBackend() === "supabase";
}
