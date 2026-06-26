function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

export function getSupabaseUrl() {
  return firstEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
}

export function getSupabaseAnonKey() {
  return firstEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  );
}

export function getSupabaseServiceRoleKey() {
  return firstEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY");
}

export function hasSupabasePublicEnv() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function hasSupabaseAdminEnv() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}
