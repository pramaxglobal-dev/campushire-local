import type { NextFunction, Request, Response } from "express";
import { ChatContextType } from "@campushire/types";
import {
  CreateThreadSchema,
  MessagePaginationSchema,
  SendMessageSchema,
  ThreadIdParamSchema
} from "./chat.schema";
import {
  getMessages,
  getOrCreateThread,
  getThreads,
  markThreadRead,
  sendMessage,
  uploadChatFile
} from "./chat.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireUserId = (req: Request): string => {
  if (!req.user?.userId) {
    throw new ControllerError("Unauthorized", 401);
  }
  return req.user.userId;
};

export const getThreadsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const threads = await getThreads(userId);
    res.status(200).json({
      success: true,
      data: threads,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getOrCreateThreadController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userAId = requireUserId(req);
    const dto = CreateThreadSchema.parse(req.body);
    const thread = await getOrCreateThread(
      userAId,
      dto.userId,
      dto.contextType as ChatContextType,
      dto.contextId
    );
    res.status(200).json({
      success: true,
      data: thread,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getMessagesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = ThreadIdParamSchema.parse(req.params);
    const query = MessagePaginationSchema.parse(req.query);
    const result = await getMessages(params.id, userId, query.page, query.limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const sendMessageController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = ThreadIdParamSchema.parse(req.params);
    const body = SendMessageSchema.parse(req.body);
    const message = await sendMessage(params.id, userId, body);
    res.status(201).json({
      success: true,
      data: message,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const markThreadReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = ThreadIdParamSchema.parse(req.params);
    await markThreadRead(params.id, userId);
    res.status(200).json({
      success: true,
      data: { read: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const uploadChatFileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    if (!req.file) {
      throw new ControllerError("Chat file is required.", 400);
    }
    const fileData = await uploadChatFile(req.file, userId);
    res.status(201).json({
      success: true,
      data: fileData,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
