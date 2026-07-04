"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Notification } from "@campushire/types";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead
} from "@/lib/api/notifications.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { toast } from "sonner";
import { connectSocket, getSocket } from "@/lib/socket";

export const useNotifications = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const [listResult, countResult] = await Promise.allSettled([getNotifications(1), getUnreadCount()]);

    if (listResult.status === "fulfilled") {
      const items = Array.isArray(listResult.value.data) ? listResult.value.data : [];
      setNotifications(items.slice(0, 5));
    }

    if (countResult.status === "fulfilled") {
      setUnreadCount(countResult.value);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void refresh();

    const timer = window.setInterval(() => {
      void getUnreadCount().then(setUnreadCount).catch(() => undefined);
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [accessToken, refresh]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket() ?? connectSocket(accessToken);
    const onNotification = (payload: { title?: string; body?: string }) => {
      setUnreadCount((value) => value + 1);
      toast(payload.title ?? "New notification", {
        description: payload.body ?? "You have a new update."
      });
      void refresh();
    };

    socket.on("notification:new", onNotification);

    return () => {
      socket.off("notification:new", onNotification);
    };
  }, [accessToken, refresh]);

  const readOne = useCallback(
    async (id: string) => {
      await markAsRead(id);
      await refresh();
    },
    [refresh]
  );

  const readAll = useCallback(async () => {
    await markAllAsRead();
    await refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead: readOne,
      markAllAsRead: readAll,
      refresh
    }),
    [notifications, unreadCount, readOne, readAll, refresh]
  );
};
