import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { signOutAction } from "@/app/auth/actions";
import { SessionGuard } from "./session-guard";

export async function AppShell({ children, room = false }: { children: React.ReactNode; room?: boolean }) {
  const session = await getSession();
  return <div className={`app-shell min-h-screen text-foreground ${room ? "room-app" : ""}`}>
    <a className="skip-link" href="#main-content">ข้ามไปเนื้อหา</a>
    <header className="app-header"><div className="header-inner">
      <Link href="/" aria-label="KruEIonline หน้าหลัก"><Image alt="KruEIonline" className="brand-logo" height={100} width={180} priority src="/assets/brand/logo.png" /></Link>
      <nav aria-label="เมนูหลัก" className="header-actions">
        {session && <><Link className="account-label" href={session.role === "teacher" ? "/teacher/question-sets" : "/join"}>
          <span>{session.role === "teacher" ? "ครู" : "นักเรียน"}</span><strong>{session.displayName}</strong>
        </Link><form action={signOutAction}><button className="icon-button" aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut size={19} /></button></form></>}
      </nav>
    </div></header>
    <main id="main-content">{children}</main>
    {session && <SessionGuard sessionId={session.sessionId} />}
  </div>;
}
