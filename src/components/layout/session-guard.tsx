"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
export function SessionGuard({ sessionId }: { sessionId: string }) {
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    let active = true;
    const invalidate = () => setChanged(true);
    window.addEventListener("quiz-session-changed", invalidate);
    async function check() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active && data?.sessionId !== sessionId) setChanged(true);
      } catch { /* Network loss is not a logout. */ }
    }
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 15000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("quiz-session-changed", invalidate); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [sessionId]);
  if (!changed) return null;
  return <Modal title="บัญชีเปลี่ยนหรือหมดเวลาใช้งานแล้ว" onClose={() => { window.location.reload(); }}><div role="alert"><h2>บัญชีเปลี่ยนหรือหมดเวลาใช้งานแล้ว</h2><p>เปิดหน้าใหม่เพื่อใช้งานด้วยบัญชีปัจจุบัน</p><Link className="game-button" href="/" prefetch={false}>เปิดหน้าของบัญชีปัจจุบัน</Link></div></Modal>;
}
