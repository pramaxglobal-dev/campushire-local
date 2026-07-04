import { z } from "zod";
import {
  InterviewMode,
  InterviewOutcome,
  InterviewRound,
  InterviewStatus
} from "@campushire/types";

export const ScheduleInterviewSchema = z.object({
  applicationId: z.string().trim().min(1),
  round: z.nativeEnum(InterviewRound),
  interviewDate: z.coerce.date(),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  mode: z.nativeEnum(InterviewMode),
  meetingLink: z.string().trim().url().optional(),
  venue: z.string().trim().max(300).optional()
});

export const RescheduleSchema = z.object({
  interviewDate: z.coerce.date(),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  meetingLink: z.string().trim().url().optional(),
  venue: z.string().trim().max(300).optional()
});

export const CancelInterviewSchema = z.object({
  reason: z.string().trim().min(1).max(2000)
});

export const RecordOutcomeSchema = z.object({
  outcome: z.nativeEnum(InterviewOutcome),
  note: z.string().trim().max(2000).optional()
});

export const InterviewFiltersSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.nativeEnum(InterviewStatus).optional(),
  round: z.nativeEnum(InterviewRound).optional()
});

export const InterviewIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export type ScheduleInterviewDto = z.infer<typeof ScheduleInterviewSchema>;
export type RescheduleDto = z.infer<typeof RescheduleSchema>;
export type InterviewFilters = z.infer<typeof InterviewFiltersSchema>;
