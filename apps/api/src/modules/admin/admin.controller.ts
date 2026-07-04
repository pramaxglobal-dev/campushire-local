import type { NextFunction, Request, Response } from "express";
import {
  AdminUserFilterSchema,
  BroadcastSchema,
  FeatureFlagKeyParamSchema,
  ReasonSchema,
  SettingKeyParamSchema,
  UpdatePlatformSettingSchema,
  UserIdParamSchema
} from "./admin.schema";
import {
  approveUser,
  broadcastNotification,
  listFeatureFlags,
  getPendingApprovals,
  getPlatformStats,
  getUserDetail,
  listUsers,
  rejectUser,
  suspendUser,
  toggleFeatureFlag,
  unsuspendUser,
  updatePlatformSetting
} from "./admin.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireAdminId = (req: Request): string => {
  if (!req.user?.userId) {
    throw new ControllerError("Unauthorized", 401);
  }

  return req.user.userId;
};

export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = AdminUserFilterSchema.parse(req.query);
    const result = await listUsers(filters, filters.page, filters.limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = UserIdParamSchema.parse(req.params);
    const user = await getUserDetail(params.id);

    res.status(200).json({
      success: true,
      data: user,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const approveUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = UserIdParamSchema.parse(req.params);
    const adminId = requireAdminId(req);
    const user = await approveUser(params.id, adminId);

    res.status(200).json({
      success: true,
      data: user,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const rejectUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = UserIdParamSchema.parse(req.params);
    const body = ReasonSchema.parse(req.body);
    const adminId = requireAdminId(req);

    const user = await rejectUser(params.id, adminId, body.reason);

    res.status(200).json({
      success: true,
      data: user,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const suspendUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = UserIdParamSchema.parse(req.params);
    const body = ReasonSchema.parse(req.body);
    const adminId = requireAdminId(req);

    const user = await suspendUser(params.id, adminId, body.reason);

    res.status(200).json({
      success: true,
      data: user,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const unsuspendUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = UserIdParamSchema.parse(req.params);
    const adminId = requireAdminId(req);

    const user = await unsuspendUser(params.id, adminId);

    res.status(200).json({
      success: true,
      data: user,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformStatsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getPlatformStats();

    res.status(200).json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingApprovalsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pending = await getPendingApprovals();

    res.status(200).json({
      success: true,
      data: pending,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlatformSettingController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = SettingKeyParamSchema.parse(req.params);
    const body = UpdatePlatformSettingSchema.parse(req.body);
    const adminId = requireAdminId(req);

    const setting = await updatePlatformSetting(params.key, body.value, adminId);

    res.status(200).json({
      success: true,
      data: setting,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const toggleFeatureFlagController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = FeatureFlagKeyParamSchema.parse(req.params);
    const adminId = requireAdminId(req);

    const featureFlag = await toggleFeatureFlag(params.key, adminId);

    res.status(200).json({
      success: true,
      data: featureFlag,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const listFeatureFlagsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const flags = await listFeatureFlags();

    res.status(200).json({
      success: true,
      data: flags,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const broadcastNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = BroadcastSchema.parse(req.body);
    const adminId = requireAdminId(req);

    await broadcastNotification(dto, adminId);

    res.status(200).json({
      success: true,
      data: { message: "Broadcast sent" },
      error: null
    });
  } catch (error) {
    next(error);
  }
};
