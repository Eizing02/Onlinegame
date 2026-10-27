import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/auth/api-session";
import { raidCommand, raidError, raidMutationAllowed, raidSnapshot, raidStudentMutation } from "./raid-service";

import { HERO_TYPES } from "../assets/manifest";

const current = { questionId: z.uuid(), displayIndex: z.number().int().min(0).max(999) };
const schemas = {
 team: z.object({ teamId: z.uuid(), teamName: z.string().max(300) }).strict(),
 hero: z.object({ heroType: z.enum(HERO_TYPES) }).strict(),
 answer: z.object({ ...current, idempotencyKey: z.uuid(), answerText: z.string().max(2000).nullable().optional(), selectedOptionId: z.uuid().nullable().optional() }).strict().refine(v => Boolean(v.answerText?.trim()) !== Boolean(v.selectedOptionId), "กรุณากรอกคำตอบหรือเลือกหนึ่งตัวเลือก"),
 visibility: z.object({ ...current, eventId: z.uuid(), durationMs: z.number().int().min(0).max(86400000) }).strict(),
 control: z.object({ command: z.enum(["start", "end"]) }).strict(),
};
type Context = { params: Promise<{ roomCode: string }> };
const headers = { "Cache-Control": "private, no-store, max-age=0" };
export function snapshotHandler(teacher = false) {
 return async (request: Request, context: Context) => {
  const auth = await authorizeApi(request, teacher ? "teacher" : "student"); if (!auth.ok) return auth.response;
  const { roomCode } = await context.params;
  const query = new URL(request.url).searchParams;
  const parsed = z.object({ room: z.string().regex(/^\d{4}$/), team: z.uuid().optional(), after: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }).safeParse({ room: roomCode, team: query.get("team") ?? undefined, after: query.get("after") ?? 0 });
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลห้องไม่ถูกต้อง" }, { status: 400, headers });
  try {
   const snapshot = await raidSnapshot(roomCode, auth.session, teacher ? parsed.data.team : undefined, parsed.data.after);
   return NextResponse.json(snapshot ?? { error: "ไม่พบห้องนี้ หรือบัญชีนี้ไม่มีสิทธิ์", code: "ACCESS_DENIED" }, { status: snapshot ? 200 : 403, headers });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "โหลดสถานะไม่สำเร็จ" }, { status: 503, headers }); }
 };
}
export function mutationHandler(kind: keyof typeof schemas) {
 return async (request: Request, context: Context) => {
  const auth = await authorizeApi(request, kind === "control" ? "teacher" : "student"); if (!auth.ok) return auth.response;
  const { roomCode } = await context.params;
  if (!/^\d{4}$/.test(roomCode)) return NextResponse.json({ error: "รหัสห้องไม่ถูกต้อง" }, { status: 400, headers });
  try {
   if (!await raidMutationAllowed(auth.session, kind)) return NextResponse.json({ error: "ส่งคำขอถี่เกินไป รอ 10 วินาทีแล้วลองอีกครั้ง", code: "RATE_LIMITED" }, { status: 429, headers: { ...headers, "Retry-After": "10" } });
   const body = schemas[kind].safeParse(await request.json());
   if (!body.success) return NextResponse.json({ error: "ข้อมูลคำขอไม่ถูกต้อง" }, { status: 400, headers });
   const input = body.data;
   let result;
   if (kind === "control" && "command" in input) result = await raidCommand(roomCode, auth.session, input.command);
   else if ("teamName" in input) result = await raidStudentMutation(roomCode, auth.session, "team", { p_team: input.teamId, p_name: input.teamName });
   else if ("heroType" in input) result = await raidStudentMutation(roomCode, auth.session, "hero", { p_hero: input.heroType });
   else if ("idempotencyKey" in input) result = await raidStudentMutation(roomCode, auth.session, "answer", { p_question: input.questionId, p_index: input.displayIndex, p_key: input.idempotencyKey, p_answer: input.answerText ?? null, p_option: input.selectedOptionId ?? null });
   else if ("eventId" in input) result = await raidStudentMutation(roomCode, auth.session, "visibility", { p_question: input.questionId, p_index: input.displayIndex, p_event: input.eventId, p_duration: input.durationMs });
   else throw new Error("ข้อมูลไม่ครบ");
   return NextResponse.json({ ...result, ...(result.ok ? {} : { error: raidError(result.code) }) }, { status: result.ok ? 200 : result.code === "ACCESS_DENIED" ? 403 : 409, headers });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ" }, { status: e instanceof SyntaxError ? 400 : 503, headers }); }
 };
}
