import type { ApplicationStatus } from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

export interface ApplicationCard {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: string;
  location: string | null;
}

export interface ApplicationsResponse {
  success: boolean;
  data: ApplicationCard[];
  error: string | null;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const applyToJob = async (
  jobId: string,
  payload: { coverNote?: string; answers?: Record<string, string> } = {}
): Promise<void> => {
  await apiClient.post("/api/applications", { jobId, ...payload });
};

export const getMyApplications = async (
  page = 1,
  limit = 20,
  status?: ApplicationStatus
): Promise<ApplicationsResponse> => {
  const response = await apiClient.get("/api/applications", {
    params: { page, limit, status }
  });
  return unwrapResponse(response);
};
