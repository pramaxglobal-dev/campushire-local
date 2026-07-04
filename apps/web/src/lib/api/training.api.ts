import type {
  Course,
  CourseEnrollment,
  CourseLevel,
  CourseMode,
  PaginatedResponse,
  TrainingPartnerProfile
} from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse } from "@/lib/api/client";

export interface CourseFilters {
  level?: CourseLevel;
  mode?: CourseMode;
  skillsCovered?: string[] | string;
  search?: string;
  trainingPartnerId?: string;
  page?: number;
  limit?: number;
}

export interface CreateCourseDto {
  title: string;
  description: string;
  skillsCovered: string[];
  durationHours?: number;
  price: number;
  currency?: string;
  seats?: number;
  level: CourseLevel;
  mode: CourseMode;
}

export type UpdateCourseDto = Partial<CreateCourseDto>;

export interface TrainingStats {
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  completionRate: number;
}

export interface CourseWithPartner extends Course {
  trainingPartner: TrainingPartnerProfile;
  enrollmentCount: number;
}

export interface CourseEnrollmentWithCourse extends CourseEnrollment {
  course: Course & { trainingPartnerProfile: TrainingPartnerProfile };
}

export const listCourses = async (
  filters: CourseFilters
): Promise<PaginatedResponse<Course[]>> => {
  const response = await apiClient.get("/api/courses", { params: filters });
  return unwrapPaginatedResponse(response);
};

export const getCourse = async (
  courseId: string
): Promise<CourseWithPartner> => {
  const response = await apiClient.get(`/api/courses/${courseId}`);
  return unwrapResponse(response);
};

export const createCourse = async (dto: CreateCourseDto): Promise<Course> => {
  const response = await apiClient.post("/api/courses", dto);
  return unwrapResponse(response);
};

export const updateCourse = async (courseId: string, dto: UpdateCourseDto): Promise<Course> => {
  const response = await apiClient.put(`/api/courses/${courseId}`, dto);
  return unwrapResponse(response);
};

export const publishCourse = async (courseId: string): Promise<Course> => {
  const response = await apiClient.post(`/api/courses/${courseId}/publish`);
  return unwrapResponse(response);
};

export const unpublishCourse = async (courseId: string): Promise<Course> => {
  const response = await apiClient.post(`/api/courses/${courseId}/unpublish`);
  return unwrapResponse(response);
};

export const enrollInCourse = async (courseId: string): Promise<CourseEnrollment> => {
  const response = await apiClient.post(`/api/courses/${courseId}/enroll`);
  return unwrapResponse(response);
};

export const updateEnrollmentProgress = async (
  enrollmentId: string,
  progressPct: number
): Promise<CourseEnrollment> => {
  const response = await apiClient.patch(`/api/courses/${enrollmentId}/progress`, { progressPct });
  return unwrapResponse(response);
};

export const getMyEnrollments = async (): Promise<CourseEnrollmentWithCourse[]> => {
  const response = await apiClient.get("/api/courses/my-enrollments");
  return unwrapResponse(response);
};

export const getPartnerCourses = async (): Promise<Course[]> => {
  const response = await apiClient.get("/api/training/courses");
  return unwrapResponse(response);
};

export const getPartnerStats = async (): Promise<TrainingStats> => {
  const response = await apiClient.get("/api/training/stats");
  return unwrapResponse(response);
};
