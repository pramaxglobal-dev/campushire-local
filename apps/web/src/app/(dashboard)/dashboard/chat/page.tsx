"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ThreadList } from "@/components/chat/ThreadList";
import { getThreads, type ChatThreadWithPreview } from "@/lib/api/chat.api";
import { connectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store/auth.store";

interface IncomingMessagePayload {
  threadId: string;
  message: {
    senderUserId: string;
    body?: string | null;
    fileName?: string | null;
  };
}

const isMobileViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const threadIdParam = searchParams.get("threadId");
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [threads, setThreads] = useState<ChatThreadWithPreview[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threadIdParam);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showThreadListMobile, setShowThreadListMobile] = useState(true);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getThreads();
      setThreads(response);

      const preferredThreadId =
        threadIdParam && response.some((thread) => thread.id === threadIdParam)
          ? threadIdParam
          : null;

      setActiveThreadId((prev) => {
        if (preferredThreadId) return preferredThreadId;
        if (prev && response.some((thread) => thread.id === prev)) return prev;
        return response[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load chats.");
    } finally {
      setLoading(false);
    }
  }, [threadIdParam]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket() ?? connectSocket(accessToken);
    const onIncomingMessage = (payload: IncomingMessagePayload) => {
      void loadThreads();

      if (!user || payload.message.senderUserId === user.id) return;
      if (typeof document !== "undefined" && document.visibilityState === "visible") return;
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;

      const sourceThread = threads.find((thread) => thread.id === payload.threadId);
      const senderName = sourceThread?.otherParticipant
        ? `${sourceThread.otherParticipant.firstName} ${sourceThread.otherParticipant.lastName}`
        : "New Message";
      const body = payload.message.body || payload.message.fileName || "You received a new message.";
      new Notification(senderName, { body });
    };

    socket.on("message:new", onIncomingMessage);
    return () => {
      socket.off("message:new", onIncomingMessage);
    };
  }, [accessToken, loadThreads, threads, user]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) => {
      const name = thread.otherParticipant
        ? `${thread.otherParticipant.firstName} ${thread.otherParticipant.lastName}`.toLowerCase()
        : "";
      const preview = (thread.lastMessage?.body ?? thread.lastMessage?.fileName ?? "").toLowerCase();
      return name.includes(query) || preview.includes(query);
    });
  }, [search, threads]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  );

  const selectThread = (threadId: string): void => {
    setActiveThreadId(threadId);
    if (isMobileViewport()) {
      setShowThreadListMobile(false);
    }
  };

  if (!user) {
    return <LoadingSkeleton variant="card" count={3} />;
  }

  if (loading) return <LoadingSkeleton variant="table" count={7} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadThreads()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chat"
        subtitle="Message candidates, recruiters, and partners in real time."
      />

      {threads.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Conversations appear here when a valid hiring context starts chat."
        />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid h-[70vh] grid-cols-1 md:grid-cols-[360px_1fr]">
              <div className={`${showThreadListMobile ? "block" : "hidden"} md:block`}>
                <ThreadList
                  threads={filteredThreads}
                  activeThreadId={activeThreadId}
                  search={search}
                  onSearchChange={setSearch}
                  onSelectThread={selectThread}
                />
              </div>

              <div className={`${showThreadListMobile ? "hidden" : "block"} md:block`}>
                <div className="border-b border-slate-200 p-2 md:hidden">
                  <Button variant="outline" size="sm" onClick={() => setShowThreadListMobile(true)}>
                    Back to chats
                  </Button>
                </div>
                <ChatWindow
                  thread={activeThread}
                  currentUserId={user.id}
                  onThreadUpdated={loadThreads}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
