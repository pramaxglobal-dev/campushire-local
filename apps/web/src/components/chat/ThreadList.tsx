"use client";

import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui";
import type { ChatThreadWithPreview } from "@/lib/api/chat.api";

interface ThreadListProps {
  threads: ChatThreadWithPreview[];
  activeThreadId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectThread: (threadId: string) => void;
}

const formatThreadTime = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
};

export const ThreadList = ({
  threads,
  activeThreadId,
  search,
  onSearchChange,
  onSelectThread
}: ThreadListProps) => {
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          helperText="Search by name or message"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No conversations found.</p>
        ) : (
          threads.map((thread) => {
            const other = thread.otherParticipant;
            const active = activeThreadId === thread.id;
            const preview = thread.lastMessage?.body || thread.lastMessage?.fileName || "No messages yet";
            const time = formatThreadTime(thread.lastMessage?.createdAt ?? thread.lastMessageAt);
            return (
              <button
                key={thread.id}
                type="button"
                className={`w-full border-b border-slate-100 px-4 py-3 text-left transition ${
                  active ? "bg-accent/10" : "hover:bg-slate-50"
                }`}
                onClick={() => onSelectThread(thread.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {other ? `${other.firstName} ${other.lastName}` : "Unknown user"}
                    </p>
                    <p className="truncate text-xs text-slate-600">{preview}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {time ? <span className="text-[11px] text-slate-500">{time}</span> : null}
                    {thread.unreadCount > 0 ? (
                      <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                        {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
