import { getSession } from "@/lib/auth/session";
import { getLocalQuestionSetSummaries } from "@/lib/data/question-bank";

export type QuestionSetSummary = {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  totalPoints: number;
  isDemo?: boolean;
};

export type TeacherDataState =
  | {
      status: "unauthenticated";
      questionSets: QuestionSetSummary[];
    }
  | {
      status: "ready";
      questionSets: QuestionSetSummary[];
    };

export async function getTeacherQuestionSets(): Promise<TeacherDataState> {
  const session = await getSession();

  if (!session || session.role !== "teacher") {
    return {
      status: "unauthenticated",
      questionSets: [],
    };
  }

  return {
    status: "ready",
    questionSets: await getLocalQuestionSetSummaries(session.userCode),
  };
}
