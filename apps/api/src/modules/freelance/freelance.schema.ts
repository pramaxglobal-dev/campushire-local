import { z } from "zod";
import { ReferralStatus } from "@campushire/types";

export const CreateReferralSchema = z
  .object({
    jobId: z.string().trim().min(1),
    candidateUserId: z.string().trim().min(1).optional(),
    candidateEmail: z.string().trim().email().optional(),
    candidateName: z.string().trim().min(1).max(120).optional(),
    candidatePhone: z.string().trim().min(8).max(20).optional()
  })
  .refine(
    (value) =>
      Boolean(value.candidateUserId) ||
      (Boolean(value.candidateEmail) &&
        Boolean(value.candidateName) &&
        Boolean(value.candidatePhone)),
    {
      message: "Provide candidateUserId or candidateEmail, candidateName and candidatePhone."
    }
  );

export const UpdateReferralStatusSchema = z.object({
  status: z.nativeEnum(ReferralStatus)
});

export const GenerateReferralLinkSchema = z.object({
  jobId: z.string().trim().min(1)
});

export const ReferralFiltersSchema = z.object({
  status: z.nativeEnum(ReferralStatus).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const InvoiceIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateReferralDto = z.infer<typeof CreateReferralSchema>;
export type ReferralFilters = z.infer<typeof ReferralFiltersSchema>;
