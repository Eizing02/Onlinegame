"use client";
import { useActionState, useId } from "react";
import { LoaderCircle } from "lucide-react";
import { saveTeacherAction } from "./actions";
import type { TeacherAccess } from "@/lib/auth/teacher-access";

export function TeacherForm({ teacher }: { teacher?: TeacherAccess }) {
  const id = useId();
  const [state, action, pending] = useActionState(saveTeacherAction, { error: "", success: "" });
  return <form action={action} className="teacher-form identity-form" aria-busy={pending}>
    {teacher && <input type="hidden" name="userCode" value={teacher.userCode} />}
    {!teacher && <div><label htmlFor={`${id}-email`}>อีเมล Google ของครู</label><input id={`${id}-email`} name="email" type="email" maxLength={254} autoComplete="off" placeholder="teacher@gmail.com" required /></div>}
    <div><label htmlFor={`${id}-name`}>ชื่อ–นามสกุลที่แสดง</label><input id={`${id}-name`} name="displayName" maxLength={160} defaultValue={teacher?.displayName} required /></div>
    <div><label htmlFor={`${id}-status`}>สถานะ</label><select id={`${id}-status`} name="status" defaultValue={teacher?.status || "active"}><option value="active">เปิดใช้งาน</option><option value="pending">รอเปิดใช้งาน</option><option value="suspended">ระงับ</option></select></div>
    {state.error && <p className="notice-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-notice" role="status">{state.success}</p>}
    <button type="submit" className="game-button" disabled={pending}>{pending && <LoaderCircle size={18} className="loading-spin" aria-hidden="true" />}{pending ? "กำลังบันทึก…" : teacher ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มครู"}</button>
  </form>;
}
