"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const hasNotifications = notifications.length > 0;

  const countLabel = useMemo(() => {
    if (unreadCount > 99) return "99+";
    return `${unreadCount}`;
  }, [unreadCount]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
            {countLabel}
          </span>
        ) : null}
      </Button>

      {open ? (
        <Card className="absolute right-0 z-50 mt-2 w-[20rem] border border-slate-200 shadow-lg">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() => void markAllAsRead()}
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!hasNotifications ? (
                <p className="p-4 text-sm text-slate-500">No notifications yet.</p>
              ) : (
                notifications.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      item.isRead ? "" : "bg-sky-50"
                    }`}
                    onClick={() => void markAsRead(item.id)}
                  >
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-2 text-right">
              <a href="/dashboard/notifications" className="text-xs text-accent hover:underline">
                View all
              </a>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};