import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { parseImportedAccounts } from "./lib/account-import.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const envFile = readFileSync(envPath, "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex);
    const value = trimmedLine.slice(separatorIndex + 1);
    process.env[key] ??= value;
  }
}

loadLocalEnv();

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

const supabaseUrl = firstEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
const serviceRoleKey = firstEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
);

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing Supabase URL or service role key. Set NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function readAccounts(filePath) {
  return parseImportedAccounts(await readFile(filePath, "utf8"));
}

async function seedAccounts() {
  const accountsPath = path.join(rootDir, "data", "student.csv");
  const accounts = await readAccounts(accountsPath);

  if (accounts.length === 0) {
    console.log("No accounts to seed.");
    return;
  }

  const { error } = await supabase
    .from("accounts")
    .upsert(accounts, { onConflict: "user_code" });

  if (error) {
    throw error;
  }

  console.log(`Seeded ${accounts.length} accounts.`);
}

async function seedQuestionSets() {
  const questionSetsPath = path.join(rootDir, "data", "question-sets.json");
  const raw = await readFile(questionSetsPath, "utf8").catch(() => "[]");
  const questionSets = JSON.parse(raw);

  for (const set of questionSets) {
    const { error: setError } = await supabase.from("question_sets").upsert(
      {
        id: set.id,
        teacher_code: String(set.teacherCode).toUpperCase(),
        title: set.title,
        description: set.description,
        created_at: set.createdAt,
        updated_at: set.updatedAt,
      },
      { onConflict: "id" },
    );

    if (setError) {
      throw setError;
    }

    const questions = (set.questions ?? []).map((question) => ({
      id: question.id,
      question_set_id: set.id,
      question_text: question.questionText,
      correct_answer: question.correctAnswer,
      points: question.points,
      time_limit_seconds: question.timeLimitSeconds,
      order_index: question.orderIndex,
      created_at: question.createdAt,
    }));

    if (questions.length > 0) {
      const { error: questionsError } = await supabase
        .from("questions")
        .upsert(questions, { onConflict: "id" });

      if (questionsError) {
        throw questionsError;
      }
    }

    console.log(`Seeded question set: ${set.title}`);
  }
}

await seedAccounts();
await seedQuestionSets();
console.log("Supabase seed complete.");
