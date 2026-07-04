import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { httpLogger } from "../lib/logger";
import { prisma } from "../lib/prisma";

const NOISY_READ_PATHS = [
  "/api/auth/me",
  "/api/admin/stats",
  "/api/admin/pending-approvals",
  "/api/admin/feature-flags",
  "/api/analytics/platform"
] as const;

const normalizePath = (url: string): string => url.split("?")[0] ?? url;

const shouldPersistActivityLog = (req: Request, statusCode: number): boolean => {
  const path = normalizePath(req.originalUrl);
  if (!path.startsWith("/api")) {
    return false;
  }

  if (path === "/health") {
    return false;
  }

  if (NOISY_READ_PATHS.some((prefix) => path.startsWith(prefix)) && statusCode < 500) {
    return false;
  }

  return true;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;

    httpLogger.info({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: req.user?.userId ?? null,
      tenantId: req.tenant?.tenantId ?? null,
      ip: req.ip
    });

    if (shouldPersistActivityLog(req, res.statusCode)) {
      const payload: Prisma.InputJsonValue = {
        method: req.method,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2))
      };

      void prisma.activityLog
        .create({
          data: {
            tenantId: req.tenant?.tenantId ?? null,
            userId: req.user?.userId ?? null,
            action: "api.request",
            entityType: "HTTP",
            entityId: req.originalUrl,
            ipAddress: req.ip,
            userAgent: req.get("user-agent") ?? null,
            payload
          }
        })
        .catch(() => {
          // Suppress logging persistence failures to avoid blocking requests.
        });
    }
  });

  next();
};
