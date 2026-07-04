import { z } from "zod";
import { Plan } from "@campushire/types";

export const TenantListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional()
});

export const TenantParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const CreateTenantSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(120).optional(),
  plan: z.nativeEnum(Plan).default(Plan.FREE),
  isWhiteLabel: z.boolean().default(false),
  primaryDomain: z.string().trim().min(3).max(255).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().trim().min(10).max(20).optional(),
  timezone: z.string().trim().min(2).max(80).default("Asia/Kolkata"),
  country: z.string().trim().min(2).max(80).default("India"),
  settings: z.record(z.unknown()).optional()
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

export type TenantListQueryDto = z.infer<typeof TenantListQuerySchema>;
export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;