import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import { ActivityQuerySchema, NotificationPreferenceSchema, UpdateProfileSchema } from "./users.schema";
import {
  getActivityLog,
  getProfile,
  updateNotificationPreferences,
  updateProfile,
  uploadAvatar
} from "./users.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireAuthenticatedUser = (
  req: Request
): { userId: string; role: UserRole; tenantId: string | null } => {
  const user = req.user;
  if (!user) {
    throw new ControllerError("Unauthorized", 401);
  }

  return {
    userId: user.userId,
    role: user.role,
    tenantId: user.tenantId
  };
};

export const getProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireAuthenticatedUser(req);
    const data = await getProfile(actor.userId, actor.tenantId);

    res.status(200).json({
      success: true,
      data,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireAuthenticatedUser(req);
    const dto = UpdateProfileSchema.parse(req.body);
    const data = await updateProfile(actor.userId, actor.role, actor.tenantId, dto);

    res.status(200).json({
      success: true,
      data,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatarController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireAuthenticatedUser(req);
    if (!req.file) {
      throw new ControllerError("Avatar file is required.", 400);
    }

    const avatarUrl = await uploadAvatar(actor.userId, actor.tenantId, req.file);

    res.status(200).json({
      success: true,
      data: { avatarUrl },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationPreferencesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireAuthenticatedUser(req);
    const dto = NotificationPreferenceSchema.parse(req.body);
    const preferences = await updateNotificationPreferences(actor.userId, actor.tenantId, dto);

    res.status(200).json({
      success: true,
      data: preferences,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getActivityLogController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireAuthenticatedUser(req);
    const query = ActivityQuerySchema.parse(req.query);
    const result = await getActivityLog(actor.userId, actor.tenantId, query.page, query.limit);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
