import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { raidSnapshot } from "@/features/boss-raid/server/raid-service";
import { TeacherRaidOverview } from "@/features/boss-raid/components/TeacherRaidOverview";
export default async function RaidPage({params}:{params:Promise<{roomCode:string}>}) {
 const session=await requireRole("teacher"); const {roomCode}=await params;
 if(!/^\d{4}$/.test(roomCode))notFound();
 const initial=await raidSnapshot(roomCode,session); if(!initial)notFound();
 return <AppShell room><TeacherRaidOverview initial={initial} sessionId={session.sessionId} /></AppShell>;
}
