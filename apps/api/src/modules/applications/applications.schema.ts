import { z } from "zod";
import { ApplicationStatus } from "@campushire/types";

export const ApplySchema = z.object({
  jobId: z.string().trim().min(1),
  coverNote: z.string().trim().max(4000).optional(),
  answers: z.record(z.string(), z.string()).optional()
});

export const ApplicationIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const ApplicationFiltersSchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const AddNoteSchema = z.object({
  note: z.string().trim().min(1).max(4000)
});

export type ApplyDto = z.infer<typeof ApplySchema>;
export type AppFilters = z.infer<typeof ApplicationFiltersSchema>;
