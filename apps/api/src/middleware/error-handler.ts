import type { ErrorRequestHandler, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const sendError = (
  res: Response,
  status: number,
  error: string,
  meta?: Record<string, unknown>
): void => {
  res.status(status).json({
    success: false,
    data: null,
    error,
    ...(meta ? { meta } : {})
  });
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next
) => {
  if (error instanceof ZodError) {
    const fieldErrors = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
    sendError(res, 400, "Validation failed", { fields: fieldErrors });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      sendError(res, 409, "Duplicate record.");
      return;
    }
    if (error.code === "P2024") {
      sendError(res, 503, "Database is busy right now. Please retry in a few seconds.");
      return;
    }
    if (error.code === "P2025") {
      sendError(res, 404, "Record not found.");
      return;
    }
    if (error.code === "P2003") {
      sendError(res, 400, "Invalid relation reference.");
      return;
    }
  }

  if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
    sendError(res, 401, "Unauthorized");
    return;
  }

  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;

  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "Internal server error";

  if (statusCode >= 500) {
    logger.error(
      {
        error,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.userId ?? null,
        tenantId: req.tenant?.tenantId ?? null
      },
      "Unhandled server error"
    );
  }

  sendError(
    res,
    statusCode,
    env.NODE_ENV === "production" && statusCode >= 500 ? "Internal server error" : message
  );
};
