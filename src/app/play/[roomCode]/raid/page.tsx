import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { raidSnapshot } from "@/features/boss-raid/server/raid-service";
import { RaidClient } from "@/features/boss-raid/components/RaidClient";
export default async function RaidPage({params}:{params:Promise<{roomCode:string}>}) {
 const session=await requireRole("student"); const {roomCode}=await params;
 if(!/^\d{4}$/.test(roomCode))notFound();
 const initial=await raidSnapshot(roomCode,session); if(!initial)notFound();
 return <AppShell room><RaidClient initial={initial} sessionId={session.sessionId} /></AppShell>;
}
