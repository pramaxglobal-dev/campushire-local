import type { NextFunction, Request, Response } from "express";
import { getCsrfTokenFromCookie } from "../lib/auth-cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = getCsrfTokenFromCookie(req);
  const headerToken = req.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      data: null,
      error: "Invalid CSRF token"
    });
    return;
  }

  next();
};
