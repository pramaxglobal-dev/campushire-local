import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import {
  AddNoteSchema,
  ApplicationFiltersSchema,
  ApplicationIdParamSchema,
  ApplySchema
} from "./applications.schema";
import {
  addCandidateNote,
  addRecruiterNote,
  applyToJob,
  getApplicationDetail,
  getMyApplications,
  withdrawApplication
} from "./applications.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireUser = (req: Request): { userId: string; role: UserRole } => {
  if (!req.user) {
    throw new ControllerError("Unauthorized", 401);
  }
  return {
    userId: req.user.userId,
    role: req.user.role
  };
};

export const applyToJobController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = requireUser(req);
    const dto = ApplySchema.parse(req.body);
    const application = await applyToJob(actor.userId, dto.jobId, dto);
    res.status(201).json({
      success: true,
      data: application,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getMyApplicationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    if (actor.role !== UserRole.STUDENT && actor.role !== UserRole.JOB_SEEKER) {
      throw new ControllerError("Forbidden", 403);
    }
    const query = ApplicationFiltersSchema.parse(req.query);
    const result = await getMyApplications(actor.userId, query, query.page, query.limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getApplicationDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ApplicationIdParamSchema.parse(req.params);
    const detail = await getApplicationDetail(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: detail,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ApplicationIdParamSchema.parse(req.params);
    const updated = await withdrawApplication(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: updated,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const addCandidateNoteController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ApplicationIdParamSchema.parse(req.params);
    const body = AddNoteSchema.parse(req.body);
    const updated = await addCandidateNote(params.id, actor.userId, body.note);

    res.status(200).json({
      success: true,
      data: updated,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const addRecruiterNoteController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ApplicationIdParamSchema.parse(req.params);
    const body = AddNoteSchema.parse(req.body);
    const updated = await addRecruiterNote(params.id, actor.userId, body.note);

    res.status(200).json({
      success: true,
      data: updated,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
