import type { Notification } from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  error: string | null;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getNotifications = async (
  page = 1,
  limit = 20
): Promise<NotificationsResponse> => {
  const response = await apiClient.get("/api/notifications", {
    params: { page, limit }
  });
  return unwrapResponse(response);
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get("/api/notifications/unread-count");
  const payload = unwrapResponse<{ unreadCount: number }>(response);
  return payload.unreadCount;
};

export const markAsRead = async (id: string): Promise<void> => {
  await apiClient.patch(`/api/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
  await apiClient.patch("/api/notifications/mark-all-read");
};
