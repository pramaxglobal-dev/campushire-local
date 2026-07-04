"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageType, type ChatMessage } from "@campushire/types";
import { Button, Textarea } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import {
  getMessages,
  markThreadRead,
  sendMessage,
  uploadChatFile,
  type ChatThreadWithPreview
} from "@/lib/api/chat.api";
import { getSocket } from "@/lib/socket";
import { MessageBubble } from "./MessageBubble";
import { Paperclip, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  thread: ChatThreadWithPreview | null;
  currentUserId: string;
  onThreadUpdated: () => Promise<void>;
}

interface IncomingMessagePayload {
  threadId: string;
  message: ChatMessage;
}

export const ChatWindow = ({ thread, currentUserId, onThreadUpdated }: ChatWindowProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    if (!thread) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getMessages(thread.id, 1, 50);
      const list = [...(response.data ?? [])].reverse();
      setMessages(list);
      await markThreadRead(thread.id);
      await onThreadUpdated();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, [onThreadUpdated, thread]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thread?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !thread) return;

    const handleIncoming = (payload: IncomingMessagePayload) => {
      if (payload.threadId !== thread.id) return;
      setMessages((prev) => [...prev, payload.message]);
      void markThreadRead(thread.id);
      void onThreadUpdated();
    };

    socket.on("message:new", handleIncoming);
    return () => {
      socket.off("message:new", handleIncoming);
    };
  }, [onThreadUpdated, thread]);

  const otherName = useMemo(() => {
    if (!thread?.otherParticipant) return "Conversation";
    return `${thread.otherParticipant.firstName} ${thread.otherParticipant.lastName}`;
  }, [thread?.otherParticipant]);

  const sendTextMessage = async (): Promise<void> => {
    if (!thread) return;
    if (!content.trim()) return;
    setSending(true);
    try {
      const created = await sendMessage(thread.id, {
        content: content.trim(),
        messageType: MessageType.TEXT
      });
      setMessages((prev) => [...prev, created]);
      setContent("");
      await onThreadUpdated();
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const sendFileMessage = async (file: File): Promise<void> => {
    if (!thread) return;
    setSending(true);
    try {
      const uploaded = await uploadChatFile(file);
      const created = await sendMessage(thread.id, {
        messageType: MessageType.FILE,
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName
      });
      setMessages((prev) => [...prev, created]);
      await onThreadUpdated();
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : "Unable to send file.");
    } finally {
      setSending(false);
    }
  };

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Select a conversation to start chatting.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{otherName}</p>
        <p className="text-xs text-slate-500">{thread.contextType.replaceAll("_", " ")}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {loading ? <LoadingSkeleton variant="list" count={6} /> : null}
        {error ? <ErrorState message={error} onRetry={() => void loadMessages()} /> : null}
        {!loading && !error
          ? messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderUserId === currentUserId}
              />
            ))
          : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void sendFileMessage(file);
              }
              event.target.value = "";
            }}
          />
          <p className="text-xs text-slate-500">Max file size: 20MB</p>
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            helperText="Press Enter to send, Shift + Enter for newline"
            rows={2}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendTextMessage();
              }
            }}
          />
          <Button onClick={() => void sendTextMessage()} disabled={sending || !content.trim()}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
