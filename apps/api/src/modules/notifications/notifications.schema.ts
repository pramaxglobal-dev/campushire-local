import { z } from "zod";
import { NotificationChannel, NotificationType } from "@campushire/types";

export const NotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional()
});

export const NotificationIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const UpdatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        type: z.nativeEnum(NotificationType),
        channel: z.nativeEnum(NotificationChannel),
        isEnabled: z.boolean()
      })
    )
    .min(1)
});

export type UpdatePreferencesDto = z.infer<typeof UpdatePreferencesSchema>;
