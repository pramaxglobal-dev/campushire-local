import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import {
  CancelInterviewSchema,
  InterviewFiltersSchema,
  InterviewIdParamSchema,
  RecordOutcomeSchema,
  RescheduleSchema,
  ScheduleInterviewSchema
} from "./interviews.schema";
import {
  cancelInterview,
  confirmInterview,
  getInterviewDetail,
  getInterviewsForCandidate,
  getInterviewsForRecruiter,
  recordOutcome,
  rescheduleInterview,
  scheduleInterview
} from "./interviews.service";

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

export const scheduleInterviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const dto = ScheduleInterviewSchema.parse(req.body);
    const slot = await scheduleInterview(actor.userId, dto);
    res.status(201).json({
      success: true,
      data: slot,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getInterviewsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    if (actor.role === UserRole.CORPORATE_RECRUITER) {
      const filters = InterviewFiltersSchema.parse(req.query);
      const data = await getInterviewsForRecruiter(actor.userId, filters);
      res.status(200).json({
        success: true,
        data,
        error: null
      });
      return;
    }
    if (actor.role === UserRole.STUDENT || actor.role === UserRole.JOB_SEEKER) {
      const data = await getInterviewsForCandidate(actor.userId);
      res.status(200).json({
        success: true,
        data,
        error: null
      });
      return;
    }
    throw new ControllerError("Forbidden", 403);
  } catch (error) {
    next(error);
  }
};

export const getInterviewDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = InterviewIdParamSchema.parse(req.params);
    const slot = await getInterviewDetail(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: slot,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const rescheduleInterviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = InterviewIdParamSchema.parse(req.params);
    const dto = RescheduleSchema.parse(req.body);
    const slot = await rescheduleInterview(params.id, actor.userId, dto);
    res.status(200).json({
      success: true,
      data: slot,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const cancelInterviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = InterviewIdParamSchema.parse(req.params);
    const body = CancelInterviewSchema.parse(req.body);
    const slot = await cancelInterview(params.id, actor.userId, body.reason);
    res.status(200).json({
      success: true,
      data: slot,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const confirmInterviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = InterviewIdParamSchema.parse(req.params);
    const slot = await confirmInterview(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: slot,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const recordOutcomeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = InterviewIdParamSchema.parse(req.params);
    const body = RecordOutcomeSchema.parse(req.body);
    const slot = await recordOutcome(params.id, actor.userId, body.outcome, body.note);
    res.status(200).json({
      success: true,
      data: slot,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
