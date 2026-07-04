import { z } from "zod";
import { ApplicationStatus } from "@campushire/types";

export const MoveApplicationSchema = z.object({
  toStatus: z.nativeEnum(ApplicationStatus),
  note: z.string().trim().max(2000).optional()
});

export const BulkMoveSchema = z.object({
  applicationIds: z.array(z.string().trim().min(1)).min(1),
  toStatus: z.nativeEnum(ApplicationStatus),
  note: z.string().trim().max(2000).optional()
});

export const AtsFiltersSchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  search: z.string().trim().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  college: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const JobIdParamSchema = z.object({
  jobId: z.string().trim().min(1)
});

export const ApplicationIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const RejectSchema = z.object({
  reason: z.string().trim().min(1).max(2000)
});

export const AtsStatsQuerySchema = z.object({
  jobId: z.string().trim().optional()
});

export type MoveApplicationDto = z.infer<typeof MoveApplicationSchema>;
export type ATSFilters = z.infer<typeof AtsFiltersSchema>;
