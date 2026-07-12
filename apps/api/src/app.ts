import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import passport from "passport";
import { env } from "./config/env";
import { sanitizeBody } from "./lib/sanitize";
import { setupSwaggerDocs } from "./docs/swagger";
import { requestLogger } from "./middleware/request-logger";
import { tenantResolver } from "./middleware/tenant-resolver";
import { apiRateLimiter } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";
import { csrfProtection } from "./middleware/csrf";
import { authRoutes } from "./modules/auth/auth.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { tenantsRoutes } from "./modules/tenants/tenants.routes";
import { whitelabelRoutes } from "./modules/whitelabel/whitelabel.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { inviteRoutes } from "./modules/invites/invites.routes";
import { connectionRoutes } from "./modules/connections/connections.routes";
import { jobRoutes } from "./modules/jobs/jobs.routes";
import { applicationRoutes } from "./modules/applications/applications.routes";
import { atsRoutes } from "./modules/ats/ats.routes";
import { interviewRoutes } from "./modules/interviews/interviews.routes";
import { notificationRoutes } from "./modules/notifications/notifications.routes";
import { eventRoutes } from "./modules/events/events.routes";
import { freelanceRoutes } from "./modules/freelance/freelance.routes";
import { vendorRoutes, serviceRequestRoutes } from "./modules/vendors/vendors.routes";
import { courseRoutes, trainingRoutes } from "./modules/training/training.routes";
import { documentRoutes } from "./modules/documents/documents.routes";
import { chatRoutes } from "./modules/chat/chat.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { paymentsRoutes } from "./modules/payments/payments.routes";

const app = express();
const defaultAllowedOrigins = ["http://localhost:3000", "https://campushire-web-8bwf.vercel.app"];
const configuredOrigins = env.CORS_ORIGIN
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const allowedOrigins = [...new Set([...configuredOrigins, ...defaultAllowedOrigins])];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.amazonaws.com",
          "https://lh3.googleusercontent.com"
        ],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", ...allowedOrigins]
      }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  })
);
app.use(compression());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    req.body = sanitizeBody(req.body as Record<string, unknown>);
  }
  next();
});
app.use(requestLogger);
app.use(tenantResolver);
app.use("/api", apiRateLimiter);
app.use("/api", csrfProtection);
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/tenants", tenantsRoutes);
app.use("/api/whitelabel", whitelabelRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/ats", atsRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/freelance", freelanceRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", paymentsRoutes);

if (env.NODE_ENV !== "production") {
  setupSwaggerDocs(app);
}

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? "1.0.0"
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data: null,
    error: "Route not found"
  });
});

app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  errorHandler(error, req, res, next);
});

export { app };
