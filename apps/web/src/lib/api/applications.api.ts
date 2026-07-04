import type { Application, ApplicationStatus, InterviewSlot, PaginatedResponse } from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";

export interface ApplyDto {
  jobId?: string;
  coverNote?: string;
  screeningAnswers?: Record<string, unknown>;
}

export interface AppFilters {
  page?: number;
  limit?: number;
  status?: ApplicationStatus;
}

export interface ApplicationCard extends Application {
  jobTitle: string;
  company: string;
  location: string | null;
}

export interface ApplicationDetail extends Application {
  job: Record<string, unknown>;
  candidate: Record<string, unknown>;
  statusHistory: Array<Record<string, unknown>>;
  interviewSlots: InterviewSlot[];
}

export const applyToJob = async (jobId: string, dto: ApplyDto): Promise<Application> => {
  const response = await apiClient.post("/api/applications", {
    jobId,
    coverNote: dto.coverNote,
    answers: dto.screeningAnswers as Record<string, string> | undefined
  });
  return unwrapResponse(response);
};

export const getMyApplications = async (
  filters: AppFilters
): Promise<PaginatedResponse<ApplicationCard[]>> => {
  const response = await apiClient.get("/api/applications", { params: filters });
  return unwrapPaginatedResponse(response);
};

export const getApplicationDetail = async (id: string): Promise<ApplicationDetail> => {
  const response = await apiClient.get(`/api/applications/${id}`);
  return unwrapResponse(response);
};

export const withdrawApplication = async (id: string): Promise<void> => {
  const response = await apiClient.post(`/api/applications/${id}/withdraw`);
  unwrapVoidResponse(response);
};

export const addCandidateNote = async (id: string, note: string): Promise<Application> => {
  const response = await apiClient.patch(`/api/applications/${id}/candidate-note`, { note });
  return unwrapResponse(response);
};

export const addRecruiterNote = async (id: string, note: string): Promise<Application> => {
  const response = await apiClient.patch(`/api/applications/${id}/recruiter-note`, { note });
  return unwrapResponse(response);
};
