# CampusHire Production Launch Plan

This is the founder/operator launch checklist for turning CampusHire from inherited code into a serious production product. It is intentionally direct: a premium product is not "done" until these gates are green.

## Current Launch Position

CampusHire has the skeleton of a real multi-sided hiring platform:

- Express API with role-based modules.
- Next.js web app.
- Expo mobile app.
- FastAPI AI service.
- Prisma/Postgres data model.
- Docker and CI foundations.

It is not ready for a public production launch until the blockers below are resolved.

## Launch Blockers

### P0: Security And Secrets

- [ ] Rotate all secrets listed in `SECRETS_ROTATION_CHECKLIST.md`.
- [ ] Store secrets only in the deployment secret manager, never in source or shared documents.
- [ ] Confirm `git ls-files .env apps/ai/.env` returns no tracked files.
- [ ] Replace local/demo credentials in every real environment.
- [ ] Remove or archive demo credential docs before sharing the repository externally.
- [ ] Move web auth tokens out of `localStorage` into secure, HttpOnly, SameSite cookies or a BFF/session pattern.
- [ ] Review every route using `optionalAuth` or broad role access.
- [ ] Add security headers and CSP testing for real production domains.

### P0: Database And Migrations

- [ ] Create a proper Prisma migration baseline.
- [ ] Stop using `prisma db push` for production changes.
- [ ] Add a staging database and run migrations there before production.
- [ ] Add rollback instructions for every migration.
- [ ] Back up production database before each release.

### P0: Payments

- [ ] Add Razorpay webhook handling for authoritative payment reconciliation.
- [ ] Verify payment order creation and signature verification under real Razorpay test mode.
- [ ] Ensure course enrollment/revenue is idempotent.
- [ ] Log payment events without exposing payment secrets.

### P0: Tests

- [ ] Add API integration tests for auth, RBAC, jobs, applications, ATS, payments, documents, notifications.
- [ ] Add web smoke/e2e tests for login, dashboard routing, job apply, recruiter ATS, course payment.
- [ ] Add AI service tests for scoring and matching.
- [ ] Make CI fail on test failures.

### P0: Vulnerabilities

- [ ] Resolve `npm audit --omit=dev` critical and high vulnerabilities.
- [ ] Plan major upgrades for Expo/React Native, Firebase Admin, and React Email dependencies.
- [ ] Re-run audit after lockfile changes.

## Production Hardening Already Applied

- [x] `docker-compose.yml` no longer falls back to weak Postgres password `password`.
- [x] Compose now requires `POSTGRES_PASSWORD`.
- [x] Compose now requires `NEXT_PUBLIC_API_URL` for web build/runtime.
- [x] Web app no longer has a hardcoded production API fallback URL.
- [x] Next production build no longer ignores ESLint.
- [x] `.env.example` now points developers toward generated secrets instead of weak placeholder secrets.

## Release Engineering

- [ ] Add staging and production deployment environments.
- [ ] Add a release branch policy.
- [ ] Require CI green before merge.
- [ ] Build API, web, and AI Docker images from tagged commits.
- [ ] Store image digests for rollback.
- [ ] Add environment parity checks for staging vs production.
- [ ] Add uptime checks for `/health` on API and AI health routes.

## Observability

- [ ] Add structured request IDs across API logs.
- [ ] Add error tracking for web/API/mobile/AI.
- [ ] Add metrics for login failures, payment failures, job applications, notification sends, AI failures.
- [ ] Add alerts for API 5xx rate, payment failure spikes, Redis/Postgres connectivity, queue/cron failures.
- [ ] Add audit logs for admin actions and sensitive user state changes.

## Product Launch Quality

- [ ] Define one clear launch persona set: student, recruiter, college admin, super admin.
- [ ] Lock the first launch scope. Do not launch every module if all are not QA-ready.
- [ ] Write production onboarding flows for each role.
- [ ] Verify empty states and error states on every dashboard page.
- [ ] Add support/contact flow and incident response process.
- [ ] Add legal pages: Terms, Privacy Policy, Refund/Cancellation Policy for payments.
- [ ] Add data deletion/export procedure for users.

## Suggested MVP Launch Cut

For a credible first production release, launch only:

- Auth and onboarding.
- Student/job seeker profile.
- Recruiter profile.
- Job posting and approval.
- Job search and application.
- Recruiter ATS.
- Interview scheduling.
- Email notifications.
- Admin approval dashboard.

Hold back until later unless fully tested:

- Payments/courses.
- Freelance referrals/invoices.
- Vendors/service requests.
- White-label custom domains.
- Mobile app public release.
- AI matching as a blocking/core decision engine.

## Production Acceptance Criteria

Do not launch until all are true:

- [ ] No tracked `.env` files.
- [ ] No known critical/high production dependency vulnerabilities without documented risk acceptance.
- [ ] Prisma migrations exist and apply cleanly to an empty DB and staging DB.
- [ ] API/web/mobile typechecks pass.
- [ ] API integration tests pass.
- [ ] Web e2e smoke tests pass.
- [ ] Payment test-mode flow is verified end to end if payments are in launch scope.
- [ ] Every production env var is present in deployment secret manager.
- [ ] A rollback procedure has been tested.
- [ ] Founder/product owner has completed role-by-role QA on staging.
