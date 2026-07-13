import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import { prisma } from "../../lib/prisma";
import {
  CreateInviteSchema,
  InviteCodeParamSchema,
  InviteIdParamSchema
} from "./invites.schema";
import {
  createInvite,
  deactivateInvite,
  getCollegeIdForAdmin,
  getInviteStats,
  listInvites,
  validateInviteCode
} from "./invites.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireCollegeAdmin = (req: Request): { userId: string; tenantId: string } => {
  if (!req.user) {
    throw new ControllerError("Unauthorized", 401);
  }
  if (req.user.role !== UserRole.COLLEGE_ADMIN || !req.user.tenantId) {
    throw new ControllerError("Forbidden", 403);
  }
  return {
    userId: req.user.userId,
    tenantId: req.user.tenantId
  };
};

export const createInviteController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireCollegeAdmin(req);
    const dto = CreateInviteSchema.parse(req.body);
    const collegeId = await getCollegeIdForAdmin(actor.userId, actor.tenantId);
    const invite = await createInvite(collegeId, actor.userId, dto);

    res.status(201).json({
      success: true,
      data: invite,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const listInvitesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireCollegeAdmin(req);
    const collegeId = await getCollegeIdForAdmin(actor.userId, actor.tenantId);
    const invites = await listInvites(collegeId);

    res.status(200).json({
      success: true,
      data: invites,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateInviteController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireCollegeAdmin(req);
    const params = InviteIdParamSchema.parse(req.params);

    // Explicit tenant-ownership verification before mutation
    const targetInvite = await prisma.invite.findUnique({
      where: { id: params.id },
      select: { tenantId: true }
    });
    if (!targetInvite) {
      throw new ControllerError("Invite not found", 404);
    }
    if (targetInvite.tenantId !== actor.tenantId) {
      throw new ControllerError("Forbidden tenant access.", 403);
    }

    const collegeId = await getCollegeIdForAdmin(actor.userId, actor.tenantId);
    const invite = await deactivateInvite(params.id, collegeId);

    res.status(200).json({
      success: true,
      data: invite,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const validateInviteCodeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = InviteCodeParamSchema.parse(req.params);
    const result = await validateInviteCode(params.code);
    res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getInviteStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireCollegeAdmin(req);
    const collegeId = await getCollegeIdForAdmin(actor.userId, actor.tenantId);
    const stats = await getInviteStats(collegeId);
    res.status(200).json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
