import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AppSession } from "@/types/auth";

export type TeacherAccess = {
  userCode: string; email: string; displayName: string; accessLevel: "super_admin" | "teacher";
  status: "pending" | "active" | "suspended"; createdAt: string; lastLoginAt: string | null;
  questionSets: number; activeRooms: number;
};
type TeacherResult = { ok: true; teachers?: TeacherAccess[]; total?: number; userCode?: string } | { ok: false; code: string };
export async function manageTeachers(session: AppSession, input: {
  action: "list" | "add" | "update"; userCode?: string; email?: string; displayName?: string;
  status?: string; search?: string; page?: number;
}): Promise<TeacherResult> {
  if (session.authMode !== "google" || !session.authUserId || session.accessLevel !== "super_admin") return { ok: false, code: "ADMIN_REQUIRED" };
  const { data, error } = await createSupabaseAdminClient().rpc("manage_teacher_access", {
    p_actor: session.authUserId, p_action: input.action, p_target_code: input.userCode || null,
    p_email: input.email?.trim().toLowerCase() || null, p_display_name: input.displayName?.trim() || null,
    p_status: input.status || "active", p_search: (input.search || "").trim().slice(0,160), p_page: input.page || 1,
  });
  return error || !data ? { ok: false, code: "AUTH_CONFIGURATION" } : data as TeacherResult;
}
