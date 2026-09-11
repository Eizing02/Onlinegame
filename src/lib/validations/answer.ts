import { z } from "zod";

export const submitAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  participantId: z.string().uuid(),
  teamId: z.string().uuid(),
  answerText: z.string().trim().min(1).max(2000),
});
