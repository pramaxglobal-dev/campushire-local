import type { User, UserRole } from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

export interface MobileLoginDto {
  email: string;
  password: string;
}

export interface MobileRegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  inviteCode?: string;
  phone?: string;
}

export interface FullUserProfile extends User {
  studentProfile?: Record<string, unknown> | null;
  jobSeekerProfile?: Record<string, unknown> | null;
  recruiterProfile?: Record<string, unknown> | null;
}

export const login = async (dto: MobileLoginDto): Promise<{
  accessToken: string;
  refreshToken: string;
  user: FullUserProfile;
}> => {
  const response = await apiClient.post("/api/auth/login", dto);
  return unwrapResponse(response);
};

export const register = async (
  dto: MobileRegisterDto
): Promise<{ user: FullUserProfile; message: string }> => {
  const response = await apiClient.post("/api/auth/register", dto);
  return unwrapResponse(response);
};

export const getMe = async (): Promise<FullUserProfile> => {
  const response = await apiClient.get("/api/auth/me");
  return unwrapResponse(response);
};

export const refreshToken = async (
  refreshTokenValue: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const response = await apiClient.post("/api/auth/refresh", {
    refreshToken: refreshTokenValue
  });
  return unwrapResponse(response);
};

export const logout = async (refreshTokenValue: string): Promise<void> => {
  await apiClient.post("/api/auth/logout", { refreshToken: refreshTokenValue });
};
