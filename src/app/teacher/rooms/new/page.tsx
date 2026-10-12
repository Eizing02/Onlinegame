import { RaidRoomForm } from "@/features/boss-raid/components/RaidRoomForm";
import { raidAvailable } from "@/features/boss-raid/server/raid-service";
import "@/features/boss-raid/raid.css";
import { deleteRoomAction } from "@/app/teacher/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/session";
import { getActiveTeacherGameSession } from "@/lib/data/game-sessions";
import { getLocalQuestionSetSummaries } from "@/lib/data/question-bank";

type NewRoomPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
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
          <div className="rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {params.error}
          </div>
        ) : null}
        {params.notice ? (
          <div className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-medium text-success">
            {params.notice}
          </div>
        ) : null}

        {!canCreateRoom ? (
          <div className="rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            {activeRoom
              ? `มีห้อง ${activeRoom.roomCode} ที่ยังไม่จบอยู่ กรุณาใช้ห้องเดิมหรือจบเกมก่อนสร้างห้องใหม่`
              : "ต้องมีชุดคำถามที่มีคำถามอย่างน้อย 1 ข้อก่อน ถึงจะสร้างห้องเกมได้"}
          </div>
        ) : null}

        {activeRoom ? (
          <Panel className="flex flex-col justify-between gap-4 border-warning bg-warning/10 sm:flex-row sm:items-center">
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={`/teacher/rooms/${activeRoom.roomCode}/dashboard`}>
                กลับไปห้องเดิม
              </ButtonLink>
              <form action={deleteRoomAction}>
                <input name="room_code" type="hidden" value={activeRoom.roomCode} />
                <input name="return_to" type="hidden" value="/teacher/rooms/new" />
                <ConfirmSubmitButton
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-danger bg-danger/10 px-4 text-sm font-semibold text-danger transition hover:bg-danger/10 sm:w-auto"
                  message={`ปิดห้อง ${activeRoom.roomCode} และลบข้อมูลรอบเล่นทั้งหมด? หลังปิดห้องจะดูสรุปย้อนหลังไม่ได้`}
                >
                  ปิดห้องนี้
                </ConfirmSubmitButton>
              </form>
            </div>
          </Panel>
        ) : null}

        <Panel>
          <RaidRoomForm sets={questionSets} canCreate={canCreateRoom} raidAvailable={await raidAvailable()}/>
        </Panel>
      </section>
    </AppShell>
  );
}
