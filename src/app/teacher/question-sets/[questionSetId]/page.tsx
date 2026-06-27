import { ArrowLeft, Clock, ListPlus, Trash2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import {
  addQuestionAction,
  deleteQuestionAction,
  deleteQuestionSetAction,
  deleteSelectedQuestionsAction,
} from "@/app/teacher/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/session";
import { getLocalQuestionSet } from "@/lib/data/question-bank";

type QuestionSetDetailPageProps = {
  params: Promise<{
    questionSetId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function QuestionSetDetailPage({
  params,
  searchParams,
}: QuestionSetDetailPageProps) {
  const session = await requireRole("teacher");
  const { questionSetId } = await params;
  const query = await searchParams;
  const questionSet = await getLocalQuestionSet(session.userCode, questionSetId);

  if (!questionSet) {
    notFound();
  }

  if (session.role !== "teacher") {
    redirect("/login");
  }

  const totalPoints = questionSet.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <ButtonLink href="/teacher/question-sets" variant="secondary">
              <span className="inline-flex items-center gap-2">
                <ArrowLeft size={18} />
                กลับไปชุดคำถาม
              </span>
            </ButtonLink>
            <h1 className="mt-5 text-3xl font-semibold">
              {questionSet.title}
            </h1>
            <p className="mt-2 max-w-2xl text-muted">
              {questionSet.description || "ยังไม่มีคำอธิบายชุดคำถาม"}
            </p>
          </div>
          <div className="space-y-3 sm:w-72">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border bg-white p-3">
                <p className="text-muted">จำนวนคำถาม</p>
                <p className="mt-1 text-2xl font-semibold">
                  {questionSet.questions.length}
                </p>
              </div>
              <div className="rounded-md border border-border bg-white p-3">
                <p className="text-muted">คะแนนรวม</p>
                <p className="mt-1 text-2xl font-semibold">{totalPoints}</p>
              </div>
            </div>
            <form action={deleteQuestionSetAction}>
              <input name="question_set_id" type="hidden" value={questionSet.id} />
              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                type="submit"
              >
                <Trash2 size={17} />
                ลบชุดคำถามนี้
              </button>
            </form>
          </div>
        </div>

        {query.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {query.error}
          </div>
        ) : null}
        {query.notice ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {query.notice}
          </div>
        ) : null}

        <Panel>
          <form className="grid gap-5" action={addQuestionAction}>
            <input name="question_set_id" type="hidden" value={questionSet.id} />
            <div>
              <label className="text-sm font-medium" htmlFor="question_text">
                คำถาม
              </label>
              <textarea
                id="question_text"
                name="question_text"
                className="mt-2 min-h-28 w-full rounded-md border border-border px-3 py-3 outline-none focus:border-primary"
                placeholder="พิมพ์คำถามที่ต้องการให้นักเรียนตอบ"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_140px_180px]">
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="correct_answer"
                >
                  คำตอบที่ถูก
                </label>
                <input
                  id="correct_answer"
                  name="correct_answer"
                  className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                  placeholder="เช่น 42"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="points">
                  คะแนน
                </label>
                <input
                  id="points"
                  name="points"
                  className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                  defaultValue={10}
                  min={0}
                  max={1000}
                  type="number"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="time_limit_seconds"
                >
                  เวลาตอบต่อข้อ
                </label>
                <input
                  id="time_limit_seconds"
                  name="time_limit_seconds"
                  className="mt-2 h-11 w-full rounded-md border border-border px-3 outline-none focus:border-primary"
                  defaultValue={60}
                  min={5}
                  max={600}
                  type="number"
                />
              </div>
            </div>
            <div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
                type="submit"
              >
                <ListPlus size={18} />
                เพิ่มคำถาม
              </button>
            </div>
          </form>
        </Panel>

        <form id="bulk-delete-questions" action={deleteSelectedQuestionsAction}>
          <input name="question_set_id" type="hidden" value={questionSet.id} />
        </form>

        {questionSet.questions.length > 0 ? (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-panel/70 p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-muted">
              เลือกคำถามหลายข้อแล้วลบพร้อมกันได้
            </p>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              form="bulk-delete-questions"
              type="submit"
            >
              <Trash2 size={17} />
              ลบข้อที่เลือก
            </button>
          </div>
        ) : null}

        <div className="space-y-4">
          {questionSet.questions.map((question, index) => (
            <Panel key={question.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <input
                    aria-label={`เลือกคำถามข้อ ${index + 1}`}
                    className="mt-1 h-5 w-5 rounded border-border bg-background"
                    form="bulk-delete-questions"
                    name="question_ids"
                    type="checkbox"
                    value={question.id}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">
                      ข้อ {index + 1}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold leading-7">
                      {question.questionText}
                    </h2>
                  </div>
                </div>
                <form action={deleteQuestionAction}>
                  <input
                    name="question_set_id"
                    type="hidden"
                    value={questionSet.id}
                  />
                  <input name="question_id" type="hidden" value={question.id} />
                  <button
                    aria-label={`ลบคำถามข้อ ${index + 1}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                    title="ลบคำถาม"
                    type="submit"
                  >
                    <Trash2 size={18} />
                  </button>
                </form>
              </div>
              <div className="grid gap-3 border-t border-border pt-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-muted">คำตอบที่ถูก</p>
                  <p className="mt-1 font-semibold">{question.correctAnswer}</p>
                </div>
                <div>
                  <p className="text-muted">คะแนน</p>
                  <p className="mt-1 font-semibold">{question.points}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-1 text-muted" size={16} />
                  <div>
                    <p className="text-muted">เวลาตอบ</p>
                    <p className="mt-1 font-semibold">
                      {question.timeLimitSeconds} วินาที
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          ))}
          {questionSet.questions.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">
                ยังไม่มีคำถามในชุดนี้ เพิ่มคำถามแรกจากฟอร์มด้านบนได้เลย
              </p>
            </Panel>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
