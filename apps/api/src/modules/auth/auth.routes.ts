import { Router, type NextFunction, type Request, type Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as LinkedInStrategy, type Profile as LinkedInProfile } from "passport-linkedin-oauth2";
import { env } from "../../config/env";
import { authRateLimiter } from "../../middleware/rate-limit";
import { authenticateJWT } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  forgotPasswordController,
  getMeController,
  googleOAuthCallbackController,
  linkedinOAuthCallbackController,
  loginController,
  logoutController,
  resendVerificationController,
  refreshTokenController,
  registerController,
  resetPasswordController,
  verifyEmailController
} from "./auth.controller";
import {
  ForgotPasswordSchema,
  LoginSchema,
  ResendVerificationSchema,
  RegisterSchema,
  ResetPasswordSchema,
  VerifyEmailSchema
} from "./auth.schema";

const router = Router();

const isGoogleOAuthConfigured =
  Boolean(env.GOOGLE_CLIENT_ID) &&
  Boolean(env.GOOGLE_CLIENT_SECRET) &&
  Boolean(env.GOOGLE_CALLBACK_URL);

const isLinkedInOAuthConfigured =
  Boolean(env.LINKEDIN_CLIENT_ID) &&
  Boolean(env.LINKEDIN_CLIENT_SECRET) &&
  Boolean(env.LINKEDIN_CALLBACK_URL);

const googleStatePassThrough = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const stateParam = typeof req.query.state === "string" ? req.query.state : "";

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: stateParam
  })(req, _res, next);
};

const linkedInStatePassThrough = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const stateParam = typeof req.query.state === "string" ? req.query.state : "";

  passport.authenticate("linkedin", {
    scope: ["r_emailaddress", "r_liteprofile"],
    session: false,
    state: stateParam
  })(req, _res, next);
};

const requireGoogleOAuthConfigured = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isGoogleOAuthConfigured) {
    res.status(503).json({
      success: false,
      data: null,
      error: "Google OAuth is not configured"
    });
    return;
  }
  next();
};

const requireLinkedInOAuthConfigured = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isLinkedInOAuthConfigured) {
    res.status(503).json({
      success: false,
      data: null,
      error: "LinkedIn OAuth is not configured"
    });
    return;
  }
  next();
};

if (isGoogleOAuthConfigured) {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID as string,
        clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: env.GOOGLE_CALLBACK_URL as string,
        passReqToCallback: true
      },
      (
        _req: Request,
        _accessToken: string,
        _refreshToken: string,
        _params: unknown,
        profile: GoogleProfile,
        done: (error: Error | null, user?: Express.User | false) => void
      ) => {
        done(null, profile as unknown as Express.User);
      }
    )
  );
}

if (isLinkedInOAuthConfigured) {
  passport.use(
    "linkedin",
    new LinkedInStrategy(
      {
        clientID: env.LINKEDIN_CLIENT_ID as string,
        clientSecret: env.LINKEDIN_CLIENT_SECRET as string,
        callbackURL: env.LINKEDIN_CALLBACK_URL as string,
        scope: ["r_emailaddress", "r_liteprofile"],
        state: true
      },
      (...args: unknown[]) => {
        const profile = args[2] as LinkedInProfile;
        const done = args[3] as (error: Error | null, user?: unknown) => void;
        done(null, profile);
      }
    ) as unknown as Parameters<typeof passport.use>[1]
  );
}

router.post("/register", validate({ body: RegisterSchema }), registerController);
router.post("/login", validate({ body: LoginSchema }), authRateLimiter, loginController);
router.post("/refresh", refreshTokenController);
router.post("/logout", authenticateJWT, logoutController);
router.post("/verify-email", validate({ body: VerifyEmailSchema }), verifyEmailController);
router.post(
  "/resend-verification",
  authRateLimiter,
  validate({ body: ResendVerificationSchema }),
  resendVerificationController
);
router.post("/forgot-password", authRateLimiter, validate({ body: ForgotPasswordSchema }), forgotPasswordController);
router.post("/reset-password", validate({ body: ResetPasswordSchema }), resetPasswordController);

router.get("/google", requireGoogleOAuthConfigured, googleStatePassThrough);
router.get(
  "/google/callback",
  requireGoogleOAuthConfigured,
  passport.authenticate("google", { session: false }),
  googleOAuthCallbackController
);

router.get("/linkedin", requireLinkedInOAuthConfigured, linkedInStatePassThrough);
router.get(
  "/linkedin/callback",
  requireLinkedInOAuthConfigured,
  passport.authenticate("linkedin", { session: false }),
  linkedinOAuthCallbackController
);

router.get("/me", authenticateJWT, getMeController);

export { router as authRoutes };
