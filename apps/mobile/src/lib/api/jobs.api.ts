import type { JobStatus, JobType, WorkMode } from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

export interface JobCard {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workMode: WorkMode;
  jobType: JobType;
  salaryRange: string | null;
  skills: string[];
  hasApplied: boolean;
  hasSaved: boolean;
  matchScore: number;
}

export interface JobDetail extends JobCard {
  description: string;
  screeningQuestions: Array<{ question: string; type: string; isRequired: boolean }>;
  applicationDeadline: string | null;
  openings: number;
}

export interface JobsResponse {
  success: boolean;
  data: JobCard[];
  error: string | null;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface JobFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: JobStatus;
  jobType?: JobType;
  workMode?: WorkMode;
  locationCity?: string;
}

export const listJobs = async (filters: JobFilters): Promise<JobsResponse> => {
  const response = await apiClient.get("/api/jobs", { params: filters });
  return unwrapResponse(response);
};

export const getJobFeed = async (page = 1, limit = 20): Promise<JobsResponse> => {
  const response = await apiClient.get("/api/jobs/feed", { params: { page, limit } });
  return unwrapResponse(response);
};

export const getJob = async (jobId: string): Promise<JobDetail> => {
  const response = await apiClient.get(`/api/jobs/${jobId}`);
  return unwrapResponse(response);
};

export const saveJob = async (jobId: string): Promise<void> => {
  await apiClient.post(`/api/jobs/${jobId}/save`);
};

export const unsaveJob = async (jobId: string): Promise<void> => {
  await apiClient.delete(`/api/jobs/${jobId}/save`);
};
