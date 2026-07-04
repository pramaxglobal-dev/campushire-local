import type { NextFunction, Request, Response } from "express";
import {
  ApplicationIdParamSchema,
  AtsFiltersSchema,
  AtsStatsQuerySchema,
  BulkMoveSchema,
  JobIdParamSchema,
  MoveApplicationSchema,
  RejectSchema
} from "./ats.schema";
import {
  bulkMoveApplications,
  downloadResume,
  getATSStats,
  getApplicationsForJob,
  getKanbanBoard,
  moveApplication,
  rejectApplication,
  shortlistApplication
} from "./ats.service";

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

export const getKanbanBoardController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = JobIdParamSchema.parse(req.params);
    const board = await getKanbanBoard(userId, params.jobId);
    res.status(200).json({
      success: true,
      data: board,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationsForJobController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = JobIdParamSchema.parse(req.params);
    const filters = AtsFiltersSchema.parse(req.query);
    const result = await getApplicationsForJob(
      params.jobId,
      userId,
      filters,
      filters.page,
      filters.limit
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const moveApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = ApplicationIdParamSchema.parse(req.params);
    const dto = MoveApplicationSchema.parse(req.body);
    const application = await moveApplication(params.id, userId, dto);
    res.status(200).json({
      success: true,
      data: application,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const bulkMoveApplicationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const dto = BulkMoveSchema.parse(req.body);
    const applications = await bulkMoveApplications(
      dto.applicationIds,
      userId,
      dto.toStatus,
      dto.note
    );
    res.status(200).json({
      success: true,
      data: applications,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const shortlistApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = ApplicationIdParamSchema.parse(req.params);
    const application = await shortlistApplication(params.id, userId);
    res.status(200).json({
      success: true,
      data: application,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const rejectApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = ApplicationIdParamSchema.parse(req.params);
    const body = RejectSchema.parse(req.body);
    const application = await rejectApplication(params.id, userId, body.reason);
    res.status(200).json({
      success: true,
      data: application,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const downloadResumeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = ApplicationIdParamSchema.parse(req.params);
    const url = await downloadResume(params.id, userId);
    res.status(200).json({
      success: true,
      data: { url },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getATSStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const query = AtsStatsQuerySchema.parse(req.query);
    const stats = await getATSStats(userId, query.jobId);
    res.status(200).json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
