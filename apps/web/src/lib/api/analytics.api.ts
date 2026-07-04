import type {
  CollegeAnalytics,
  FreelanceAnalytics,
  PlatformAnalytics,
  RecruiterAnalytics,
  StudentAnalytics
} from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

interface DateRangeParams {
  from?: string;
  to?: string;
}

export const getStudentAnalytics = async (): Promise<StudentAnalytics> => {
  const response = await apiClient.get("/api/analytics/student");
  return unwrapResponse(response);
};

export const getRecruiterAnalytics = async (
  from?: string,
  to?: string
): Promise<RecruiterAnalytics> => {
  const params: DateRangeParams = { from, to };
  const response = await apiClient.get("/api/analytics/recruiter", { params });
  return unwrapResponse(response);
};

export const getCollegeAnalytics = async (
  from?: string,
  to?: string
): Promise<CollegeAnalytics> => {
  const params: DateRangeParams = { from, to };
  const response = await apiClient.get("/api/analytics/college", { params });
  return unwrapResponse(response);
};

export const getPlatformAnalytics = async (
  from?: string,
  to?: string
): Promise<PlatformAnalytics> => {
  const params: DateRangeParams = { from, to };
  const response = await apiClient.get("/api/analytics/platform", { params });
  return unwrapResponse(response);
};

export const getFreelanceAnalytics = async (): Promise<FreelanceAnalytics> => {
  const response = await apiClient.get("/api/analytics/freelance");
  return unwrapResponse(response);
};
