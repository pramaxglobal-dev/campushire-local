import type {
  InterviewMode,
  InterviewOutcome,
  InterviewRound,
  InterviewSlot,
  InterviewStatus
} from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

export interface ScheduleInterviewDto {
  applicationId: string;
  round: InterviewRound;
  interviewDate: string;
  startTime: string;
  endTime: string;
  mode: InterviewMode;
  meetingLink?: string;
  venue?: string;
}

export interface InterviewFilters {
  startDate?: string;
  endDate?: string;
  status?: InterviewStatus;
  round?: InterviewRound;
}

export interface RescheduleDto {
  interviewDate: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
  venue?: string;
}

export const scheduleInterview = async (dto: ScheduleInterviewDto): Promise<InterviewSlot> => {
  const response = await apiClient.post("/api/interviews", dto);
  return unwrapResponse(response);
};

export const getInterviews = async (filters?: InterviewFilters): Promise<InterviewSlot[]> => {
  const response = await apiClient.get("/api/interviews", { params: filters });
  return unwrapResponse(response);
};

export const rescheduleInterview = async (id: string, dto: RescheduleDto): Promise<InterviewSlot> => {
  const response = await apiClient.patch(`/api/interviews/${id}/reschedule`, dto);
  return unwrapResponse(response);
};

export const cancelInterview = async (id: string, reason: string): Promise<InterviewSlot> => {
  const response = await apiClient.patch(`/api/interviews/${id}/cancel`, { reason });
  return unwrapResponse(response);
};

export const confirmInterview = async (id: string): Promise<InterviewSlot> => {
  const response = await apiClient.patch(`/api/interviews/${id}/confirm`);
  return unwrapResponse(response);
};

export const recordOutcome = async (
  id: string,
  outcome: InterviewOutcome,
  note?: string
): Promise<InterviewSlot> => {
  const response = await apiClient.patch(`/api/interviews/${id}/outcome`, { outcome, note });
  return unwrapResponse(response);
};
