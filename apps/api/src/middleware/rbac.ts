import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@campushire/types";

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized"
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        data: null,
        error: "Forbidden"
      });
      return;
    }

    next();
  };
};
