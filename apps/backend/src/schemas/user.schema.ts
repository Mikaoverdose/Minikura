import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "user"]).optional(),
});

export const updateSuspensionSchema = z.object({
  isSuspended: z.boolean(),
  suspendedUntil: z.iso.datetime({ offset: true }).nullable().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateSuspensionInput = z.infer<typeof updateSuspensionSchema>;
