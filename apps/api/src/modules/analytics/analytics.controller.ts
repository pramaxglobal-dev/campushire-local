import type { NextFunction, Request, Response } from "express";
import { AnalyticsDateRangeSchema, resolveDateRange } from "./analytics.schema";
import {
  getCollegeAnalytics,
  getFreelanceAnalytics,
  getPlatformAnalytics,
  getRecruiterAnalytics,
  getStudentAnalytics
} from "./analytics.service";

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

export const getStudentAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const range = resolveDateRange(AnalyticsDateRangeSchema.parse(req.query));
    const analytics = await getStudentAnalytics(userId, range);
    res.status(200).json({
      success: true,
      data: analytics,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getRecruiterAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const range = resolveDateRange(AnalyticsDateRangeSchema.parse(req.query));
    const analytics = await getRecruiterAnalytics(userId, range);
    res.status(200).json({
      success: true,
      data: analytics,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getCollegeAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const range = resolveDateRange(AnalyticsDateRangeSchema.parse(req.query));
    const analytics = await getCollegeAnalytics(userId, range);
    res.status(200).json({
      success: true,
      data: analytics,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const range = resolveDateRange(AnalyticsDateRangeSchema.parse(req.query));
    const analytics = await getPlatformAnalytics(userId, range);
    res.status(200).json({
      success: true,
      data: analytics,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getFreelanceAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const range = resolveDateRange(AnalyticsDateRangeSchema.parse(req.query));
    const analytics = await getFreelanceAnalytics(userId, range);
    res.status(200).json({
      success: true,
      data: analytics,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
