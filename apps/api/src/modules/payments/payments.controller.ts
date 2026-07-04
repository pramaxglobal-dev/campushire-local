import type { NextFunction, Request, Response } from "express";
import { CreateCourseOrderSchema, VerifyCoursePaymentSchema } from "./payments.schema";
import { createCoursePaymentOrder, verifyCoursePayment } from "./payments.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireUser = (req: Request): string => {
  if (!req.user?.userId) {
    throw new ControllerError("Unauthorized", 401);
  }
  return req.user.userId;
};

export const createCoursePaymentOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUser(req);
    const body = CreateCourseOrderSchema.parse(req.body);
    const order = await createCoursePaymentOrder(userId, body.courseId);
    res.status(200).json({
      success: true,
      data: order,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const verifyCoursePaymentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUser(req);
    const body = VerifyCoursePaymentSchema.parse(req.body);
    const enrollment = await verifyCoursePayment(userId, body);
    res.status(200).json({
      success: true,
      data: enrollment,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
