import { z } from "zod";
import { NotificationChannel, NotificationType, UserRole } from "@campushire/types";

export const AdminUserFilterSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  isApproved: z.coerce.boolean().optional(),
  isSuspended: z.coerce.boolean().optional(),
  tenantId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const UserIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const ReasonSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export const SettingKeyParamSchema = z.object({
  key: z.string().trim().min(1)
});

export const UpdatePlatformSettingSchema = z.object({
  value: z.string().trim().min(1)
});

export const FeatureFlagKeyParamSchema = z.object({
  key: z.string().trim().min(1)
});

export const BroadcastSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(2000),
  type: z.nativeEnum(NotificationType).default(NotificationType.SYSTEM),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.IN_APP),
  roles: z.array(z.nativeEnum(UserRole)).min(1).optional()
});

export type UserFilters = z.infer<typeof AdminUserFilterSchema>;
export type BroadcastDto = z.infer<typeof BroadcastSchema>;

export const BulkApproveStudentsSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "At least one user ID is required")
});

export const CohortDashboardFilterSchema = z.object({
  batchYear: z.coerce.number().int().min(1900).optional(),
  placementStatus: z.enum(["PLACED", "UNPLACED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type CohortDashboardFilters = z.infer<typeof CohortDashboardFilterSchema>;