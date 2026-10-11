"use client";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { signInWithGoogleAction } from "@/app/auth/actions";

export function GoogleLoginForm() {
  const [state, action, pending] = useActionState(signInWithGoogleAction, { error: "" });
  return <form action={action} className="login-form" aria-busy={pending}>
    {state.error && <p role="alert" className="notice-error">{state.error}</p>}
    <button className="game-button login-submit" disabled={pending} type="submit">
      {pending ? <LoaderCircle size={20} className="loading-spin" aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}
      {pending ? "กำลังเปิด Google…" : "เข้าสู่ระบบด้วย Google"}
    </button>
    <p className="login-help">ครูและนักเรียนใช้ปุ่มเดียวกัน ครั้งแรกนักเรียนจะได้ตรวจสอบรหัสประจำตัวก่อนเข้าเกม</p>
  </form>;
}
