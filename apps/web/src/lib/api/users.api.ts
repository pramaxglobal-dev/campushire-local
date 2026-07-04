import type { NotificationPreference } from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { FullUserProfile } from "@/lib/utils/profile-types";

export type FullProfile = FullUserProfile;

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  headline?: string;
  bio?: string;
  profileVisibility?: "PUBLIC" | "COLLEGE_ONLY" | "PRIVATE";
  studentProfile?: Record<string, unknown>;
  jobSeekerProfile?: Record<string, unknown>;
  recruiterProfile?: Record<string, unknown>;
  freelanceRecruiterProfile?: Record<string, unknown>;
  vendorProfile?: Record<string, unknown>;
  trainingPartnerProfile?: Record<string, unknown>;
  collegeProfile?: Record<string, unknown>;
}

export interface NotificationPrefDto {
  preferences: Array<{
    type: NotificationPreference["type"];
    channel: NotificationPreference["channel"];
    isEnabled: boolean;
  }>;
}

export const getProfile = async (): Promise<FullProfile> => {
  const response = await apiClient.get("/api/users/profile");
  return unwrapResponse(response);
};

export const updateProfile = async (dto: UpdateProfileDto): Promise<FullProfile> => {
  const response = await apiClient.put("/api/users/profile", dto);
  return unwrapResponse(response);
};

export const uploadAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/api/users/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return unwrapResponse(response);
};

export const updateNotificationPreferences = async (
  dto: NotificationPrefDto
): Promise<NotificationPreference[] | NotificationPreference> => {
  const response = await apiClient.put("/api/users/notification-preferences", dto);
  return unwrapResponse(response);
};
