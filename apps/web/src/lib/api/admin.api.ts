import type { ActivityLog, FeatureFlag, PaginatedResponse, PlatformSetting, Tenant, UserRole, Plan } from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";
import type { SafeUser } from "@/lib/api/auth.api";
import type { FullUserProfile } from "@/lib/utils/profile-types";

export interface AdminUserFilters {
  role?: UserRole;
  isApproved?: boolean;
  isSuspended?: boolean;
  tenantId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PendingApproval {
  user: SafeUser;
  profile: Record<string, unknown> | null;
  role: UserRole;
}

export interface PlatformStats {
  usersByRole: Record<UserRole, number>;
  totalTenants: number;
  totalJobs: number;
  totalApplications: number;
  newSignupsLast7Days: number;
}

export interface BroadcastDto {
  title: string;
  body: string;
  type?: string;
  channel?: string;
  roles?: UserRole[];
}

export interface FeatureFlagListItem {
  key: string;
  isEnabled: boolean;
  enabledForPlans: Plan[];
  description: string | null;
}

export interface AuditLogView extends ActivityLog {
  user: { firstName: string; lastName: string; email: string } | null;
  tenant: { name: string } | null;
}

export const listUsers = async (
  params: AdminUserFilters
): Promise<PaginatedResponse<SafeUser[]>> => {
  const response = await apiClient.get("/api/admin/users", { params });
  return unwrapPaginatedResponse(response);
};

export const getUserDetail = async (id: string): Promise<FullUserProfile> => {
  const response = await apiClient.get(`/api/admin/users/${id}`);
  return unwrapResponse(response);
};

export const approveUser = async (id: string): Promise<SafeUser> => {
  const response = await apiClient.post(`/api/admin/users/${id}/approve`);
  return unwrapResponse(response);
};

export const rejectUser = async (id: string, reason: string): Promise<SafeUser> => {
  const response = await apiClient.post(`/api/admin/users/${id}/reject`, { reason });
  return unwrapResponse(response);
};

export const suspendUser = async (id: string, reason: string): Promise<SafeUser> => {
  const response = await apiClient.post(`/api/admin/users/${id}/suspend`, { reason });
  return unwrapResponse(response);
};

export const unsuspendUser = async (id: string): Promise<SafeUser> => {
  const response = await apiClient.post(`/api/admin/users/${id}/unsuspend`);
  return unwrapResponse(response);
};

export const getPendingApprovals = async (): Promise<PendingApproval[]> => {
  const response = await apiClient.get("/api/admin/pending-approvals");
  return unwrapResponse(response);
};

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const response = await apiClient.get("/api/admin/stats");
  return unwrapResponse(response);
};

export const listTenants = async (
  params: Record<string, unknown>
): Promise<PaginatedResponse<Tenant[]>> => {
  const response = await apiClient.get("/api/tenants", { params });
  return unwrapPaginatedResponse(response);
};

export const createTenant = async (payload: Partial<Tenant>): Promise<Tenant> => {
  const response = await apiClient.post("/api/tenants", payload);
  return unwrapResponse(response);
};

export const updateTenant = async (id: string, payload: Partial<Tenant>): Promise<Tenant> => {
  const response = await apiClient.put(`/api/tenants/${id}`, payload);
  return unwrapResponse(response);
};

export const toggleTenantActive = async (id: string): Promise<Tenant> => {
  const response = await apiClient.patch(`/api/tenants/${id}/toggle`);
  return unwrapResponse(response);
};

export const listPlatformSettings = async (): Promise<PlatformSetting[]> => {
  const response = await apiClient.get("/api/admin/settings");
  return unwrapResponse(response);
};

export const listAuditLogs = async (): Promise<AuditLogView[]> => {
  const response = await apiClient.get("/api/admin/audit-logs");
  return unwrapResponse(response);
};

export const updatePlatformSetting = async (key: string, value: string): Promise<PlatformSetting> => {
  const response = await apiClient.put(`/api/admin/settings/${key}`, { value });
  return unwrapResponse(response);
};

export const toggleFeatureFlag = async (key: string): Promise<FeatureFlag> => {
  const response = await apiClient.patch(`/api/admin/feature-flags/${key}`);
  return unwrapResponse(response);
};

export const listFeatureFlags = async (): Promise<FeatureFlagListItem[]> => {
  const response = await apiClient.get("/api/admin/feature-flags");
  return unwrapResponse(response);
};

export const broadcastNotification = async (dto: BroadcastDto): Promise<void> => {
  const response = await apiClient.post("/api/admin/broadcast", dto);
  unwrapVoidResponse(response);
};
