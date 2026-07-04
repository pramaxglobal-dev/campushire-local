import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import {
  BrowseCollegeQuerySchema,
  ConnectionPairParamSchema,
  ConnectionStatusQuerySchema,
  RequestConnectionSchema,
  RespondConnectionSchema,
  ConnectionIdParamSchema
} from "./connections.schema";
import {
  disconnectConnection,
  browseCollegesForRecruiter,
  getCollegeIdForAdmin,
  getConnectionStatus,
  listConnectionsForCollege,
  listConnectionsForRecruiter,
  requestConnection,
  respondToConnection
} from "./connections.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireUser = (req: Request): { userId: string; role: UserRole; tenantId: string | null } => {
  if (!req.user) {
    throw new ControllerError("Unauthorized", 401);
  }
  return {
    userId: req.user.userId,
    role: req.user.role,
    tenantId: req.user.tenantId
  };
};

export const requestConnectionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const dto = RequestConnectionSchema.parse(req.body);
    if (!actor.tenantId) {
      throw new ControllerError("Tenant scope missing.", 403);
    }
    const connection = await requestConnection(actor.userId, dto.collegeId, dto.message, actor.tenantId);
    res.status(201).json({
      success: true,
      data: connection,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const listConnectionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const query = ConnectionStatusQuerySchema.parse(req.query);

    if (actor.role === UserRole.COLLEGE_ADMIN) {
      if (!actor.tenantId) {
        throw new ControllerError("Tenant scope missing.", 403);
      }
      const collegeId = await getCollegeIdForAdmin(actor.userId, actor.tenantId);
      const rows = await listConnectionsForCollege(collegeId, query.status, actor.tenantId);
      res.status(200).json({
        success: true,
        data: rows,
        error: null
      });
      return;
    }

    if (actor.role === UserRole.CORPORATE_RECRUITER) {
      if (!actor.tenantId) {
        throw new ControllerError("Tenant scope missing.", 403);
      }
      const rows = await listConnectionsForRecruiter(actor.userId, query.status, actor.tenantId);
      res.status(200).json({
        success: true,
        data: rows,
        error: null
      });
      return;
    }

    throw new ControllerError("Forbidden", 403);
  } catch (error) {
    next(error);
  }
};

export const getConnectionStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ConnectionPairParamSchema.parse(req.params);

    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.userId !== params.recruiterId &&
      actor.role !== UserRole.COLLEGE_ADMIN
    ) {
      throw new ControllerError("Forbidden", 403);
    }

    const status = await getConnectionStatus(
      params.recruiterId,
      params.collegeId,
      actor.tenantId ?? undefined
    );
    res.status(200).json({
      success: true,
      data: status,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const browseCollegesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    if (actor.role !== UserRole.CORPORATE_RECRUITER) {
      throw new ControllerError("Forbidden", 403);
    }

    const query = BrowseCollegeQuerySchema.parse(req.query);
    const result = await browseCollegesForRecruiter(actor.userId, query, actor.tenantId ?? undefined);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const respondToConnectionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ConnectionIdParamSchema.parse(req.params);
    const dto = RespondConnectionSchema.parse(req.body);
    const connection = await respondToConnection(
      params.id,
      actor.userId,
      dto.action,
      actor.tenantId ?? undefined
    );
    res.status(200).json({
      success: true,
      data: connection,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const disconnectConnectionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ConnectionIdParamSchema.parse(req.params);
    await disconnectConnection(params.id, actor.userId, actor.tenantId ?? undefined);
    res.status(200).json({
      success: true,
      data: { disconnected: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};
