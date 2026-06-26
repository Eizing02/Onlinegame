import { z } from "zod";

export const questionSchema = z.object({
  questionSetId: z.string().uuid(),
  questionText: z.string().trim().min(1),
  correctAnswer: z.string().trim().min(1),
  points: z.coerce.number().int().min(0).max(1000),
  timeLimitSeconds: z.coerce.number().int().min(5).max(600),
  orderIndex: z.coerce.number().int().min(0),
});
