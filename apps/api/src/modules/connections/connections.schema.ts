import { z } from "zod";
import { ConnectionStatus } from "@campushire/types";

export const RequestConnectionSchema = z.object({
  collegeId: z.string().trim().min(1),
  message: z.string().trim().min(1).max(1000)
});

export const RespondConnectionSchema = z.object({
  action: z.enum(["approve", "reject"])
});

export const ConnectionIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const ConnectionStatusQuerySchema = z.object({
  status: z.nativeEnum(ConnectionStatus).optional()
});

export const ConnectionPairParamSchema = z.object({
  recruiterId: z.string().trim().min(1),
  collegeId: z.string().trim().min(1)
});

export const BrowseCollegeQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type RequestConnectionDto = z.infer<typeof RequestConnectionSchema>;
export type RespondConnectionDto = z.infer<typeof RespondConnectionSchema>;
export type BrowseCollegeQueryDto = z.infer<typeof BrowseCollegeQuerySchema>;
