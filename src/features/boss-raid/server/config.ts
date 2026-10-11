import "server-only";
import readiness from "../../../../public/assets/boss-raid/readiness.json";
import { isSupabaseDataBackend } from "@/lib/data/backend";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
export function raidEnabled() { return process.env.BOSS_RAID_ENABLED === "true" && isSupabaseDataBackend() && readiness.ready; }
export async function roomIsRaid(roomCode: string) {
 if (!isSupabaseDataBackend()) return false;
 const { data, error } = await createSupabaseAdminClient().from("game_sessions").select("game_mode").eq("room_code", roomCode).order("created_at", { ascending: false }).limit(1).maybeSingle();
 if (error && !["42703", "PGRST204"].includes(error.code)) throw error;
 return data?.game_mode === "boss_raid";
}
