"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-recovery"><h1>เชื่อมต่อข้อมูลไม่สำเร็จ</h1><p>ข้อมูลบัญชีหรือห้องเกมยังโหลดไม่สำเร็จ ลองเชื่อมต่ออีกครั้งได้</p><div className="mt-6 flex flex-wrap items-center gap-5"><button className="game-button" onClick={reset}>ลองอีกครั้ง</button><Link href="/login">กลับหน้าเข้าสู่ระบบ</Link></div></main>;
}
