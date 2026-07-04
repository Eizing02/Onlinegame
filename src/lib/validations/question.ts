import { z } from "zod";

export const questionSchema = z.object({
  questionSetId: z.string().uuid(),
  questionText: z.string().trim().min(1),
  correctAnswer: z.string().trim().min(1),
  questionType: z
    .enum(["short_text", "true_false", "multiple_choice"])
    .default("short_text"),
  options: z
    .array(
      z.object({
        optionText: z.string().trim().min(1),
        isCorrect: z.boolean(),
        orderIndex: z.coerce.number().int().min(0),
      }),
    )
    .default([]),
  points: z.coerce.number().int().min(0).max(1000),
  timeLimitSeconds: z.coerce.number().int().min(5).max(600),
  orderIndex: z.coerce.number().int().min(0),
});
