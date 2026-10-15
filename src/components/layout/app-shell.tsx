import { LoadingForm } from "@/components/ui/loading-form";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { signOutAction } from "@/app/auth/actions";
import { SessionGuard } from "./session-guard";
import { AudioControl } from "@/components/audio/audio-control";

export async function AppShell({ children, room = false, wallpaper, className = "" }: { children: React.ReactNode; room?: boolean; className?: string; wallpaper?: "login" | "join" }) {
  const session = await getSession();
  return <div className={`app-shell min-h-screen text-foreground ${className} ${room ? "room-app" : ""} ${wallpaper ? `wallpaper-shell wallpaper-shell-${wallpaper}` : ""}`}>
    <a className="skip-link" href="#main-content">ข้ามไปเนื้อหา</a>
    <header className="app-header"><div className="header-inner">
      <Link href="/" aria-label="KruEIonline หน้าหลัก"><Image alt="KruEIonline" className="brand-logo" height={100} width={180} priority src="/assets/brand/logo.png" /></Link>
      <nav aria-label="เมนูหลัก" className="header-actions">
        {!room && <AudioControl />}
        {session?.accessLevel === "super_admin" && <Link className="admin-nav" href="/admin/teachers" aria-label="จัดการครู"><Users size={19} aria-hidden="true" /><span>จัดการครู</span></Link>}
        {session && <><Link className="account-label" aria-label={session.role === "student" && session.authMode === "google" ? "ข้อมูลบัญชี" : undefined} href={session.role === "teacher" ? "/teacher/question-sets" : session.authMode === "google" ? "/account" : "/join"}>
          <span>{session.role === "teacher" ? "ครู" : "นักเรียน"}</span><strong>{session.displayName}</strong>
        </Link><LoadingForm action={signOutAction}><button className="icon-button" aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut size={19} /></button></LoadingForm></>}
      </nav>
    </div></header>
    <main id="main-content">{children}</main>
    {session && <SessionGuard sessionId={session.sessionId} />}
  </div>;
}
