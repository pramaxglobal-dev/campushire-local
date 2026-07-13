import type { NextFunction, Request, Response } from "express";
import {
  getAccessTokenFromCookie,
  getCsrfTokenFromCookie,
  getRefreshTokenFromCookie
} from "../lib/auth-cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// These routes create sessions and issue the CSRF token — they cannot have
// a prior CSRF token, so exempting them is correct and intentional.
// NOTE: paths are relative to the /api mount point (req.path strips the /api prefix).
const CSRF_EXEMPT_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/google/callback",
  "/auth/linkedin/callback",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/resend-verification"
]);

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Exempt session-creation routes that bootstrap the CSRF cookie.
  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  // Native clients authenticate with a Bearer token and do not carry browser cookies.
  // CSRF applies when the browser can authenticate the request from cookies alone.
  if (!getAccessTokenFromCookie(req) && !getRefreshTokenFromCookie(req)) {
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
