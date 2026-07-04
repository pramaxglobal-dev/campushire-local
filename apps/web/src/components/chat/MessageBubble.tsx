"use client";

import { formatDate } from "@campushire/utils";
import { MessageType, type ChatMessage } from "@campushire/types";
import { Download, FileText } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  if (message.isSystem || message.messageType === MessageType.SYSTEM) {
    return (
      <div className="my-2 text-center text-xs italic text-slate-500">
        {message.body ?? "System update"}
      </div>
    );
  }

  const time = formatDate(new Date(message.createdAt), "hh:mm a");

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
          isOwn ? "bg-accent text-white" : "bg-slate-100 text-slate-900"
        }`}
      >
        {message.messageType === MessageType.FILE && message.fileUrl ? (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 text-sm ${isOwn ? "text-white" : "text-accent"}`}
          >
            <FileText className="h-4 w-4" />
            <span>{message.fileName ?? "Download file"}</span>
            <Download className="h-4 w-4" />
          </a>
        ) : null}

        {message.body ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
        ) : null}

        <p className={`mt-1 text-[11px] ${isOwn ? "text-sky-100" : "text-slate-500"}`}>{time}</p>
      </div>
    </div>
  );
};
