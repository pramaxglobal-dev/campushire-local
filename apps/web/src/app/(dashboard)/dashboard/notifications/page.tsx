"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Briefcase, CalendarClock, Settings2 } from "lucide-react";
import { NotificationType, type Notification } from "@campushire/types";
import { formatDistanceToNow } from "date-fns";
import { Button, Card, CardContent } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getNotifications,
  markAllAsRead,
  markAsRead
} from "@/lib/api/notifications.api";
import { toast } from "sonner";

type NotificationTab = "ALL" | "UNREAD" | "APPLICATIONS" | "INTERVIEWS" | "SYSTEM";

const TAB_OPTIONS: Array<{ label: string; value: NotificationTab }> = [
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
  { label: "Applications", value: "APPLICATIONS" },
  { label: "Interviews", value: "INTERVIEWS" },
  { label: "System", value: "SYSTEM" }
];

const iconByType: Record<string, React.ComponentType<{ className?: string }>> = {
  APPLICATION_STATUS: Briefcase,
  INTERVIEW_SCHEDULED: CalendarClock,
  SYSTEM: Settings2
};

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTab>("ALL");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(
    async (nextPage: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const unreadOnly = activeTab === "UNREAD";
        const result = await getNotifications(nextPage, unreadOnly, 20);
        const data = result.data ?? [];
        setNotifications((prev) => (append ? [...prev, ...data] : data));
        setPage(nextPage);
        setTotalPages(result.meta.totalPages);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    void loadNotifications(1);
  }, [loadNotifications]);

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === "ALL" || activeTab === "UNREAD") return true;
      if (activeTab === "APPLICATIONS") return item.type === NotificationType.APPLICATION_STATUS;
      if (activeTab === "INTERVIEWS") return item.type === NotificationType.INTERVIEW_SCHEDULED;
      if (activeTab === "SYSTEM") return item.type === NotificationType.SYSTEM;
      return true;
    });
  }, [activeTab, notifications]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (page >= totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loadingMore) {
            void loadNotifications(page + 1, true);
          }
        });
      },
      { threshold: 1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadNotifications, loadingMore, page, totalPages]);

  const handleMarkRead = async (notification: Notification) => {
    const previous = notifications;
    setNotifications((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
    );
    try {
      await markAsRead(notification.id);
      const data =
        notification.data && typeof notification.data === "object" && !Array.isArray(notification.data)
          ? (notification.data as Record<string, unknown>)
          : {};
      const actionUrl = typeof data.actionUrl === "string" ? data.actionUrl : null;
      if (actionUrl) router.push(actionUrl);
    } catch {
      setNotifications(previous);
      toast.error("Unable to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch {
      setNotifications(previous);
      toast.error("Unable to update notifications.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with applications, interviews, and system updates."
        actions={
          <Button variant="outline" onClick={() => void handleMarkAllRead()}>
            Mark All as Read
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              activeTab === tab.value
                ? "border-accent bg-accent text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSkeleton variant="list" count={8} /> : null}
      {error && !loading ? <ErrorState message={error} onRetry={() => void loadNotifications(1)} /> : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You are all caught up." />
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {filtered.map((notification) => {
            const Icon = iconByType[notification.type] ?? Bell;
            return (
              <Card
                key={notification.id}
                className={`cursor-pointer transition hover:shadow-card-hover ${
                  notification.isRead ? "" : "border-accent/30 bg-accent-50/40"
                }`}
                onClick={() => void handleMarkRead(notification)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="rounded-full bg-slate-100 p-2">
                    <Icon className="h-4 w-4 text-slate-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{notification.title}</p>
                      {!notification.isRead ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{notification.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div ref={sentinelRef} />

          {loadingMore ? <LoadingSkeleton variant="list" count={2} /> : null}
        </div>
      ) : null}
    </div>
  );
}
