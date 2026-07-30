import type { NextFunction, Request, Response } from "express";
import type { SubRole, UserRole } from "@campushire/types";

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
      console.log("RBAC FORBIDDEN user:", JSON.stringify(req.user), "expected roles:", JSON.stringify(roles));
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

export const requireSubRole = (...subRoles: SubRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        data: null,
        error: "Unauthorized"
      });
      return;
    }

    const effectiveSubRole = req.user.subRole ?? ("OWNER" as SubRole);

    if (subRoles.length > 0 && !subRoles.includes(effectiveSubRole)) {
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
