import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { requireSuperAdmin } from "@/lib/auth/session";
import { manageTeachers } from "@/lib/auth/teacher-access";
import { authMessage } from "@/lib/auth/auth-messages";
import { TeacherForm } from "./teacher-form";

const statuses = { active: "เปิดใช้งาน", pending: "รอเปิดใช้งาน", suspended: "ระงับ" };
const date = (value: string | null) => value ? new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคยเข้าสู่ระบบ";
export default async function TeachersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await requireSuperAdmin();
  const params = await searchParams;
  const search = (params.q || "").slice(0, 160);
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page || "1", 10) || 1));
  const result = await manageTeachers(session, { action: "list", search, page });
  const url = (target: number) => `/admin/teachers?${new URLSearchParams({ q: search, page: String(target) })}`;
  return <AppShell><section className="identity-page teachers-page"><Link className="identity-back" href="/teacher/question-sets">กลับไปชุดคำถามของฉัน</Link>
    <h1>จัดการครู</h1><p className="text-muted">เพิ่มสิทธิ์ด้วยอีเมล Google ครูแต่ละคนจัดการชุดคำถามและห้องของตนเอง</p>
    <details className="identity-disclosure"><summary>เพิ่มครูใหม่</summary><TeacherForm /></details>
    <form className="teacher-search" action="/admin/teachers"><label htmlFor="teacher-search">ค้นหาครู</label><div><input id="teacher-search" name="q" defaultValue={search} maxLength={160} placeholder="ชื่อ อีเมล หรือรหัสครู" /><button className="identity-secondary" type="submit">ค้นหา</button></div></form>
    {!result.ok ? <p className="notice-error" role="alert">{authMessage(result.code)}</p> : <>
      <p className="text-muted" role="status">พบ {result.total || 0} บัญชี · หน้า {page}</p>
      {!result.teachers?.length ? <p className="identity-empty">ไม่พบครูที่ตรงกับคำค้น ลองค้นด้วยอีเมลหรือชื่อบางส่วน</p> : <ul className="teacher-list" aria-label="รายชื่อครู">{result.teachers.map(teacher => <li key={teacher.userCode}>
        <div className="teacher-record"><div><h2>{teacher.displayName}</h2><p className="identity-email">{teacher.email}</p><p className="text-muted">{teacher.userCode} · {teacher.accessLevel === "super_admin" ? "ผู้ดูแลระบบหลัก" : "ครู"}</p></div>
          <div><span className={`teacher-status status-${teacher.status}`}>{statuses[teacher.status]}</span><p className="text-muted">{teacher.questionSets} ชุดคำถาม · {teacher.activeRooms} ห้องที่ยังไม่จบ</p><p className="text-muted">เพิ่มเมื่อ: {date(teacher.createdAt)}</p><p className="text-muted">เข้าใช้ล่าสุด: {date(teacher.lastLoginAt)}</p></div></div>
        <details className="teacher-edit"><summary>แก้ไขชื่อและสถานะ</summary><TeacherForm teacher={teacher} /></details>
      </li>)}</ul>}
      <nav className="identity-actions teacher-pagination" aria-label="หน้ารายชื่อครู">{page > 1 && <Link className="identity-secondary" href={url(page - 1)}>หน้าก่อน</Link>}{page * 50 < (result.total || 0) && <Link className="identity-secondary" href={url(page + 1)}>หน้าถัดไป</Link>}</nav>
    </>}
  </section></AppShell>;
}
