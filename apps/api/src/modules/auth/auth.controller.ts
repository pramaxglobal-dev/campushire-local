import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import {
  clearAuthCookies,
  getRefreshTokenFromCookie,
  setAuthCookies,
  setCsrfCookie
} from "../../lib/auth-cookies";
import {
  ForgotPasswordSchema,
  LoginSchema,
  OAuthCallbackStateSchema,
  ResendVerificationSchema,
  RefreshTokenSchema,
  RegisterSchema,
  ResetPasswordSchema,
  VerifyEmailSchema
} from "./auth.schema";
import {
  forgotPassword,
  getMe,
  googleOAuthCallback,
  linkedinOAuthCallback,
  login,
  logout,
  resendVerificationEmail,
  refreshToken,
  register,
  resetPassword,
  verifyEmail,
  type OAuthProfile,
  type OAuthState
} from "./auth.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const getRedirectBase = (): string => `${env.CORS_ORIGIN}/auth/callback`;

const buildSuccessRedirectUrl = (
  accessToken: string,
  refreshTokenValue: string,
  isNew: boolean
): string => {
  const params = new URLSearchParams({
    accessToken,
    refreshToken: refreshTokenValue,
    isNew: String(isNew)
  });

  return `${getRedirectBase()}?${params.toString()}`;
};

const buildErrorRedirectUrl = (message: string): string => {
  const params = new URLSearchParams({
    error: message
  });

  return `${getRedirectBase()}?${params.toString()}`;
};

const decodeOAuthState = (stateParam: unknown): OAuthState => {
  if (typeof stateParam !== "string" || !stateParam.trim()) {
    throw new ControllerError("Missing OAuth state", 400);
  }

  try {
    const decoded = Buffer.from(stateParam, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as unknown;
    const state = OAuthCallbackStateSchema.parse(parsed);
    if (!state.role) {
      throw new ControllerError("Invalid OAuth state", 400);
    }
    return {
      role: state.role,
      inviteCode: state.inviteCode
    };
  } catch {
    throw new ControllerError("Invalid OAuth state", 400);
  }
};

const getOAuthProfileFromRequest = (req: Request): OAuthProfile => {
  const profile = req.user as unknown;

  if (!profile || typeof profile !== "object") {
    throw new ControllerError("OAuth profile missing", 401);
  }

  const casted = profile as Partial<OAuthProfile>;
  if (typeof casted.id !== "string") {
    throw new ControllerError("OAuth profile invalid", 401);
  }

  return casted as OAuthProfile;
};

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = RegisterSchema.parse(req.body);
    const result = await register(dto);

    res.status(201).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = LoginSchema.parse(req.body);
    const result = await login(dto, req.ip || "unknown-ip", req.headers["user-agent"]);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    setCsrfCookie(res);

    res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookieRefreshToken = getRefreshTokenFromCookie(req);
    const parsed = RefreshTokenSchema.safeParse(req.body);
    const refreshTokenValue = cookieRefreshToken ?? (parsed.success ? parsed.data.refreshToken : null);

    if (!refreshTokenValue) {
      throw new ControllerError("refreshToken is required", 400);
    }

    const result = await refreshToken(refreshTokenValue);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    setCsrfCookie(res);

    res.status(200).json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookieRefreshToken = getRefreshTokenFromCookie(req);
    const parsed = RefreshTokenSchema.safeParse(req.body);
    const refreshTokenValue = cookieRefreshToken ?? (parsed.success ? parsed.data.refreshToken : null);

    if (!refreshTokenValue) {
      throw new ControllerError("refreshToken is required", 400);
    }

    await logout(refreshTokenValue);
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      data: { message: "Logged out" },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = VerifyEmailSchema.parse(req.body);
    await verifyEmail(dto.token);

    res.status(200).json({
      success: true,
      data: { message: "Email verified" },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = ForgotPasswordSchema.parse(req.body);
    await forgotPassword(dto.email);

    res.status(200).json({
      success: true,
      data: { message: "If the email exists, reset instructions were sent." },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = ResendVerificationSchema.parse(req.body);
    await resendVerificationEmail(dto.email);

    res.status(200).json({
      success: true,
      data: { message: "If the email exists, verification instructions were sent." },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = ResetPasswordSchema.parse(req.body);
    await resetPassword(dto.token, dto.newPassword);

    res.status(200).json({
      success: true,
      data: { message: "Password reset successful" },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const googleOAuthCallbackController = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const profile = getOAuthProfileFromRequest(req);
    const state = decodeOAuthState(req.query.state);

    const result = await googleOAuthCallback(
      profile,
      state,
      req.ip || "unknown-ip",
      req.headers["user-agent"]
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    setCsrfCookie(res);
    res.redirect(buildSuccessRedirectUrl(result.accessToken, result.refreshToken, result.isNew));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth failed";
    res.redirect(buildErrorRedirectUrl(message));
    return;
  }
};

export const linkedinOAuthCallbackController = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const profile = getOAuthProfileFromRequest(req);
    const state = decodeOAuthState(req.query.state);

    const result = await linkedinOAuthCallback(
      profile,
      state,
      req.ip || "unknown-ip",
      req.headers["user-agent"]
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    setCsrfCookie(res);
    res.redirect(buildSuccessRedirectUrl(result.accessToken, result.refreshToken, result.isNew));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth failed";
    res.redirect(buildErrorRedirectUrl(message));
    return;
  }
};

export const getMeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      throw new ControllerError("Unauthorized", 401);
    }

    const user = await getMe(req.user.userId);

    res.status(200).json({
      success: true,
      data: user,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
