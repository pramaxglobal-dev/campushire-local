import type {
  Notification,
  NotificationPreference,
  PaginatedResponse,
  NotificationChannel,
  NotificationType,
  UserRole
} from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";

export interface UpdatePreferencesDto {
  preferences: Array<{
    type: NotificationType;
    channel: NotificationChannel;
    isEnabled: boolean;
  }>;
}

export const getNotifications = async (
  page: number,
  unreadOnly?: boolean,
  limit = 20
): Promise<PaginatedResponse<Notification[]>> => {
  const response = await apiClient.get("/api/notifications", {
    params: { page, unreadOnly, limit }
  });
  return unwrapPaginatedResponse(response);
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get("/api/notifications/unread-count");
  const data = unwrapResponse<{ count: number }>(response);
  return data.count;
};

export const markAsRead = async (id: string): Promise<void> => {
  const response = await apiClient.patch(`/api/notifications/${id}/read`);
  unwrapVoidResponse(response);
};

export const markAllAsRead = async (): Promise<void> => {
  const response = await apiClient.patch("/api/notifications/mark-all-read");
  unwrapVoidResponse(response);
};

export const getPreferences = async (): Promise<NotificationPreference[] | NotificationPreference> => {
  const response = await apiClient.get("/api/notifications/preferences");
  return unwrapResponse(response);
};

export const updatePreferences = async (
  dto: UpdatePreferencesDto
): Promise<NotificationPreference[] | NotificationPreference> => {
  const response = await apiClient.put("/api/notifications/preferences", dto);
  return unwrapResponse(response);
};

export const broadcastNotification = async (
  title: string,
  body: string,
  roles?: UserRole[]
): Promise<void> => {
  const response = await apiClient.post("/api/admin/broadcast", {
    title,
    body,
    roles
  });
  unwrapVoidResponse(response);
};
