import { z } from "zod";

export const WhiteLabelTenantQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional()
});

export const WhiteLabelConfigSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  brandName: z.string().trim().min(2).max(200),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6})$/, "primaryColor must be a hex color")
    .default("#1B3A6B"),
  accentColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6})$/, "accentColor must be a hex color")
    .default("#0EA5E9"),
  fontFamily: z.string().trim().max(120).optional(),
  customDomain: z.string().trim().max(255).optional(),
  senderName: z.string().trim().max(120).optional(),
  senderEmail: z.string().email().optional(),
  showPoweredBy: z.boolean().default(true),
  customCss: z.string().trim().max(20000).optional()
});

export const PublishSchema = z.object({
  tenantId: z.string().trim().min(1).optional()
});

export type WhiteLabelConfigDto = z.infer<typeof WhiteLabelConfigSchema>;
export type WhiteLabelTenantQueryDto = z.infer<typeof WhiteLabelTenantQuerySchema>;