import { z } from "zod";
import { ChatContextType, MessageType } from "@campushire/types";

export const CreateThreadSchema = z.object({
  userId: z.string().trim().min(1),
  contextType: z.nativeEnum(ChatContextType),
  contextId: z.string().trim().min(1)
});

export const ThreadIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const MessagePaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30)
});

export const SendMessageSchema = z.object({
  content: z.string().trim().max(10000).optional(),
  fileUrl: z.string().trim().url().optional(),
  fileName: z.string().trim().max(255).optional(),
  messageType: z.nativeEnum(MessageType).default(MessageType.TEXT)
});

export type CreateThreadDto = z.infer<typeof CreateThreadSchema>;
export type SendMessageDto = z.infer<typeof SendMessageSchema>;
