import type { NextFunction, Request, Response } from "express";
import { APPROVAL_REQUIRED_ROLES } from "../lib/user-guards";

export const requireApproval = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      data: null,
      error: "Unauthorized"
    });
    return;
  }

  if (!(APPROVAL_REQUIRED_ROLES as readonly string[]).includes(req.user.role)) {
    next();
    return;
  }

  if (!req.user.isApproved) {
    res.status(403).json({
      success: false,
      data: null,
      error: "Account pending approval"
    });
    return;
  }

  next();
};
