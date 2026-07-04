# CampusHire Technical Audit

Generated from source inspection of `C:\Users\A\Desktop\CampusHire - Talentor Edge\campushire` on 2026-07-03.

This report uses source files as ground truth. Existing files such as `audit_api_routes_enriched.json`, `audit_prisma_models.json`, and `docs/*` were treated as supporting machine inventories only where they matched the checked source. Important caveat: the route JSON does not understand module-level `router.use(...)`, so auth was verified directly from route files.

## 1. PROJECT OVERVIEW

CampusHire is a multi-tenant campus hiring platform. The code implements:

- Public auth, onboarding, email verification, password reset, OAuth login.
- Student/job-seeker job discovery, applications, saved jobs, documents, interviews, courses, events, notifications, chat.
- Corporate recruiter job posting, approval workflow, ATS kanban, candidate review, interview scheduling.
- College admin placement events, invite codes, recruiter connections, analytics.
- Freelance recruiter referrals/invoices.
- Vendor/service-request flows for document/background/manpower services.
- Training partner courses/enrollments/revenue.
- Super-admin tenant/user/settings/feature-flag controls.
- AI scoring/matching service backed by FastAPI and Postgres.

Evidence:

```ts
// apps/api/src/app.ts
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
```

Type of app: npm workspaces monorepo with multiple deployable services, not a monolith:

- `apps/api`: Express REST API plus Socket.IO and cron.
- `apps/web`: Next.js web app.
- `apps/mobile`: Expo React Native app.
- `apps/ai`: FastAPI service.
- `packages/types`, `packages/utils`, `packages/ui`, `packages/config`: shared libraries/config.
- `prisma`: shared Postgres schema and seed data.

Entry points:

- API: `apps/api/src/server.ts`.
- API Express app: `apps/api/src/app.ts`.
- Web: `apps/web/src/app/layout.tsx`, route pages under `apps/web/src/app/**/page.tsx`, middleware at `apps/web/middleware.ts`.
- Mobile: `apps/mobile/package.json` has `"main": "expo-router/entry"` and route files under `apps/mobile/src/app`.
- AI: `apps/ai/app/main.py`, Docker command `uvicorn app.main:app`.
- Database schema: `prisma/schema.prisma`.
- Seed: `prisma/seed.ts`.

## 2. TECH STACK

Root package evidence:

```json
// package.json
"workspaces": ["apps/*", "packages/*"],
"scripts": {
  "build": "turbo run build",
  "dev": "turbo run dev",
  "db:generate": "prisma generate --schema=./prisma/schema.prisma",
  "db:push": "prisma db push --schema=./prisma/schema.prisma",
  "db:migrate": "prisma migrate deploy --schema=./prisma/schema.prisma",
  "db:seed": "ts-node --project prisma/tsconfig.json prisma/seed.ts"
},
"packageManager": "npm@10.8.2"
```

Languages:

- TypeScript 5.4.x across API/web/mobile/packages.
- Python 3.11 target for AI Docker image.
- Prisma schema for database modeling.
- CSS/Tailwind for web UI.

Backend/API:

- Express `^4.19.0`.
- Prisma Client `^5.14.0`.
- PostgreSQL datasource.
- Redis via `ioredis ^5.3.2`.
- Socket.IO `^4.7.5`.
- JWT via `jsonwebtoken ^9.0.2`.
- Validation via `zod ^3.23.0`.
- Passport Google/LinkedIn OAuth.
- Nodemailer, Twilio, Firebase Admin, AWS S3 SDK, Razorpay.

Frontend web:

- Next.js `14.2.3`.
- React `^18.3.0`.
- Axios `^1.7.0`.
- Zustand `^4.5.0`.
- React Hook Form, Zod, Radix UI, Tailwind, Framer Motion, Lucide, Sonner, Socket.IO client.

Mobile:

- Expo `~51.0.0`.
- Expo Router `~3.5.0`.
- React Native `0.74.1`.
- React `18.2.0`.
- Secure Store, Expo Notifications, Zustand, Axios.

AI service:

```txt
// apps/ai/requirements.txt
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.1
pydantic-settings==2.2.1
asyncpg==0.29.0
sqlalchemy[asyncio]==2.0.30
python-jose[cryptography]==3.3.0
httpx==0.27.0
scikit-learn==1.4.2
numpy==1.26.4
```

Database and ORM:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
generator client {
  provider = "prisma-client-js"
}
```

Dependency risk from `npm audit --omit=dev --json`:

- 60 production vulnerabilities total: 2 critical, 26 high, 30 moderate, 2 low.
- Critical/high notable packages: `shell-quote`, `expo`, `@expo/cli`, `@xmldom/xmldom`, `tar`, `ws`, `undici`, `protobufjs`, `@grpc/grpc-js`, `@remix-run/server-runtime`.
- Many fixes require major upgrades: Expo 51 to Expo 57, React Native 0.74 to 0.86, Firebase Admin 12 to 14, React Email 0.x to 1.x.
- `multer ^1.4.5-lts.1` is used. This is an old line; verify current advisory status before production exposure.
- `Next.js 14.2.3` is old relative to the current date and should be reviewed against Next security releases.

## 3. ARCHITECTURE

Top-level structure:

| Path | Purpose |
| --- | --- |
| `.github/workflows/ci.yml` | GitHub Actions validation, backend, frontend, AI, Docker jobs. |
| `apps/api` | Express REST API, Socket.IO server, cron, integrations. |
| `apps/web` | Next.js App Router web frontend. |
| `apps/mobile` | Expo Router React Native mobile frontend. |
| `apps/ai` | FastAPI AI matching/scoring service. |
| `packages/types` | Shared TS enums/interfaces matching domain concepts. |
| `packages/utils` | Shared formatting/utility helpers. |
| `packages/ui` | Shared React UI primitives. |
| `packages/config` | Shared TypeScript/Tailwind/ESLint config. |
| `prisma` | Prisma schema and seed script. |
| `docs` | Existing handover/audit notes from previous work. |
| `scripts` | Operational scripts, currently demo password reset. |
| `audit_*.json` | Generated audit inventories. |

API pattern:

- Express `app.ts` composes global middleware then mounts module routers.
- Each module usually has `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.schema.ts`.
- Controllers parse `req`, call services, return envelope `{ success, data, error }`.
- Services use Prisma directly. There is no repository layer.
- Validation uses module Zod schemas with `middleware/validate.ts`.
- Authorization is middleware-driven (`authenticateJWT`, `requireRole`, `requireApproval`).

Bootstrap flow:

```ts
// apps/api/src/server.ts
const server = createServer(app);
const io = initSocket(server);
await prisma.$queryRaw`SELECT 1`;
if (redis.status !== "ready") {
  await redis.connect();
}
await redis.ping();
server.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT, env: env.NODE_ENV }, "API server started");
});
cron.schedule("0 * * * *", () => {
  runInterviewReminderJob().catch(...);
});
```

Global API middleware:

```ts
// apps/api/src/app.ts
app.use(helmet(...));
app.use(compression());
app.use(cors({ origin: ..., credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);
app.use(tenantResolver);
app.use("/api", apiRateLimiter);
app.use(passport.initialize());
```

Design patterns found:

- Modular MVC-ish API (`routes` -> `controller` -> `service`).
- Service layer with direct Prisma access.
- Shared DTO/schema validation with Zod.
- Middleware auth/RBAC/approval.
- Event-ish notification helper (`lib/notification.ts`) invoked by business services.
- Socket.IO room pattern (`user:{id}`, `tenant:{id}`, `thread:{id}`).
- AI side uses FastAPI routers + service functions + raw SQL via SQLAlchemy text queries.

## 4. DATABASE

There are 45 Prisma models and many enums. There is no `prisma/migrations` directory, so migration history is not checked in. The root script `db:migrate` expects migrations, but none exist locally; current schema appears to be managed by `prisma db push`.

Schema model inventory from `prisma/schema.prisma`:

| Model | Main columns / relationships |
| --- | --- |
| `Tenant` | `id`, `name`, `slug @unique`, `plan`, active/white-label flags, support fields, settings; parent for users, jobs, events, courses, notifications, configs. |
| `User` | `id`, `tenantId`, `tin @unique`, `email @unique`, `phone @unique`, `passwordHash`, names, avatar, role/subRole, visibility, approval/email/phone/active flags, metadata; owns profile and workflow relations. |
| `RefreshToken` | user refresh token hashes, expiry/revocation. |
| `EmailVerification` | email verification token, expiry, verified timestamp. |
| `PasswordReset` | reset token, expiry, used timestamp. |
| `OAuthAccount` | OAuth provider/account id, access/refresh/id tokens, scopes. |
| `CollegeProfile` | tenant/admin user, name/slug, placement contact, address, streams, openForPlacement; students/jobs/events/connections. |
| `StudentProfile` | user/tenant/college, enrollment/program/year/cgpa/skills/resume/career score/preferences/socials. |
| `RecruiterProfile` | company data, verification, hiringNow/openJobsCount, jobs/connections/referrals/events. |
| `FreelanceRecruiterProfile` | agency/specialization/commission/verification/referral counts. |
| `VendorProfile` | vendor type, business/pricing/service area/turnaround/verification/active. |
| `TrainingPartnerProfile` | organization, verification, platform fee, courses/revenues. |
| `JobSeekerProfile` | non-student candidate experience/location/skills/expected CTC/resume/career score. |
| `CandidateEducation` | education rows for candidate user. |
| `CandidateExperience` | work experience rows. |
| `CandidateCertification` | certification rows. |
| `CandidateProject` | project rows. |
| `Invite` | tenant/college invite code, uses/expiry/creator/active. |
| `InviteUse` | invite usage by user. |
| `CollegeRecruiterConnection` | college-recruiter connection status, initiator/responder, chat threads. |
| `Job` | recruiter/creator/optional college, title/slug, description, location/work mode/type/status/openings/CTC/skills/screening/referral/deadline/publishing stats. |
| `Application` | tenant/job/candidate, status/source/cover letter/screening answers/resume snapshot/timestamps. |
| `ApplicationStatusHistory` | application status transitions and changer. |
| `InterviewSlot` | application/job/candidate/interviewer/creator, round/mode/status/outcome/schedule/confirmation/reminder. |
| `SavedJob` | candidate-job bookmark. |
| `FreelanceReferral` | job/recruiter/freelancer/candidate/referrer, commission/status/timestamps. |
| `Invoice` | referral/service request invoice, issuer/billedTo, amounts/tax/status/due/paid. |
| `ServiceRequest` | requester/assignee/vendor/recruiter/job, type/status/title/payload/cost/due lifecycle. |
| `ManpowerCandidate` | service-request candidate lead. |
| `DocumentVerification` | service-request/vendor/document/requester/reviewer verification status. |
| `PlacementEvent` | college/recruiter/creator event, type/status/open/start/end/venue/capacity/deadline. |
| `EventParticipant` | event-user registration/attendance. |
| `Course` | tenant/training partner/creator, title/slug, description, skills, level/mode/duration/price/seats/active. |
| `CourseEnrollment` | course-user enrollment, status/progress/certificate. |
| `CourseRevenue` | course/enrollment/partner revenue split and payment status. |
| `UserDocument` | uploaded user document, S3 file key/url, verification status/verifier/meta. |
| `ChatThread` | tenant, context type, optional application/referral/service-request/connection, participants, lastMessage/isClosed. |
| `ChatMessage` | tenant/thread/sender, type/body/file/read fields. |
| `Notification` | tenant/user, type/channel/title/body/data/read/sent timestamps. |
| `NotificationPreference` | user/type/channel enabled flag. |
| `WhiteLabelConfig` | tenant unique, brand/logo/colors/domain/sender/css/powered-by. |
| `ActivityLog` | tenant/user/action/entity/payload/ip/userAgent. |
| `AIMatchScore` | tenant/job/application/candidate score, matched/missing/reasoning/calculatedAt. |
| `PlatformSetting` | tenant optional, unique key, JSON value/description. |
| `FeatureFlag` | tenant optional, key/plan/enabled/description. |

Enums include: `Plan`, `UserRole`, `SubRole`, `OAuthProvider`, `WorkMode`, `ProfileVisibility`, `CompanySize`, `VendorType`, `PricingModel`, `JobType`, `CommissionType`, `CommissionTrigger`, `JobStatus`, `ApplicationStatus`, `InterviewRound`, `InterviewMode`, `InterviewStatus`, `InterviewOutcome`, `ConnectionStatus`, `ReferralStatus`, `InvoiceStatus`, `ServiceRequestType`, `ServiceRequestStatus`, `PaymentStatus`, `DocumentType`, `VerificationStatus`, `EventType`, `EventStatus`, `ParticipantStatus`, `CourseLevel`, `CourseMode`, `EnrollmentStatus`, `ChatContextType`, `MessageType`, `NotificationType`, `NotificationChannel`, `SkillLevel`.

Key constraints visible in schema:

```prisma
// prisma/schema.prisma
model User {
  id    String  @id @default(cuid())
  tin   String  @unique
  email String  @unique
  phone String? @unique
}
model Job {
  id   String @id @default(cuid())
  slug String @unique
}
model WhiteLabelConfig {
  tenantId     String  @unique @map("tenant_id")
  customDomain String? @unique @map("custom_domain")
}
```

Raw SQL outside Prisma:

- API startup health query:

```ts
// apps/api/src/server.ts
await prisma.$queryRaw`SELECT 1`;
```

- AI service uses SQLAlchemy raw `text(...)` extensively:

```py
# apps/ai/app/routers/matching.py
rows = await db.execute(
    text("""
      SELECT u.id, u.role, sp.skills AS student_skills, ...
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN job_seeker_profiles js ON js.user_id = u.id
      WHERE u.id = :candidate_id
      LIMIT 1
    """),
    {"candidate_id": candidate_id},
)
```

Seed data:

- `prisma/seed.ts` creates demo tenants/users/profiles/jobs/events/courses/etc.
- It hashes seeded passwords:

```ts
// prisma/seed.ts
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
};
```

Security note: `DEMO_CREDENTIALS_SUMMARY.md` and `scripts/reset-demo-passwords.ts` document a shared demo password. That is acceptable only for non-production demo environments and must not be enabled against production data.

## 5. API SURFACE

Mounted base paths from `apps/api/src/app.ts`:

| Base path | Router |
| --- | --- |
| `/api/auth` | `authRoutes` |
| `/api/users` | `usersRoutes` |
| `/api/tenants` | `tenantsRoutes` |
| `/api/whitelabel` | `whitelabelRoutes` |
| `/api/admin` | `adminRoutes` |
| `/api/invites` | `inviteRoutes` |
| `/api/connections` | `connectionRoutes` |
| `/api/jobs` | `jobRoutes` |
| `/api/applications` | `applicationRoutes` |
| `/api/ats` | `atsRoutes` |
| `/api/interviews` | `interviewRoutes` |
| `/api/notifications` | `notificationRoutes` |
| `/api/events` | `eventRoutes` |
| `/api/freelance` | `freelanceRoutes` |
| `/api/vendors` | `vendorRoutes` |
| `/api/service-requests` | `serviceRequestRoutes` |
| `/api/courses` | `courseRoutes` |
| `/api/training` | `trainingRoutes` |
| `/api/documents` | `documentRoutes` |
| `/api/chat` | `chatRoutes` |
| `/api/analytics` | `analyticsRoutes` |
| `/api/payments` | `paymentsRoutes` |

Every route inventory, grouped by module. Auth values: `public`, `optional`, `JWT`, or module-wide JWT/role.

| Module | Routes |
| --- | --- |
| Auth | `POST /api/auth/register public`, `POST /api/auth/login public`, `POST /api/auth/refresh public`, `POST /api/auth/logout JWT`, `POST /api/auth/verify-email public`, `POST /api/auth/resend-verification public`, `POST /api/auth/forgot-password public`, `POST /api/auth/reset-password public`, `GET /api/auth/google public`, `GET /api/auth/google/callback public`, `GET /api/auth/linkedin public`, `GET /api/auth/linkedin/callback public`, `GET /api/auth/me JWT`. |
| Users | `GET /api/users/profile JWT`, `PUT /api/users/profile JWT`, `POST /api/users/avatar JWT`, `GET /api/users/activity JWT`. |
| Admin | Module-wide `authenticateJWT + SUPER_ADMIN`: users list/detail/approve/reject/suspend/unsuspend, stats, pending approvals, settings update, feature flags, broadcast. |
| Tenants | Module-wide `authenticateJWT + SUPER_ADMIN`: list/create/detail/update/toggle/stats. |
| Whitelabel | Module-wide `authenticateJWT + SUPER_ADMIN/COLLEGE_ADMIN/CORPORATE_RECRUITER`: config get/upsert, publish/unpublish, preview, logo/favicon upload. |
| Invites | `GET /api/invites/validate/:code public`, create/list/delete/stats require `COLLEGE_ADMIN`. |
| Connections | list/status/delete JWT; request requires `CORPORATE_RECRUITER + approval`; respond requires `COLLEGE_ADMIN + approval`; browse-colleges requires recruiter approval. |
| Jobs | list/detail `optionalAuth`; feed/saved/stats/create/update/submit/save/unsave require JWT; create/update/submit require recruiter approval; approve/reject require `SUPER_ADMIN`. |
| Applications | list/detail JWT; apply/withdraw/candidate-note require student/job-seeker; recruiter-note requires recruiter approval. |
| ATS | board/stats/application list/resume/move/shortlist/reject/bulk-move require `CORPORATE_RECRUITER`, most mutations require approval. |
| Interviews | list/detail JWT; schedule/reschedule/cancel/outcome require recruiter approval; confirm requires student/job-seeker approval. |
| Notifications | list/unread/read/delete/preferences all JWT; broadcast is admin module. |
| Events | list/detail `optionalAuth`; my JWT; create/update/delete/attendance require college admin approval; register/cancel registration require JWT approval. |
| Freelance | referrals/link/stats/invoices require `FREELANCE_RECRUITER`; mark-paid requires `SUPER_ADMIN`. |
| Vendors/service requests | vendor list/detail optional; service request list/create/update/rate JWT; vendor respond/complete requires `VENDOR`; stats requires `VENDOR`. |
| Courses/training | public-ish course list/detail optional; course create/update/publish/unpublish requires training partner; enroll/progress/my-enrollments JWT; partner courses/stats require training partner. |
| Documents | upload/list/delete/share/verify JWT; candidate documents require recruiter. |
| Chat | thread/message read/write/upload all JWT. |
| Analytics | student/recruiter/college/platform/freelance dashboards role-gated. |
| Payments | course order/verify JWT. |

Public and optional-auth routes that are intentionally exposed:

- Auth registration/login/refresh/email/password/OAuth.
- Invite validation.
- Public job listing/detail.
- Public event listing/detail.
- Public vendor/course listing/detail.

Potentially risky surface:

- Whitelabel mutating routes are not super-admin-only; college admin and corporate recruiter can publish/unpublish/upload config if the service does not further restrict tenant ownership. The route-level evidence:

```ts
// apps/api/src/modules/whitelabel/whitelabel.routes.ts
router.use(
  authenticateJWT,
  requireRole(UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.CORPORATE_RECRUITER)
);
router.post("/config", validate({ body: WhiteLabelConfigSchema }), upsertConfigController);
router.post("/publish", validate({ body: PublishSchema }), publishConfigController);
```

## 6. AUTH & PERMISSIONS

Mechanism:

- API uses JWT Bearer access tokens.
- Refresh tokens are JWTs but stored server-side as SHA-256 hashes in `RefreshToken`.
- Web stores tokens in `localStorage` and also non-HttpOnly cookies for Next middleware routing.
- Socket.IO authenticates with the same access token.
- OAuth uses Passport Google and LinkedIn.

JWT middleware:

```ts
// apps/api/src/middleware/auth.ts
const token = extractBearerToken(req);
if (!token) {
  res.status(401).json({ success: false, data: null, error: "Unauthorized" });
  return;
}
await attachUserToRequest(req, token);
if (req.user?.isSuspended) {
  res.status(403).json({ success: false, data: null, error: "Account suspended" });
  return;
}
```

RBAC:

```ts
// apps/api/src/middleware/rbac.ts
export const requireRole = (...roles: UserRole[]) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) { ... }
    next();
  };
};
```

Approval gate:

```ts
// apps/api/src/middleware/approval.ts
if (approvalRequiredRoles.has(req.user.role) && !req.user.isApproved) {
  res.status(403).json({ success: false, data: null, error: "Account pending approval" });
  return;
}
```

Frontend auth persistence:

```ts
// apps/web/src/lib/store/auth.store.ts
writeStorage(ACCESS_KEY, accessToken);
writeStorage(REFRESH_KEY, refreshToken);
setCookie("campushire_access_token", accessToken);
setCookie("campushire_refresh_token", refreshToken);
```

Security red flag: auth cookies are written from JS without `HttpOnly` or `Secure`; access/refresh tokens are in `localStorage`, which increases impact of XSS. Cookies are used by `apps/web/middleware.ts` only for routing decisions, while API auth uses Authorization headers.

Secrets:

- `.env` exists in repo root and contains values for database, Redis, JWT, OAuth, AWS, SMTP, Twilio, Firebase, Razorpay, AI service, and app URLs. I did not print the values.
- `.env.example` contains placeholder values, including weak examples such as `your-access-secret-min-32-chars` and local DB passwords.
- `docker-compose.yml` has default local Postgres password fallback `${POSTGRES_PASSWORD:-password}`.
- `DEMO_CREDENTIALS_SUMMARY.md` and `scripts/reset-demo-passwords.ts` contain demo password material. Treat as sensitive operational documentation, not production config.

## 7. CORE BUSINESS LOGIC / MODULES

Auth:

- Entry: `/api/auth/*`, `apps/api/src/modules/auth/*`, web `LoginForm`, `RegisterForm`, `auth.store.ts`.
- Data: `User`, `RefreshToken`, `EmailVerification`, `PasswordReset`, `OAuthAccount`.
- Critical logic: token expiry parsing, refresh-token rotation/revocation, invite-aware registration, approval/email checks.

Jobs:

- Entry: `/api/jobs`, `apps/api/src/modules/jobs/*`, web `apps/web/src/lib/api/jobs.api.ts`.
- Data: `Job`, `SavedJob`, `Application`, `AIMatchScore`.
- Critical logic: job status transitions (`DRAFT` -> approval -> `ACTIVE`), recruiter ownership, AI matching trigger.

Applications/ATS:

- Entry: `/api/applications`, `/api/ats`.
- Data: `Application`, `ApplicationStatusHistory`, `InterviewSlot`, `ChatThread`.
- Critical logic: duplicate application prevention, candidate vs recruiter notes, Kanban movement, notification triggers.

Interviews:

- Entry: `/api/interviews`, cron `runInterviewReminderJob`.
- Data: `InterviewSlot`.
- External: email/WhatsApp notifications.
- Critical logic: schedule/reschedule/cancel/outcome and hourly reminder deduplication via `reminderSent`.

College/recruiter connections:

- Entry: `/api/connections`.
- Data: `CollegeRecruiterConnection`, `ChatThread`.
- Critical logic: who can initiate/respond and tenant scoping.

Documents/vendors/service requests:

- Entry: `/api/documents`, `/api/vendors`, `/api/service-requests`.
- Data: `UserDocument`, `DocumentVerification`, `ServiceRequest`, `VendorProfile`.
- External: S3 upload/delete/presigned URLs.
- Critical logic: file validation, ownership, verification request routing.

Training/courses/payments:

- Entry: `/api/courses`, `/api/training`, `/api/payments`.
- Data: `Course`, `CourseEnrollment`, `CourseRevenue`, payment status.
- External: Razorpay.
- Critical logic: payment signature verification, enrollment/revenue creation.

AI matching/scoring:

- API caller: `apps/api/src/lib/ai.ts`.
- AI service: `apps/ai/app/routers/matching.py`, `apps/ai/app/routers/scoring.py`.
- Data: candidate profiles, jobs, `AIMatchScore`, career score fields.
- Critical logic: raw SQL table/column names must stay in sync with Prisma mappings.

## 8. THIRD-PARTY INTEGRATIONS

| Integration | Files | Config |
| --- | --- | --- |
| PostgreSQL | `prisma/schema.prisma`, `apps/api/src/lib/prisma.ts`, `apps/ai/app/database.py` | `DATABASE_URL` |
| Redis | `apps/api/src/lib/redis.ts`, rate limit/cache | `REDIS_URL` |
| Google OAuth | `apps/api/src/modules/auth/auth.routes.ts/service.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, callback URL |
| LinkedIn OAuth | same auth module | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, callback URL |
| SMTP/Nodemailer | `apps/api/src/lib/mailer.ts` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |
| Twilio WhatsApp | `apps/api/src/lib/whatsapp.ts` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |
| Firebase push | `apps/api/src/lib/firebase.ts` | `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` |
| AWS S3 | `apps/api/src/lib/s3.ts` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` |
| Razorpay | `apps/api/src/lib/razorpay.ts`, `apps/api/src/modules/payments/*` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| AI service | `apps/api/src/lib/ai.ts`, `apps/ai/app/*` | `AI_SERVICE_URL`, `AI_SERVICE_KEY` / `api_service_key` |

Webhook status: I did not find dedicated inbound webhook routes for Razorpay, Twilio, or other providers. Payments use client-created orders and verification:

```ts
// apps/api/src/lib/razorpay.ts
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(payload).digest("hex");
  return expected === signature;
}
```

## 9. FRONTEND

Web structure:

- `apps/web/src/app/(public)`: public pages login/register/home/password/email.
- `apps/web/src/app/(dashboard)/dashboard/*`: real dashboard pages.
- `apps/web/src/app/(dashboard)/*`: many are re-export aliases to `/dashboard/*`.
- `apps/web/src/components/auth`, `chat`, `common`, `layout`, `ui`.
- `apps/web/src/lib/api/*.api.ts`: API client wrappers.
- `apps/web/src/lib/store`: Zustand stores.
- `apps/web/src/lib/hooks`: hooks for auth/user/tenant/notifications.

State management:

- Zustand for auth and UI.
- React local state in pages.
- No Redux/TanStack Query found.

API client:

```ts
// apps/web/src/lib/api/client.ts
export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Refresh handling queues pending 401 retries:

```ts
// apps/web/src/lib/api/client.ts
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    pendingResolvers.push((token) => { ... resolve(apiClient(originalRequest)); });
  });
}
```

Build/bundling:

- Next build via `apps/web/package.json`: `"build": "next build"`.
- Tailwind config at `apps/web/tailwind.config.ts`; shared preset in `packages/config/tailwind/preset.cjs`.
- Next middleware does auth redirects and whitelabel host probing.

Incomplete/placeholder signals:

- Many alias routes re-export dashboard pages, likely for backwards compatibility but adds route duplication.
- `apps/web/src/app/(dashboard)/dashboard/whitelabel/page.tsx` contains an input labeled `Password` in a white-label settings page; verify whether it is placeholder or unfinished custom-domain auth work.
- Existing `RUNTIME_AUDIT.md` flags previous issues such as remember-me not actually affecting persistence.

Mobile:

- Expo Router tabs under `apps/mobile/src/app/(tabs)`.
- Auth screens under `apps/mobile/src/app/(auth)`.
- API wrappers under `apps/mobile/src/lib/api`.
- Token storage uses Secure Store keys:

```ts
// apps/mobile/src/lib/store/auth.store.ts
const ACCESS_TOKEN_KEY = "campushire_access_token";
const REFRESH_TOKEN_KEY = "campushire_refresh_token";
```

## 10. BACKGROUND JOBS / CRON / QUEUES

Only one scheduled job was found:

```ts
// apps/api/src/server.ts
cron.schedule("0 * * * *", () => {
  runInterviewReminderJob().catch((error: unknown) => {
    logger.error({ error }, "Interview reminder cron failed");
  });
});
```

Job implementation:

```ts
// apps/api/src/jobs/interview-reminders.ts
import { sendInterviewReminders } from "../modules/interviews/interviews.service";
export async function runInterviewReminderJob(): Promise<void> {
  await sendInterviewReminders();
}
```

No queue worker framework such as BullMQ, Agenda, Temporal, or SQS consumer was found. Redis is used for rate limiting/cache, not durable jobs.

## 11. CONFIGURATION & ENVIRONMENT

Validated API env vars:

```ts
// apps/api/src/config/env.ts
DATABASE_URL, REDIS_URL,
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL,
LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_CALLBACK_URL,
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET,
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM,
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM,
FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL,
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
AI_SERVICE_URL, AI_SERVICE_KEY,
API_PORT, NODE_ENV, CORS_ORIGIN, NEXT_PUBLIC_API_URL
```

AI env:

```py
# apps/ai/app/config.py
class Settings(BaseSettings):
    database_url: str
    jwt_access_secret: str
    api_service_key: str
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:4000"]
    debug: bool = False
```

Hardcoded config/hacks:

- API CORS always includes `https://campushire-web-8bwf.vercel.app` in addition to env origins.
- Docker Compose has local default Postgres password `password`.
- Web middleware calls API whitelabel config from edge middleware on non-local hostnames; this creates runtime coupling between web middleware and API availability.

## 12. TESTING

No unit/integration/e2e test files or test runners were found in package scripts. Package scripts expose typecheck/lint/build but no `test`.

Verification run locally:

- `npx prisma validate --schema=./prisma/schema.prisma`: passed.
- `npx tsc --noEmit -p packages/types/tsconfig.json`: passed.
- `npx tsc --noEmit -p packages/utils/tsconfig.json`: passed.
- `npx tsc --noEmit -p packages/ui/tsconfig.json`: passed.
- `npx tsc --noEmit -p apps/api/tsconfig.json`: passed.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: passed.
- `npx tsc --noEmit -p apps/mobile/tsconfig.json`: passed.
- `python -m mypy app/ --ignore-missing-imports`: not run; Python is not installed on this Windows host.
- `python -m flake8 app/ --max-line-length=120`: not run; Python is not installed.
- `npm audit --omit=dev --json`: failed with vulnerability exit code and reported 60 production vulnerabilities.

CI intended checks:

```yaml
# .github/workflows/ci.yml
- run: npx prisma validate --schema=./prisma/schema.prisma
- run: npx tsc --noEmit -p packages/types/tsconfig.json
- run: npx tsc --noEmit -p packages/utils/tsconfig.json
- run: npx tsc --noEmit -p packages/ui/tsconfig.json
- run: npx tsc --noEmit -p apps/api/tsconfig.json
- run: npm run build --workspace=@campushire/web
- run: cd apps/ai && python -m mypy app/ --ignore-missing-imports
- run: cd apps/ai && python -m flake8 app/ --max-line-length=120
```

Coverage gaps: every module has zero automated test coverage in-repo, including auth, payments, file upload, RBAC, job approval, ATS status transitions, notifications, and AI matching.

## 13. TECHNICAL DEBT & RED FLAGS

High-risk issues:

1. No migration history checked in. `prisma/migrations` is absent while production-like scripts include `db:migrate`.
2. No automated tests.
3. `npm audit` reports 60 production vulnerabilities including critical/high transitive issues.
4. Web stores access and refresh tokens in `localStorage` and JS-accessible cookies.
5. `.env` exists in the repo root. Even if not tracked, it contains real secret locations and must be kept out of commits/backups.
6. AI service raw SQL must stay synchronized with Prisma column maps.
7. White-label route allows multiple business roles to mutate brand publishing; service-level tenant scoping needs careful review.
8. `apps/ai/app/__pycache__` files are present in the repo tree and should be ignored/removed.
9. `apps/web/tsconfig.tsbuildinfo` is present, a generated build artifact.
10. Existing audit JSON/docs are untracked according to `git status`, so the repo contains lots of local/generated audit artifacts not part of committed source.

TODO/FIXME/HACK/XXX:

- Search found no conventional `TODO`, `FIXME`, or `XXX` comments in source except enum value `HACKATHON` in `prisma/schema.prisma`.
- Operational warnings exist in `scripts/reset-demo-passwords.ts` for demo password resets.

Dead/unused best-effort:

- Route alias pages under `apps/web/src/app/(dashboard)/*` often just re-export `/dashboard/*`; not dead, but duplicated surface.
- Generated files: `apps/web/tsconfig.tsbuildinfo`, Python `__pycache__`, and root `audit_*.json` should not be source-of-truth application code.

Inconsistent patterns:

- API mostly uses Prisma services; AI service bypasses Prisma and uses raw SQL.
- Admin/tenant/whitelabel use module-level auth via `router.use`; many other modules repeat per-route middleware.
- Some routes are optional public listings while adjacent mutations require approval. This is expected but easy to misread.

## 14. DEPLOYMENT & BUILD

Build:

- Root: `npm run build` -> `turbo run build`.
- API: builds shared packages, runs `tsc`, then `tsc-alias`; starts `node dist/server.js`.
- Web: `next build`, production starts `next start` or Docker standalone server.
- Mobile: Expo start/android/ios, no production build scripts included.
- AI: Docker installs requirements and runs Uvicorn.

Docker Compose:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
  redis:
    image: redis:7-alpine
  api:
    dockerfile: apps/api/Dockerfile
  web:
    dockerfile: apps/web/Dockerfile
  ai:
    dockerfile: apps/ai/Dockerfile
```

API Dockerfile:

```dockerfile
# apps/api/Dockerfile
RUN npm ci --workspace=@campushire/api
RUN npm run db:generate
RUN npm run build --workspace=@campushire/api
CMD ["node", "dist/server.js"]
```

Web Dockerfile:

```dockerfile
# apps/web/Dockerfile
RUN npm ci --workspace=@campushire/web
RUN npm run db:generate
RUN npm run build --workspace=@campushire/web
CMD ["node", "apps/web/server.js"]
```

AI Dockerfile:

```dockerfile
# apps/ai/Dockerfile
FROM python:3.11-slim
RUN pip install --no-cache-dir -r requirements.txt
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Manual deployment steps implied:

- Provide full `.env` for API and AI.
- Run `npm run db:generate`.
- Run `npm run db:push` or create/deploy migrations; current repo lacks migrations.
- Seed only for demo/dev (`npm run db:seed`).
- Configure external services before enabling email/WhatsApp/push/S3/Razorpay/OAuth.

## 15. KNOWN GAPS

Incomplete or in-progress signals:

- No migrations.
- No tests.
- No webhook handlers for payment reconciliation.
- Mobile has only a subset of web functionality.
- AI service has no local runnable verification on this host due missing Python.
- Token persistence/remember-me policy appears unfinished per `RUNTIME_AUDIT.md`.
- Demo credential docs/scripts are present and need hard environment separation.
- Audit artifacts/docs are untracked and may not match committed code over time.
- There is no generated OpenAPI route source beyond Swagger comments for a limited set of auth endpoints.

## TOP 10 THINGS YOU NEED TO KNOW BEFORE TOUCHING THIS CODEBASE

1. The app is a four-service monorepo: Express API, Next web, Expo mobile, FastAPI AI.
2. Prisma schema is the only database history; no migrations are checked in.
3. There are no automated tests, so refactors must start with characterization tests or very small changes.
4. Auth uses JWT Bearer tokens, but the web stores tokens in `localStorage` and JS-readable cookies.
5. RBAC is route middleware plus approval middleware; missing either one changes security behavior fast.
6. `npm audit` reports 60 production vulnerabilities, including critical/high transitive issues.
7. AI matching/scoring uses raw SQL against Prisma-managed tables, so schema renames can silently break AI.
8. Most business logic is in module `*.service.ts` files, not controllers.
9. Integrations are broad: S3, SMTP, Twilio, Firebase, Razorpay, OAuth, Redis, Socket.IO, AI service.
10. Treat demo credentials, `.env`, generated audit JSON, build info, and `__pycache__` as cleanup/security work before serious development.
