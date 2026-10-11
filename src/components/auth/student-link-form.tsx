"use client";
import { useRef, useState } from "react";
import { Check, LoaderCircle, Pencil } from "lucide-react";
import { authMessage } from "@/lib/auth/auth-messages";
import { isStudentCode, normalizeStudentCode } from "@/lib/auth/google-identity";
import type { StudentPreview } from "@/lib/auth/account-linking";

export function StudentLinkForm({ changing = false, sessionId }: { changing?: boolean; sessionId?: string }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<StudentPreview | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  async function request(operation: "lookup" | "claim" | "change-code") {
    if (inFlight.current) return;
    const normalized = normalizeStudentCode(code);
    if (!isStudentCode(normalized)) { setError(authMessage("INVALID_STUDENT_CODE")); input.current?.focus(); return; }
    inFlight.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/auth/student/${operation}`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(sessionId ? { "x-client-session": sessionId } : {}) },
        body: JSON.stringify({ studentCode: operation === "lookup" ? normalized : preview?.userCode }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(authMessage(result.code)); return; }
      if (operation === "lookup") { setCode(normalized); setPreview(result.student); }
      // Identity changes require a fresh document and discard cached role/session views.
      else window.location.assign(new URL("/", window.location.origin).href);
    } catch { setError("เชื่อมต่อไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง ข้อมูลที่กรอกยังอยู่"); }
    finally { inFlight.current = false; setPending(false); }
  }
  function edit() { setPreview(null); setError(""); requestAnimationFrame(() => input.current?.focus()); }
  return <form className="identity-form" aria-busy={pending} onSubmit={event => { event.preventDefault(); void request(preview ? (changing ? "change-code" : "claim") : "lookup"); }}>
    {!preview ? <div><label htmlFor="student-code">{changing ? "รหัสนักเรียนใหม่" : "รหัสประจำตัวนักเรียน"}</label>
      <input ref={input} id="student-code" name="studentCode" type="text" inputMode="numeric" autoComplete="off" maxLength={5} value={code} onChange={event => setCode(normalizeStudentCode(event.target.value))} placeholder="เช่น 01234" required aria-invalid={!!error} aria-describedby={`student-code-help${error ? " student-link-error" : ""}`} />
      <p id="student-code-help" className="text-muted">ตัวเลข 5 หลัก รวมเลข 0 ด้านหน้า</p>
    </div> : <div className="identity-preview" aria-live="polite">
      <h2>ตรวจสอบว่าเป็นข้อมูลของคุณ</h2>
      <dl className="identity-details"><div><dt>รหัสนักเรียน</dt><dd>{preview.userCode}</dd></div><div><dt>ชื่อ–นามสกุล</dt><dd>{preview.displayName}</dd></div><div><dt>ชั้น</dt><dd>{preview.grade || "ยังไม่ได้ระบุ"}</dd></div></dl>
      <p className="text-muted">ยืนยันเฉพาะรหัสของตนเอง หากชื่อไม่ตรง ให้แก้ไขรหัสก่อน</p>
    </div>}
    {error && <p id="student-link-error" role="alert" className="notice-error">{error}</p>}
    {changing && <p className="identity-warning">ประวัติคำตอบและคะแนนเดิมยังอยู่กับรหัสเดิม เปลี่ยนไม่ได้ขณะที่รหัสเดิมหรือรหัสใหม่มีห้องเกมที่ยังไม่จบ และทำได้ไม่เกิน 2 ครั้งใน 24 ชั่วโมง</p>}
    <div className="identity-actions">
      <button type="submit" className="game-button" disabled={pending}>{pending ? <LoaderCircle size={18} className="loading-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}{pending ? "กำลังตรวจสอบ…" : preview ? (changing ? "ยืนยันเปลี่ยนรหัส" : "ยืนยันและเข้าเกม") : "ตรวจสอบรหัส"}</button>
      {preview && <button type="button" className="identity-secondary" disabled={pending} onClick={edit}><Pencil size={16} aria-hidden="true" />แก้ไขรหัส</button>}
    </div>
  </form>;
}
