import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import {
  CreateJobSchema,
  JobFeedQuerySchema,
  JobFiltersSchema,
  JobIdParamSchema,
  RejectJobSchema,
  UpdateJobSchema
} from "./jobs.schema";
import {
  approveJob,
  createJob,
  deleteJob,
  getJob,
  getJobFeed,
  getRecruiterJobStats,
  getSavedJobs,
  listJobs,
  rejectJob,
  saveJob,
  submitJobForApproval,
  unsaveJob,
  updateJob
} from "./jobs.service";

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

export const createJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    if (!actor.tenantId) {
      throw new ControllerError("Recruiter tenant scope missing.", 403);
    }
    const dto = CreateJobSchema.parse(req.body);
    const job = await createJob(actor.userId, actor.tenantId, dto);
    res.status(201).json({
      success: true,
      data: job,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const listJobsController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = JobFiltersSchema.parse(req.query);
    const viewerUserId = req.user?.userId;
    const result = await listJobs(filters, viewerUserId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getJobFeedController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const query = JobFeedQuerySchema.parse(req.query);
    const result = await getJobFeed(actor.userId, query.page, query.limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSavedJobsController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const query = JobFeedQuerySchema.parse(req.query);
    const result = await getSavedJobs(actor.userId, query.page, query.limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getRecruiterJobStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const stats = await getRecruiterJobStats(actor.userId);
    res.status(200).json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = JobIdParamSchema.parse(req.params);
    const job = await getJob(params.id, req.user?.userId);
    res.status(200).json({
      success: true,
      data: job,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updateJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = JobIdParamSchema.parse(req.params);
    const dto = UpdateJobSchema.parse(req.body);
    const job = await updateJob(params.id, actor.userId, dto);
    res.status(200).json({
      success: true,
      data: job,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = JobIdParamSchema.parse(req.params);
    await deleteJob(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: { deleted: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const saveJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = JobIdParamSchema.parse(req.params);
    await saveJob(actor.userId, params.id);
    res.status(200).json({
      success: true,
      data: { saved: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const unsaveJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = JobIdParamSchema.parse(req.params);
    await unsaveJob(actor.userId, params.id);
    res.status(200).json({
      success: true,
      data: { saved: false },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const submitJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = JobIdParamSchema.parse(req.params);
    const job = await submitJobForApproval(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: job,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const approveJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = JobIdParamSchema.parse(req.params);
    const job = await approveJob(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: job,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const rejectJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = JobIdParamSchema.parse(req.params);
    const body = RejectJobSchema.parse(req.body);
    const job = await rejectJob(params.id, actor.userId, body.reason);
    res.status(200).json({
      success: true,
      data: job,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
