import { useCallback, useEffect, useState } from "react";
import type { Notification } from "@campushire/types";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead
} from "@/lib/api/notifications.api";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, unread] = await Promise.all([getNotifications(1, 20), getUnreadCount()]);
      setNotifications(list.data);
      setUnreadCount(unread);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const markOne = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAll = useCallback(async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead: markOne,
    markAllAsRead: markAll
  };
};
