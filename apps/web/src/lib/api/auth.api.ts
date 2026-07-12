import type { UserRole } from "@campushire/types";
import { apiClient, publicApiClient, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";
import type { FullUserProfile } from "@/lib/utils/profile-types";

export interface SafeUser {
  id: string;
  tenantId: string | null;
  tin: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
  subRole: string | null;
  isApproved: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  inviteCode?: string;
  phone?: string;
  organizationName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export const register = async (
  dto: RegisterDto
): Promise<{ user: SafeUser; message: string }> => {
  const response = await publicApiClient.post("/api/auth/register", dto);
  return unwrapResponse(response);
};

export const login = async (
  dto: LoginDto
): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> => {
  const response = await publicApiClient.post("/api/auth/login", dto);
  return unwrapResponse(response);
};

export const refreshToken = async (
  token: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const response = await publicApiClient.post("/api/auth/refresh", { refreshToken: token });
  return unwrapResponse(response);
};

export const logout = async (refreshTokenValue: string): Promise<void> => {
  const response = await apiClient.post("/api/auth/logout", { refreshToken: refreshTokenValue });
  unwrapVoidResponse(response);
};

export const verifyEmail = async (token: string): Promise<void> => {
  const response = await publicApiClient.post("/api/auth/verify-email", { token });
  unwrapVoidResponse(response);
};

export const resendVerification = async (email: string): Promise<void> => {
  const response = await publicApiClient.post("/api/auth/resend-verification", { email });
  unwrapVoidResponse(response);
};

export const forgotPassword = async (email: string): Promise<void> => {
  const response = await publicApiClient.post("/api/auth/forgot-password", { email });
  unwrapVoidResponse(response);
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const response = await publicApiClient.post("/api/auth/reset-password", { token, newPassword });
  unwrapVoidResponse(response);
};

export const getMe = async (): Promise<FullUserProfile> => {
  const response = await apiClient.get("/api/auth/me");
  return unwrapResponse(response);
};
