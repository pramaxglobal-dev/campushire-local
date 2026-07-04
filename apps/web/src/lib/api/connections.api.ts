import type { ConnectionStatus, PaginatedResponse } from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";

export interface RecruiterConnection {
  id: string;
  status: ConnectionStatus;
  note: string | null;
  createdAt: string | Date;
  recruiterProfile?: {
    id: string;
    companyName: string;
    industry: string | null;
    logoUrl: string | null;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  collegeProfile?: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  };
}

export interface BrowseCollegeItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  openForPlacement: boolean;
  connectionStatus: ConnectionStatus | null;
}

export const listConnections = async (status?: ConnectionStatus): Promise<RecruiterConnection[]> => {
  const response = await apiClient.get("/api/connections", { params: { status } });
  return unwrapResponse(response);
};

export const requestConnection = async (payload: {
  collegeId: string;
  message: string;
}): Promise<RecruiterConnection> => {
  const response = await apiClient.post("/api/connections", payload);
  return unwrapResponse(response);
};

export const respondConnection = async (
  id: string,
  action: "approve" | "reject"
): Promise<RecruiterConnection> => {
  const response = await apiClient.patch(`/api/connections/${id}/respond`, { action });
  return unwrapResponse(response);
};

export const disconnectConnection = async (id: string): Promise<void> => {
  const response = await apiClient.delete(`/api/connections/${id}`);
  unwrapVoidResponse(response);
};

export const browseColleges = async (params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<BrowseCollegeItem[]>> => {
  const response = await apiClient.get("/api/connections/browse-colleges", { params });
  return unwrapPaginatedResponse(response);
};
