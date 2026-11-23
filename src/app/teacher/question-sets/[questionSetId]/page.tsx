import { LoadingForm } from "@/components/ui/loading-form";
import { ArrowLeft, Play, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import {
  deleteQuestionSetAction,
  deleteSelectedQuestionsAction,
} from "@/app/teacher/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/session";
import { getLocalQuestionSet } from "@/lib/data/question-bank";
import { AddQuestionForm } from "./add-question-form";
import { BulkDeleteBar } from "./bulk-delete-bar";
import { QuestionItemCard } from "./question-item-card";

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
              <div className="rounded-md border border-border bg-surface p-3">
                <p className="text-muted">จำนวนคำถาม</p>
                <p className="mt-1 text-2xl font-semibold">
                  {questionSet.questions.length}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface p-3">
                <p className="text-muted">คะแนนรวม</p>
                <p className="mt-1 text-2xl font-semibold">{totalPoints}</p>
              </div>
            </div>
            {questionSet.questions.length > 0 ? (
              <ButtonLink
                className="w-full"
                href={`/teacher/rooms/new?set=${encodeURIComponent(questionSet.id)}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Play size={17} />
                  สร้างห้องจากชุดนี้
                </span>
              </ButtonLink>
            ) : null}
            <LoadingForm action={deleteQuestionSetAction}>
              <input name="question_set_id" type="hidden" value={questionSet.id} />
              <ConfirmSubmitButton
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-danger bg-danger/10 px-3 text-sm font-semibold text-danger transition hover:bg-danger/15"
                message="ลบชุดคำถามนี้? ถ้ามีห้องที่จบแล้วค้างอยู่ ระบบจะล้างข้อมูลรอบเล่นเก่าของชุดนี้ด้วย"
              >
                <Trash2 size={17} />
                ลบชุดคำถามนี้
              </ConfirmSubmitButton>
            </LoadingForm>
          </div>
        </div>

        {query.error ? (
          <div className="rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {query.error}
          </div>
        ) : null}
        {query.notice ? (
          <div className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-medium text-success">
            {query.notice}
          </div>
        ) : null}

        <Panel>
          <AddQuestionForm key={questionSet.id} questionSetId={questionSet.id} />
        </Panel>

        <LoadingForm id="bulk-delete-questions" action={deleteSelectedQuestionsAction}>
          <input name="question_set_id" type="hidden" value={questionSet.id} />
        </LoadingForm>

        {questionSet.questions.length > 0 ? <BulkDeleteBar /> : null}

        <div className="space-y-4">
          {questionSet.questions.map((question, index) => (
            <QuestionItemCard
              index={index}
              key={question.id}
              question={question}
              questionSetId={questionSet.id}
            />
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
