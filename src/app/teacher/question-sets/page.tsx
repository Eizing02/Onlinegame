import { BookOpenCheck, ListPlus, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { createQuestionSetAction } from "@/app/teacher/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";
import { getTeacherQuestionSets } from "@/lib/data/teacher";

type QuestionSetsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function QuestionSetsPage({
  searchParams,
}: QuestionSetsPageProps) {
  const params = await searchParams;
  const data = await getTeacherQuestionSets();

  if (data.status === "unauthenticated") {
    redirect("/login?error=กรุณาเข้าสู่ระบบครูก่อน");
  }

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold">ชุดคำถาม</h1>
            <p className="mt-2 text-muted">
              จัดการคำถาม คำตอบที่ถูก คะแนน และเวลาที่ใช้ตอบ
            </p>
          </div>
          <ButtonLink href="/teacher/rooms/new">
            <span className="inline-flex items-center gap-2">
              <Plus size={18} />
              สร้างห้องเกม
            </span>
          </ButtonLink>
        </div>

        {params.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {params.error}
          </div>
        ) : null}

        <Panel>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" action={createQuestionSetAction}>
            <div>
              <label className="text-sm font-medium" htmlFor="title">
                ชื่อชุดคำถาม
              </label>
              <input
                id="title"
                name="title"
                className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                placeholder="เช่น วิทยาศาสตร์ ม.2"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="description">
                คำอธิบาย
              </label>
              <input
                id="description"
                name="description"
                className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                placeholder="หัวข้อหรือรายละเอียดสั้น ๆ"
              />
            </div>
            <div className="flex items-end">
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark md:w-auto"
                type="submit"
              >
                สร้างชุดคำถาม
              </button>
            </div>
          </form>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          {data.questionSets.map((set) => (
            <Panel key={set.id} className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-primary">
                  <BookOpenCheck size={22} />
                </span>
                <div>
              <h2 className="text-lg font-semibold">{set.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {set.description || "ยังไม่มีคำอธิบาย"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="font-medium">{set.questionCount} ข้อ</span>
                <span className="text-muted">{set.totalPoints} คะแนน</span>
              </div>
              <ButtonLink
                className="w-full"
                href={`/teacher/question-sets/${set.id}`}
                variant="secondary"
              >
                <span className="inline-flex items-center gap-2">
                  <ListPlus size={18} />
                  จัดการคำถาม
                </span>
              </ButtonLink>
            </Panel>
          ))}
          {data.questionSets.length === 0 ? (
            <Panel className="md:col-span-2">
              <p className="text-sm text-muted">
                ยังไม่มีชุดคำถาม เริ่มจากสร้างชุดคำถามแรกก่อน
              </p>
            </Panel>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
