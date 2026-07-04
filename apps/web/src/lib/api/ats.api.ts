import type { Application, ApplicationStatus, PaginatedResponse } from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse } from "@/lib/api/client";

export interface ATSCandidateCard {
  id: string;
  candidateName: string;
  avatarUrl: string | null;
  tin: string;
  college: string | null;
  cgpa: number | null;
  skills: string[];
  matchScore: number;
  appliedAt: string | Date;
  status: ApplicationStatus;
}

export type KanbanBoard = Record<ApplicationStatus, ATSCandidateCard[]>;

export interface ATSFilters {
  status?: ApplicationStatus;
  search?: string;
  minScore?: number;
  college?: string;
  page?: number;
  limit?: number;
}

export interface ATSStats {
  totalApplications: number;
  byStage: Record<ApplicationStatus, number>;
  conversionRate: number;
  avgTimeInStage: Record<ApplicationStatus, number>;
  topColleges: Array<{ college: string; count: number }>;
}

export interface ATSApplicationDetail extends Application {
  candidate: Record<string, unknown>;
  statusHistory: Array<Record<string, unknown>>;
  interviewSlots: Array<Record<string, unknown>>;
  matchScore: number;
  college: string | null;
}

export const getKanbanBoard = async (jobId: string): Promise<KanbanBoard> => {
  const response = await apiClient.get(`/api/ats/board/${jobId}`);
  return unwrapResponse(response);
};

export const moveApplication = async (
  id: string,
  dto: { toStatus: ApplicationStatus; note?: string }
): Promise<Application> => {
  const response = await apiClient.patch(`/api/ats/applications/${id}/move`, dto);
  return unwrapResponse(response);
};

export const bulkMoveApplications = async (
  ids: string[],
  toStatus: ApplicationStatus,
  note?: string
): Promise<Application[]> => {
  const response = await apiClient.post("/api/ats/applications/bulk-move", {
    applicationIds: ids,
    toStatus,
    note
  });
  return unwrapResponse(response);
};

export const getApplicationsForJob = async (
  jobId: string,
  filters: ATSFilters
): Promise<PaginatedResponse<ATSApplicationDetail[]>> => {
  const response = await apiClient.get(`/api/ats/applications/${jobId}`, { params: filters });
  return unwrapPaginatedResponse(response);
};

export const rejectApplication = async (id: string, reason: string): Promise<Application> => {
  const response = await apiClient.patch(`/api/ats/applications/${id}/reject`, { reason });
  return unwrapResponse(response);
};

export const downloadResume = async (id: string): Promise<{ url: string }> => {
  const response = await apiClient.get(`/api/ats/applications/${id}/resume`);
  return unwrapResponse(response);
};

export const getATSStats = async (jobId?: string): Promise<ATSStats> => {
  const response = await apiClient.get("/api/ats/stats", { params: { jobId } });
  return unwrapResponse(response);
};
