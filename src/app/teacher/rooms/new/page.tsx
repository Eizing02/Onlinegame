import { createRoomAction } from "@/app/teacher/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/session";
import { getActiveTeacherGameSession } from "@/lib/data/game-sessions";
import { getLocalQuestionSetSummaries } from "@/lib/data/question-bank";

type NewRoomPageProps = {
  searchParams: Promise<{
    error?: string;
    active_room?: string;
  }>;
};

export default async function NewRoomPage({ searchParams }: NewRoomPageProps) {
  const teacher = await requireRole("teacher");
  const params = await searchParams;
  const questionSets = await getLocalQuestionSetSummaries(teacher.userCode);
  const activeRoom = await getActiveTeacherGameSession(teacher.userCode);
  const playableQuestionSets = questionSets.filter(
    (set) => set.questionCount > 0,
  );
  const canCreateRoom = playableQuestionSets.length > 0 && !activeRoom;

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 lg:px-8">
        <div>
          <h1 className="text-3xl font-semibold">สร้างห้องเกม</h1>
          <p className="mt-2 text-muted">
            เลือกชุดคำถาม กำหนดจำนวนทีม แล้วระบบจะสร้างรหัสห้องตัวเลข 4 หลัก
            ให้นักเรียนใช้เข้าห้องได้ง่าย
          </p>
        </div>

        {params.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {params.error}
          </div>
        ) : null}

        {!canCreateRoom ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {activeRoom
              ? `มีห้อง ${activeRoom.roomCode} ที่ยังไม่จบอยู่ กรุณาใช้ห้องเดิมหรือจบเกมก่อนสร้างห้องใหม่`
              : "ต้องมีชุดคำถามที่มีคำถามอย่างน้อย 1 ข้อก่อน ถึงจะสร้างห้องเกมได้"}
          </div>
        ) : null}

        {activeRoom ? (
          <Panel className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-muted">ห้องที่ยัง active</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {activeRoom.roomCode}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {activeRoom.questionSetTitle}
                {activeRoom.activityName ? ` • ${activeRoom.activityName}` : ""}
              </p>
            </div>
            <ButtonLink href={`/teacher/rooms/${activeRoom.roomCode}/dashboard`}>
              กลับไปห้องเดิม
            </ButtonLink>
          </Panel>
        ) : null}

        <Panel>
          <form className="grid gap-5 md:grid-cols-2" action={createRoomAction}>
            <div>
              <label className="text-sm font-medium" htmlFor="question_set_id">
                ชุดคำถาม
              </label>
              <select
                id="question_set_id"
                name="question_set_id"
                className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 outline-none focus:border-primary"
                disabled={!canCreateRoom}
                required
              >
                {questionSets.map((set) => (
                  <option
                    disabled={set.questionCount === 0}
                    key={set.id}
                    value={set.id}
                  >
                    {set.title} ({set.questionCount} ข้อ)
                  </option>
                ))}
              </select>
              {!canCreateRoom ? (
                <p className="mt-2 text-sm text-muted">
                  กลับไปเพิ่มคำถามในชุดคำถามก่อน
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="activity_name">
                ชื่อกิจกรรม
              </label>
              <input
                id="activity_name"
                name="activity_name"
                className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                placeholder="กิจกรรมท้ายคาบ"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="team_count">
                จำนวนกลุ่ม
              </label>
              <input
                id="team_count"
                name="team_count"
                className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                defaultValue={4}
                max={12}
                min={1}
                type="number"
              />
            </div>
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="max_members_per_team"
              >
                จำนวนคนต่อกลุ่ม
              </label>
              <input
                id="max_members_per_team"
                name="max_members_per_team"
                className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                defaultValue={5}
                max={12}
                min={1}
                type="number"
              />
            </div>
            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row">
              <button
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!canCreateRoom}
                type="submit"
              >
                สร้างห้องเกม
              </button>
              <ButtonLink href="/teacher/question-sets" variant="secondary">
                กลับไปจัดการชุดคำถาม
              </ButtonLink>
            </div>
          </form>
        </Panel>
      </section>
    </AppShell>
  );
}
