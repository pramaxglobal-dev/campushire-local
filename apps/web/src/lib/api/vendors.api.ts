import type {
  PaginatedResponse,
  ServiceRequest,
  ServiceRequestStatus,
  ServiceRequestType,
  VendorProfile,
  VendorType
} from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse } from "@/lib/api/client";

export interface VendorFilters {
  vendorType?: VendorType;
  city?: string;
  state?: string;
  isVerified?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateServiceRequestDto {
  vendorId: string;
  requestType: ServiceRequestType;
  title: string;
  description: string;
  candidateUserIds: string[];
  documentsRequired: string[];
  deadline?: string;
}

export interface UpdateServiceRequestDto {
  title?: string;
  description?: string;
  expectedCost?: number;
  finalCost?: number;
  dueDate?: string;
  status?: ServiceRequestStatus;
  payload?: Record<string, unknown>;
}

export interface VendorStats {
  totalRequests: number;
  completedRequests: number;
  avgRating: number;
  totalRevenue: number;
}

export const listVendors = async (
  filters: VendorFilters
): Promise<PaginatedResponse<VendorProfile[]>> => {
  const response = await apiClient.get("/api/vendors", { params: filters });
  return unwrapPaginatedResponse(response);
};

export const getVendorDetail = async (
  vendorId: string
): Promise<VendorProfile & { recentReviews: ServiceRequest[] }> => {
  const response = await apiClient.get(`/api/vendors/${vendorId}`);
  return unwrapResponse(response);
};

export const createServiceRequest = async (dto: CreateServiceRequestDto): Promise<ServiceRequest> => {
  const response = await apiClient.post("/api/service-requests", dto);
  return unwrapResponse(response);
};

export const getMyServiceRequests = async (
  page = 1,
  limit = 20,
  status?: ServiceRequestStatus
): Promise<PaginatedResponse<ServiceRequest[]>> => {
  const response = await apiClient.get("/api/service-requests", {
    params: { page, limit, status }
  });
  return unwrapPaginatedResponse(response);
};

export const updateServiceRequest = async (
  requestId: string,
  dto: UpdateServiceRequestDto
): Promise<ServiceRequest> => {
  const response = await apiClient.put(`/api/service-requests/${requestId}`, dto);
  return unwrapResponse(response);
};

export const respondToServiceRequest = async (
  requestId: string,
  action: "accept" | "reject",
  note?: string
): Promise<ServiceRequest> => {
  const response = await apiClient.patch(`/api/service-requests/${requestId}/respond`, {
    action,
    note
  });
  return unwrapResponse(response);
};

export const completeServiceRequest = async (
  requestId: string,
  note: string
): Promise<ServiceRequest> => {
  const response = await apiClient.patch(`/api/service-requests/${requestId}/complete`, { note });
  return unwrapResponse(response);
};

export const rateVendor = async (
  requestId: string,
  rating: number,
  review: string
): Promise<ServiceRequest> => {
  const response = await apiClient.post(`/api/service-requests/${requestId}/rate`, {
    rating,
    review
  });
  return unwrapResponse(response);
};

export const getVendorStats = async (): Promise<VendorStats> => {
  const response = await apiClient.get("/api/vendors/stats");
  return unwrapResponse(response);
};
