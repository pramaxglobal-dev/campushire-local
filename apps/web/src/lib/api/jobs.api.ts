import type {
  CommissionTrigger,
  CommissionType,
  Job,
  JobStatus,
  JobType,
  PaginatedResponse,
  WorkMode
} from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";

export type JobCard = Omit<Job, "applicationDeadline"> & {
  company: string;
  logo: string | null;
  salaryRange: string | null;
  skills: string[];
  postedAt: string | Date;
  applicationDeadline: string | Date | null;
  hasApplied: boolean;
  hasSaved: boolean;
  matchScore: number;
  isFeatured: boolean;
};

export type JobDetail = Omit<Job, "screeningQuestions" | "applicationDeadline"> & {
  company: string;
  logo: string | null;
  salaryRange: string | null;
  skills: string[];
  postedAt: string | Date;
  applicationDeadline: string | Date | null;
  hasApplied: boolean;
  hasSaved: boolean;
  matchScore: number;
  description: string;
  screeningQuestions: ScreeningQuestion[];
  recruiterProfile: Record<string, unknown>;
  applyCount: number;
  viewCount: number;
  isFeatured: boolean;
};

export interface JobFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: JobStatus;
  sortBy?: "newest" | "salary" | "relevance";
  sortOrder?: "asc" | "desc";
  workMode?: WorkMode;
  jobType?: JobType;
  locationCity?: string;
  locationState?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[] | string;
  myJobsOnly?: boolean;
  hasCommission?: boolean;
}

export interface SkillRequirement {
  name: string;
  isMandatory: boolean;
}

export interface ScreeningQuestion {
  question: string;
  type: "text" | "select" | "yes-no" | string;
  isRequired: boolean;
  options?: string[];
}

export interface CreateJobDto {
  title: string;
  description: string;
  jobType: JobType;
  workMode: WorkMode;
  locationCity?: string;
  locationState?: string;
  salaryMin?: number;
  salaryMax?: number;
  skillsRequired?: SkillRequirement[];
  openings?: number;
  experienceMin?: number;
  experienceMax?: number;
  applicationDeadline?: string;
  screeningQuestions?: ScreeningQuestion[];
  targetCollegeIds?: string[];
  commissionPct?: number;
  commissionType?: CommissionType;
  commissionTrigger?: CommissionTrigger;
  status?: JobStatus;
}

export type UpdateJobDto = Partial<CreateJobDto>;

export const listJobs = async (filters: JobFilters): Promise<PaginatedResponse<JobCard[]>> => {
  const response = await apiClient.get("/api/jobs", { params: filters });
  return unwrapPaginatedResponse(response);
};

export const getJobFeed = async (page: number, limit: number): Promise<PaginatedResponse<JobCard[]>> => {
  const response = await apiClient.get("/api/jobs/feed", { params: { page, limit } });
  return unwrapPaginatedResponse(response);
};

export const getJob = async (id: string): Promise<JobDetail> => {
  const response = await apiClient.get(`/api/jobs/${id}`);
  return unwrapResponse(response);
};

export const saveJob = async (id: string): Promise<void> => {
  const response = await apiClient.post(`/api/jobs/${id}/save`);
  unwrapVoidResponse(response);
};

export const unsaveJob = async (id: string): Promise<void> => {
  const response = await apiClient.delete(`/api/jobs/${id}/save`);
  unwrapVoidResponse(response);
};

export const getSavedJobs = async (page: number): Promise<PaginatedResponse<JobCard[]>> => {
  const response = await apiClient.get("/api/jobs/saved", { params: { page, limit: 20 } });
  return unwrapPaginatedResponse(response);
};

export const createJob = async (dto: CreateJobDto): Promise<Job> => {
  const response = await apiClient.post("/api/jobs", dto);
  return unwrapResponse(response);
};

export const updateJob = async (id: string, dto: UpdateJobDto): Promise<Job> => {
  const response = await apiClient.put(`/api/jobs/${id}`, dto);
  return unwrapResponse(response);
};

export const submitJobForApproval = async (id: string): Promise<Job> => {
  const response = await apiClient.post(`/api/jobs/${id}/submit`);
  return unwrapResponse(response);
};

export const getRecruiterJobStats = async (): Promise<{
  byStatus: Record<JobStatus, number>;
  totalViews: number;
  totalApplications: number;
  topJob: { id: string; title: string; applications: number } | null;
}> => {
  const response = await apiClient.get("/api/jobs/stats");
  return unwrapResponse(response);
};

export const approveJob = async (id: string): Promise<Job> => {
  const response = await apiClient.post(`/api/jobs/${id}/approve`);
  return unwrapResponse(response);
};

export const rejectJob = async (id: string, reason: string): Promise<Job> => {
  const response = await apiClient.post(`/api/jobs/${id}/reject`, { reason });
  return unwrapResponse(response);
};
