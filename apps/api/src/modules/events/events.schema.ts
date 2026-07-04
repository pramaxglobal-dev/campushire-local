import { z } from "zod";
import { EventStatus, EventType } from "@campushire/types";

export const CreateEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  eventType: z.nativeEnum(EventType),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  venue: z.string().trim().max(300).optional(),
  isOpenToAll: z.boolean().optional(),
  maxParticipants: z.coerce.number().int().positive().optional(),
  registrationDeadline: z.coerce.date().optional(),
  recruiterProfileId: z.string().trim().min(1).optional()
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const EventIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const AttendanceParamSchema = z.object({
  id: z.string().trim().min(1),
  userId: z.string().trim().min(1)
});

export const MarkAttendanceBodySchema = z.object({
  attended: z.boolean()
});

export const EventFiltersSchema = z.object({
  collegeId: z.string().trim().min(1).optional(),
  eventType: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateEventDto = z.infer<typeof CreateEventSchema>;
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;
export type EventFilters = z.infer<typeof EventFiltersSchema>;
