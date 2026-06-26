import { z } from "zod";

export const roomCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "รหัสห้องต้องเป็นตัวเลข 4 หลัก");

export const createRoomSchema = z.object({
  questionSetId: z.string().uuid(),
  activityName: z.string().trim().max(80).optional(),
  teamCount: z.coerce.number().int().min(1).max(12),
  maxMembersPerTeam: z.coerce.number().int().min(1).max(12),
});
