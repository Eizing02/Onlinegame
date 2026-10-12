import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { raidEnabled } from "./config";
import { raidStandings } from "../rules/ranking";
import type { AppSession } from "@/types/auth";
import type { RaidAnswerResult, RaidSnapshot } from "../types";

const messages: Record<string, string> = {
 PRESENTATION_PENDING: "กำลังแสดงผลการต่อสู้ รอจบแล้วทำข้อต่อไป",
 ACCESS_DENIED: "บัญชีนี้ไม่มีสิทธิ์เข้าห้องนี้", ROOM_NOT_FOUND: "ไม่พบห้อง Boss Raid นี้", ACTIVE_ROOM: "มีห้องที่ยังไม่จบอยู่แล้ว",
 TEAM_FULL: "ทีมนี้เต็มแล้ว กรุณาเลือกทีมอื่น", HERO_TAKEN: "เพื่อนเลือกฮีโร่นี้แล้ว กรุณาเลือกตัวอื่น", LOBBY_CLOSED: "เกมเริ่มแล้ว ไม่สามารถเปลี่ยนฮีโร่หรือทีมได้",
 NO_PLAYERS: "ต้องมีนักเรียนอย่างน้อยหนึ่งคนก่อนเริ่ม", RAID_ENDED: "ห้องนี้จบแล้ว", RAID_EXPIRED: "หมดเวลาแล้ว",
 INVALID_QUESTION_SET: "ชุดคำถามไม่พร้อมใช้งาน", INVALID_SETTINGS: "ตั้งค่าเกมไม่ถูกต้อง", CONFLICT_REFRESH: "ข้อคำถามเปลี่ยนแล้ว กำลังโหลดสถานะล่าสุด",
 SPECTATOR_ONLY: "คุณเข้าหลังเริ่มเกม จึงรับชมได้อย่างเดียว", INVALID_OPTION: "ตัวเลือกไม่ตรงกับคำถามนี้", IDEMPOTENCY_CONFLICT: "คำขอซ้ำไม่ตรงกับข้อเดิม",
};
export function raidError(code?: string) { return messages[code ?? ""] ?? "ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง"; }

// Reuse migration 008's atomic, shared limiter without modifying Auth or its key space.
// Limits allow fast independent answers and retries; rooms do not multiply a user's budget.
export async function raidMutationAllowed(session: AppSession, kind: "hero" | "answer" | "visibility" | "control") {
 const limits = { answer: 60, hero: 30, visibility: 20, control: 10 };
 return rpc<boolean>("consume_auth_limit", { p_key: `raid:${session.userCode}:${kind}`, p_limit: limits[kind], p_seconds: 10 });
}

export async function raidAvailable() {
 if (!raidEnabled()) return false;
 const { error } = await createSupabaseAdminClient().from("boss_raid_sessions").select("session_id").limit(0);
 return !error;
}
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
 const { data, error } = await createSupabaseAdminClient().rpc(name, args);
 if (error) {
  // Never expose SQL, service credentials or frozen question content to the browser.
  if (error.message.includes("RAID_INVALID_QUESTION_SET")) throw new Error("ชุดคำถามต้องมีคะแนนรวมมากกว่า 0 และตัวเลือกที่ถูกต้องครบทุกข้อ");
  throw new Error("ระบบ Boss Raid ยังไม่พร้อม กรุณาตรวจ migration 009 และ 010 หรือลองอีกครั้ง");
 }
 return data as T;
}
export async function createRaid(teacher: AppSession, settings: { questionSetId: string; activityName: string; teamCount: number; maxMembersPerTeam: number; durationSeconds: number; visibilityEnabled: boolean }) {
 if (!await raidAvailable()) throw new Error("ยังไม่ได้เปิดใช้งาน Boss Raid หรือติดตั้ง migration 009");
 const result = await rpc<{ ok: boolean; code?: string; roomCode: string }>("create_boss_raid_room", { p_teacher: teacher.userCode, p_set: settings.questionSetId, p_activity: settings.activityName, p_teams: settings.teamCount, p_members: settings.maxMembersPerTeam, p_duration: settings.durationSeconds, p_visibility: settings.visibilityEnabled });
 if (!result.ok) throw new Error(raidError(result.code));
 return result;
}
export async function joinRaid(input: { roomCode: string; studentCode: string; authUserId?: string; teamId?: string }) {
 const result = await rpc<{ ok: boolean; code?: string; roomCode: string }>("join_boss_raid", { p_room: input.roomCode, p_student: input.studentCode, p_auth: input.authUserId ?? null, p_team: input.teamId ?? null });
 return result.ok ? { ok: true as const, roomCode: result.roomCode } : { ok: false as const, reason: raidError(result.code) };
}
export async function leaveRaid(roomCode: string, studentCode: string) {
 const result = await rpc<RaidAnswerResult>("leave_boss_raid_lobby", { p_room: roomCode, p_student: studentCode });
 return result.ok ? { ok: true as const } : { ok: false as const, reason: raidError(result.code) };
}
export async function raidSnapshot(roomCode: string, session: AppSession, teamId?: string, afterSeq = 0): Promise<RaidSnapshot | null> {
 const result = await rpc<RaidSnapshot & { ok: boolean; code?: string }>("get_private_raid_snapshot", { p_room: roomCode, p_user: session.userCode, p_teacher: session.role === "teacher", p_team: teamId ?? null, p_after: afterSeq });
 if (!result.ok) return null;
 const question = result.question as (RaidSnapshot["question"] & { imagePath?: string | null });
 if (question?.imagePath && !question.imageUrl) question.imageUrl = createSupabaseAdminClient().storage.from("question-images").getPublicUrl(question.imagePath).data.publicUrl;
 if (question) delete question.imagePath;
 const standings = raidStandings(result.teams, result.questionCount);
 return { ...result, averageStandings: standings.average, killStandings: standings.kill };
}
export async function raidCommand(roomCode: string, session: AppSession, command: "start" | "end") {
 if (command === "start") return rpc<RaidAnswerResult>("start_boss_raid", { p_room: roomCode, p_teacher: session.userCode });
 const snapshot = await raidSnapshot(roomCode, session);
 if (!snapshot) return { ok: false, code: "ACCESS_DENIED" };
 return rpc<RaidAnswerResult>("finish_boss_raid", { p_session: snapshot.sessionId, p_teacher: session.userCode });
}
export async function raidStudentMutation(roomCode: string, session: AppSession, kind: "hero" | "answer" | "visibility", input: Record<string, unknown>) {
 const names = { hero: "reserve_raid_hero", answer: "submit_boss_raid_answer", visibility: "report_raid_visibility" };
 const result = await rpc<RaidAnswerResult>(names[kind], { p_room: roomCode, p_student: session.userCode, ...input });
 // Reconcile expiry after the answer transaction releases its team lock.
 if (result.code === "RAID_EXPIRED") await raidSnapshot(roomCode, session);
 return result;
}
