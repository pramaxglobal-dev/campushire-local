import crypto from "crypto";
import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";

export const AUTH_COOKIE_NAMES = {
  access: "campushire_access_token",
  refresh: "campushire_refresh_token",
  csrf: "campushire_csrf_token"
} as const;

const parseDurationToMs = (duration: string): number => {
  if (/^\d+$/.test(duration)) {
    return Number(duration) * 1000;
  }

  const match = duration.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error("Invalid token expiry configuration.");
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const factors: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
  };

  if (!unit || !factors[unit]) {
    throw new Error("Invalid token expiry configuration.");
  }

  return amount * factors[unit];
};

const isProduction = env.NODE_ENV === "production";
const sameSite: CookieOptions["sameSite"] = "lax";

const baseCookieOptions = (maxAge: number, path: string, httpOnly: boolean): CookieOptions => ({
  httpOnly,
  secure: isProduction,
  sameSite,
  path,
  maxAge
});

export const getAccessCookieOptions = (): CookieOptions =>
  baseCookieOptions(parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN), "/", true);

export const getRefreshCookieOptions = (): CookieOptions =>
  baseCookieOptions(parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN), "/api/auth", true);

export const getRefreshCookieClearOptions = (): CookieOptions => {
  const { maxAge: _maxAge, ...options } = getRefreshCookieOptions();
  return options;
};

export const getCsrfCookieOptions = (): CookieOptions =>
  baseCookieOptions(parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN), "/", false);

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie(AUTH_COOKIE_NAMES.access, accessToken, getAccessCookieOptions());
  res.cookie(AUTH_COOKIE_NAMES.refresh, refreshToken, getRefreshCookieOptions());
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAMES.access, getAccessCookieOptions());
  res.clearCookie(AUTH_COOKIE_NAMES.refresh, getRefreshCookieClearOptions());
  res.clearCookie(AUTH_COOKIE_NAMES.csrf, getCsrfCookieOptions());
};

export const createCsrfToken = (): string => crypto.randomBytes(32).toString("hex");

export const setCsrfCookie = (res: Response, token: string = createCsrfToken()): string => {
  res.cookie(AUTH_COOKIE_NAMES.csrf, token, getCsrfCookieOptions());
  return token;
};

export const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValueParts] = part.split("=");
    const name = rawName?.trim();
    if (!name) {
      return cookies;
    }
    try {
      cookies[name] = decodeURIComponent(rawValueParts.join("=").trim());
    } catch {
      cookies[name] = rawValueParts.join("=").trim();
    }
    return cookies;
  }, {});
};

export const getCookieValue = (req: Request, name: string): string | null => {
  return parseCookies(req.headers.cookie)[name] ?? null;
};

export const getAccessTokenFromCookie = (req: Request): string | null =>
  getCookieValue(req, AUTH_COOKIE_NAMES.access);

export const getRefreshTokenFromCookie = (req: Request): string | null =>
  getCookieValue(req, AUTH_COOKIE_NAMES.refresh);

export const getCsrfTokenFromCookie = (req: Request): string | null =>
  getCookieValue(req, AUTH_COOKIE_NAMES.csrf);
