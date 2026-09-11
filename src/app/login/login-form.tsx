"use client";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { signInWithSheetAction } from "@/app/auth/actions";
export function LoginForm() {
  const [state, action, pending] = useActionState(signInWithSheetAction, { error: "", userCode: "" });
  return <form action={action} className="login-form" aria-busy={pending}>
    <div><label htmlFor="user_code">รหัสผู้ใช้</label><input id="user_code" name="user_code" autoComplete="username" autoCapitalize="characters" spellCheck={false} maxLength={100} defaultValue={state.userCode} placeholder="รหัสประจำตัวนักเรียนหรือรหัสครู" required aria-describedby={state.error ? "login-error" : undefined} /></div>
    <div><label htmlFor="password">รหัสผ่าน</label><input id="password" name="password" autoComplete="current-password" type="password" maxLength={256} placeholder="กรอกรหัสผ่านของคุณ" required aria-describedby={state.error ? "login-error" : undefined} /></div>
    {state.error && <p id="login-error" className="notice notice-error" role="alert">{state.error}</p>}
    <button className="game-button login-submit" type="submit" disabled={pending}>{pending ? <LoaderCircle className="loading-spin" size={19} /> : <ArrowRight size={19} />} {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
    <p className="login-help"><LockKeyhole size={15} aria-hidden="true" />ระบบจะเปิดหน้าครูหรือนักเรียนตามบัญชีของคุณ</p>
  </form>;
}
