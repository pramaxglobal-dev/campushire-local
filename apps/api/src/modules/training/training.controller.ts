import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import {
  CourseFiltersSchema,
  CourseIdParamSchema,
  CreateCourseSchema,
  PartnerEnrollmentQuerySchema,
  UpdateCourseSchema,
  UpdateEnrollmentProgressSchema
} from "./training.schema";
import {
  createCourse,
  enrollInCourse,
  getCourse,
  getMyEnrollments,
  getPartnerCourses,
  getPartnerEnrollments,
  getPartnerStats,
  listCourses,
  publishCourse,
  unpublishCourse,
  updateCourse,
  updateEnrollmentProgress
} from "./training.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireUser = (req: Request): { userId: string; role: UserRole } => {
  if (!req.user?.userId) {
    throw new ControllerError("Unauthorized", 401);
  }

  return {
    userId: req.user.userId,
    role: req.user.role
  };
};

export const listCoursesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = CourseFiltersSchema.parse(req.query);
    const result = await listCourses(filters, filters.page, filters.limit, req.user?.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCourseController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = CourseIdParamSchema.parse(req.params);
    const course = await getCourse(params.id, req.user?.userId);
    res.status(200).json({
      success: true,
      data: course,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const createCourseController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const dto = CreateCourseSchema.parse(req.body);
    const course = await createCourse(actor.userId, dto);
    res.status(201).json({
      success: true,
      data: course,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourseController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = CourseIdParamSchema.parse(req.params);
    const dto = UpdateCourseSchema.parse(req.body);
    const course = await updateCourse(params.id, actor.userId, dto);
    res.status(200).json({
      success: true,
      data: course,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const publishCourseController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = CourseIdParamSchema.parse(req.params);
    const course = await publishCourse(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: course,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const unpublishCourseController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = CourseIdParamSchema.parse(req.params);
    const course = await unpublishCourse(params.id, actor.userId);
    res.status(200).json({
      success: true,
      data: course,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const enrollInCourseController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = CourseIdParamSchema.parse(req.params);
    const enrollment = await enrollInCourse(actor.userId, params.id);
    res.status(201).json({
      success: true,
      data: enrollment,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updateEnrollmentProgressController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = CourseIdParamSchema.parse(req.params);
    const body = UpdateEnrollmentProgressSchema.parse({
      ...req.body,
      enrollmentId: params.id
    });
    const enrollment = await updateEnrollmentProgress(
      body.enrollmentId,
      actor.userId,
      body.progressPct
    );
    res.status(200).json({
      success: true,
      data: enrollment,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getMyEnrollmentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const enrollments = await getMyEnrollments(actor.userId);
    res.status(200).json({
      success: true,
      data: enrollments,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getPartnerCoursesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const courses = await getPartnerCourses(actor.userId);
    res.status(200).json({
      success: true,
      data: courses,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getPartnerEnrollmentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const query = PartnerEnrollmentQuerySchema.parse(req.query);
    const enrollments = await getPartnerEnrollments(actor.userId, query.courseId);
    res.status(200).json({ success: true, data: enrollments, error: null });
  } catch (error) {
    next(error);
  }
};

export const getPartnerStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const stats = await getPartnerStats(actor.userId);
    res.status(200).json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
