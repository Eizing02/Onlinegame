"use server";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/session";
import { manageTeachers } from "@/lib/auth/teacher-access";
import { authMessage } from "@/lib/auth/auth-messages";

export type TeacherFormState = { error: string; success: string };
export async function saveTeacherAction(_previous: TeacherFormState, form: FormData): Promise<TeacherFormState> {
  const session = await requireSuperAdmin();
  const code = String(form.get("userCode") || "");
  try {
    const result = await manageTeachers(session, {
      action: code ? "update" : "add", userCode: code, email: String(form.get("email") || ""),
      displayName: String(form.get("displayName") || ""), status: String(form.get("status") || ""),
    });
    if (!result.ok) return { error: authMessage(result.code), success: "" };
    revalidatePath("/admin/teachers");
    return { error: "", success: code ? "บันทึกชื่อและสถานะแล้ว" : `เพิ่มครูแล้ว (${result.userCode}) ครูเข้าสู่ระบบด้วยอีเมลที่ระบุได้เลยเมื่อสถานะเปิดใช้งาน` };
  } catch { return { error: authMessage("AUTH_CONFIGURATION"), success: "" }; }
}
