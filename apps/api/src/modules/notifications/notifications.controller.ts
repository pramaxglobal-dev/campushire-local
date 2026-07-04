import type { NextFunction, Request, Response } from "express";
import {
  NotificationIdParamSchema,
  NotificationsQuerySchema,
  UpdatePreferencesSchema
} from "./notifications.schema";
import {
  deleteNotification,
  getNotifications,
  getPreferences,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  updatePreferences
} from "./notifications.service";

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

export const getNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const query = NotificationsQuerySchema.parse(req.query);
    const result = await getNotifications(userId, query.page, query.limit, query.unreadOnly);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCountController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const count = await getUnreadCount(userId);
    res.status(200).json({
      success: true,
      data: { count },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const markAsReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = NotificationIdParamSchema.parse(req.params);
    await markAsRead(params.id, userId);
    res.status(200).json({
      success: true,
      data: { updated: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    await markAllAsRead(userId);
    res.status(200).json({
      success: true,
      data: { updated: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = NotificationIdParamSchema.parse(req.params);
    await deleteNotification(params.id, userId);
    res.status(200).json({
      success: true,
      data: { deleted: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getPreferencesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const preferences = await getPreferences(userId);
    res.status(200).json({
      success: true,
      data: preferences,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferencesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const dto = UpdatePreferencesSchema.parse(req.body);
    const preferences = await updatePreferences(userId, dto);
    res.status(200).json({
      success: true,
      data: preferences,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
