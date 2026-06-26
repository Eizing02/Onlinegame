export type DataBackend = "local" | "supabase";

export function getDataBackend(): DataBackend {
  return process.env.DATA_BACKEND?.toLowerCase() === "supabase"
    ? "supabase"
    : "local";
}

export function isSupabaseDataBackend() {
  return getDataBackend() === "supabase";
}
