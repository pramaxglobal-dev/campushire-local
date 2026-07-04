import type { NextFunction, Request, Response } from "express";
import { SubRole } from "@campushire/types";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../lib/jwt";
import { isUserSuspended } from "../lib/user-guards";
import { getAccessTokenFromCookie } from "../lib/auth-cookies";

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.replace("Bearer ", "").trim();
};

const extractAuthToken = (req: Request): string | null => {
  return extractBearerToken(req) ?? getAccessTokenFromCookie(req);
};

const attachUserToRequest = async (req: Request, token: string): Promise<void> => {
  const payload = verifyAccessToken(token);
  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      tenantId: payload.tenantId ?? null
    },
    select: {
      id: true,
      role: true,
      tenantId: true,
      subRole: true,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
      metadata: true
    }
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isSuspended = isUserSuspended(user);
  req.user = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    subRole: user.subRole ?? SubRole.MEMBER,
    isEmailVerified: user.isEmailVerified,
    isApproved: user.isApproved,
    isSuspended
  };
};

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractAuthToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized"
      });
      return;
    }

    await attachUserToRequest(req, token);
    if (req.user?.isSuspended) {
      res.status(403).json({
        success: false,
        data: null,
        error: "Account suspended"
      });
      return;
    }
    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      data: null,
      error: "Unauthorized"
    });
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractAuthToken(req);
    if (!token) {
      next();
      return;
    }
    await attachUserToRequest(req, token);
    next();
  } catch (_error) {
    next();
  }
};
