import type { ChatContextType, ChatMessage, ChatThread, MessageType, PaginatedResponse } from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";

export interface CreateThreadDto {
  userId: string;
  contextType: ChatContextType;
  contextId: string;
}

export interface ChatThreadWithPreview extends ChatThread {
  otherParticipant: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  } | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface SendMessageDto {
  content?: string;
  fileUrl?: string;
  fileName?: string;
  messageType: MessageType;
}

export const getThreads = async (): Promise<ChatThreadWithPreview[]> => {
  const response = await apiClient.get("/api/chat/threads");
  return unwrapResponse(response);
};

export const getOrCreateThread = async (dto: CreateThreadDto): Promise<ChatThread> => {
  const response = await apiClient.post("/api/chat/threads", dto);
  return unwrapResponse(response);
};

export const getMessages = async (
  threadId: string,
  page = 1,
  limit = 30
): Promise<PaginatedResponse<ChatMessage[]>> => {
  const response = await apiClient.get(`/api/chat/threads/${threadId}/messages`, {
    params: { page, limit }
  });
  return unwrapPaginatedResponse(response);
};

export const sendMessage = async (
  threadId: string,
  dto: SendMessageDto
): Promise<ChatMessage> => {
  const response = await apiClient.post(`/api/chat/threads/${threadId}/messages`, dto);
  return unwrapResponse(response);
};

export const markThreadRead = async (threadId: string): Promise<void> => {
  const response = await apiClient.patch(`/api/chat/threads/${threadId}/read`);
  unwrapVoidResponse(response);
};

export const uploadChatFile = async (
  file: File
): Promise<{ fileUrl: string; fileKey: string; fileName: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("/api/chat/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return unwrapResponse(response);
};
