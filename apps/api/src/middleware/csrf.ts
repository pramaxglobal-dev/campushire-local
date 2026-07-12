import type { NextFunction, Request, Response } from "express";
import {
  getAccessTokenFromCookie,
  getCsrfTokenFromCookie,
  getRefreshTokenFromCookie
} from "../lib/auth-cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
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
