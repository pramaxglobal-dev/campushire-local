import { z } from "zod";

export const CreateInviteSchema = z.object({
  maxUses: z.coerce.number().int().positive().max(500).optional(),
  expiresAt: z.coerce.date().optional()
});

export const InviteIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const InviteCodeParamSchema = z.object({
  code: z.string().trim().min(1)
});

export type CreateInviteDto = z.infer<typeof CreateInviteSchema>;
