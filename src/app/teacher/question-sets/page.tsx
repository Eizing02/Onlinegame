import { LoadingForm } from "@/components/ui/loading-form";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/session";

import { createQuestionSetAction } from "@/app/teacher/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";
import { getTeacherQuestionSets } from "@/lib/data/teacher";
import { QuestionSetGrid } from "./question-set-grid";

type QuestionSetsPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function QuestionSetsPage({
  searchParams,
}: QuestionSetsPageProps) {
  const params = await searchParams;
  await requireRole("teacher");
  const data = await getTeacherQuestionSets();

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
          <div className="rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {params.error}
          </div>
        ) : null}
        {params.notice ? (
          <div className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-medium text-success">
            {params.notice}
          </div>
        ) : null}

        <Panel>
          <LoadingForm className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" action={createQuestionSetAction}>
            <div>
              <label className="text-sm font-medium" htmlFor="title">
                ชื่อชุดคำถาม
              </label>
              <input
                id="title"
                name="title"
                className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
                placeholder="เช่น วิทยาศาสตร์ ม.2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="description">
                คำอธิบาย
              </label>
              <input
                id="description"
                name="description"
                className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
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
          </LoadingForm>
        </Panel>

        <QuestionSetGrid questionSets={data.questionSets} />
      </section>
    </AppShell>
  );
}
