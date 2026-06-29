import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { isSupabaseDataBackend } from "@/lib/data/backend";
import {
  addSupabaseQuestion,
  createSupabaseQuestionSet,
  deleteSupabaseQuestion,
  deleteSupabaseQuestions,
  deleteSupabaseQuestionSet,
  getSupabaseQuestionSet,
  getSupabaseQuestionSetSummaries,
} from "@/lib/data/supabase-question-bank";

const QUESTION_BANK_FILE = path.join(
  process.cwd(),
  "data",
  "question-sets.json",
);
const QUESTION_BANK_GAME_SESSIONS_FILE = path.join(
  process.cwd(),
  "data",
  "game-sessions.json",
);

export type StoredQuestion = {
  id: string;
  questionText: string;
  correctAnswer: string;
  points: number;
  timeLimitSeconds: number;
  orderIndex: number;
  createdAt: string;
};

export type StoredQuestionSet = {
  id: string;
  teacherCode: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  questions: StoredQuestion[];
};

export type DeleteQuestionSetResult =
  | { ok: true }
  | {
      ok: false;
      reason: "active_room" | "not_found";
      activeRoomCode?: string;
    };

type QuestionSetGameSessionRef = {
  roomCode: string;
  teacherCode: string;
  questionSetId: string;
  status: string;
};

async function readQuestionBank() {
  try {
    const raw = await readFile(QUESTION_BANK_FILE, "utf8");
    return JSON.parse(raw) as StoredQuestionSet[];
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readQuestionBankGameSessions() {
  try {
    const raw = await readFile(QUESTION_BANK_GAME_SESSIONS_FILE, "utf8");
    return JSON.parse(raw) as QuestionSetGameSessionRef[];
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeQuestionBank(questionSets: StoredQuestionSet[]) {
  await mkdir(path.dirname(QUESTION_BANK_FILE), { recursive: true });
  await writeFile(
    QUESTION_BANK_FILE,
    `${JSON.stringify(questionSets, null, 2)}\n`,
    "utf8",
  );
}

async function writeQuestionBankGameSessions(
  gameSessions: QuestionSetGameSessionRef[],
) {
  await mkdir(path.dirname(QUESTION_BANK_GAME_SESSIONS_FILE), {
    recursive: true,
  });
  await writeFile(
    QUESTION_BANK_GAME_SESSIONS_FILE,
    `${JSON.stringify(gameSessions, null, 2)}\n`,
    "utf8",
  );
}

export async function getLocalQuestionSetSummaries(teacherCode: string) {
  if (isSupabaseDataBackend()) {
    return getSupabaseQuestionSetSummaries(teacherCode);
  }

  const questionSets = await readQuestionBank();

  return questionSets
    .filter((set) => set.teacherCode === teacherCode)
    .map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      questionCount: set.questions.length,
      totalPoints: set.questions.reduce(
        (sum, question) => sum + question.points,
        0,
      ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "th"));
}

export async function getLocalQuestionSet(
  teacherCode: string,
  questionSetId: string,
) {
  if (isSupabaseDataBackend()) {
    return getSupabaseQuestionSet(teacherCode, questionSetId);
  }

  const questionSets = await readQuestionBank();
  const questionSet = questionSets.find(
    (set) => set.teacherCode === teacherCode && set.id === questionSetId,
  );

  if (!questionSet) {
    return null;
  }

  return {
    ...questionSet,
    questions: [...questionSet.questions].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    ),
  };
}

export async function createLocalQuestionSet(
  teacherCode: string,
  title: string,
  description: string | null,
) {
  if (isSupabaseDataBackend()) {
    return createSupabaseQuestionSet(teacherCode, title, description);
  }

  const questionSets = await readQuestionBank();
  const now = new Date().toISOString();
  const questionSet: StoredQuestionSet = {
    id: randomUUID(),
    teacherCode,
    title,
    description,
    createdAt: now,
    updatedAt: now,
    questions: [],
  };

  questionSets.push(questionSet);
  await writeQuestionBank(questionSets);
  return questionSet;
}

export async function addLocalQuestion(
  teacherCode: string,
  questionSetId: string,
  question: Omit<StoredQuestion, "id" | "orderIndex" | "createdAt">,
) {
  if (isSupabaseDataBackend()) {
    return addSupabaseQuestion(teacherCode, questionSetId, question);
  }

  const questionSets = await readQuestionBank();
  const questionSet = questionSets.find(
    (set) => set.teacherCode === teacherCode && set.id === questionSetId,
  );

  if (!questionSet) {
    return null;
  }

  const now = new Date().toISOString();
  const nextQuestion: StoredQuestion = {
    id: randomUUID(),
    orderIndex: questionSet.questions.length,
    createdAt: now,
    ...question,
  };

  questionSet.questions.push(nextQuestion);
  questionSet.updatedAt = now;
  await writeQuestionBank(questionSets);
  return nextQuestion;
}

export async function deleteLocalQuestion(
  teacherCode: string,
  questionSetId: string,
  questionId: string,
) {
  if (isSupabaseDataBackend()) {
    return deleteSupabaseQuestion(teacherCode, questionSetId, questionId);
  }

  const questionSets = await readQuestionBank();
  const questionSet = questionSets.find(
    (set) => set.teacherCode === teacherCode && set.id === questionSetId,
  );

  if (!questionSet) {
    return false;
  }

  const nextQuestions = questionSet.questions
    .filter((question) => question.id !== questionId)
    .map((question, index) => ({
      ...question,
      orderIndex: index,
    }));

  if (nextQuestions.length === questionSet.questions.length) {
    return false;
  }

  questionSet.questions = nextQuestions;
  questionSet.updatedAt = new Date().toISOString();
  await writeQuestionBank(questionSets);
  return true;
}

export async function deleteLocalQuestions(
  teacherCode: string,
  questionSetId: string,
  questionIds: string[],
) {
  if (isSupabaseDataBackend()) {
    return deleteSupabaseQuestions(teacherCode, questionSetId, questionIds);
  }

  const uniqueQuestionIds = new Set(questionIds.filter(Boolean));

  if (uniqueQuestionIds.size === 0) {
    return false;
  }

  const questionSets = await readQuestionBank();
  const questionSet = questionSets.find(
    (set) => set.teacherCode === teacherCode && set.id === questionSetId,
  );

  if (!questionSet) {
    return false;
  }

  const nextQuestions = questionSet.questions
    .filter((question) => !uniqueQuestionIds.has(question.id))
    .map((question, index) => ({
      ...question,
      orderIndex: index,
    }));

  if (nextQuestions.length === questionSet.questions.length) {
    return false;
  }

  questionSet.questions = nextQuestions;
  questionSet.updatedAt = new Date().toISOString();
  await writeQuestionBank(questionSets);
  return true;
}

export async function deleteLocalQuestionSet(
  teacherCode: string,
  questionSetId: string,
): Promise<DeleteQuestionSetResult> {
  if (isSupabaseDataBackend()) {
    return deleteSupabaseQuestionSet(teacherCode, questionSetId);
  }

  const questionSets = await readQuestionBank();
  const targetQuestionSet = questionSets.find(
    (set) => set.teacherCode === teacherCode && set.id === questionSetId,
  );

  if (!targetQuestionSet) {
    return { ok: false, reason: "not_found" };
  }

  const gameSessions = await readQuestionBankGameSessions();
  const activeSession = gameSessions.find(
    (session) =>
      session.teacherCode === teacherCode &&
      session.questionSetId === questionSetId &&
      session.status !== "ended",
  );

  if (activeSession) {
    return {
      ok: false,
      reason: "active_room",
      activeRoomCode: activeSession.roomCode,
    };
  }

  const nextGameSessions = gameSessions.filter(
    (session) =>
      !(
        session.teacherCode === teacherCode &&
        session.questionSetId === questionSetId &&
        session.status === "ended"
      ),
  );
  const nextQuestionSets = questionSets.filter(
    (set) => !(set.teacherCode === teacherCode && set.id === questionSetId),
  );

  if (nextGameSessions.length !== gameSessions.length) {
    await writeQuestionBankGameSessions(nextGameSessions);
  }

  await writeQuestionBank(nextQuestionSets);
  return { ok: true };
}

