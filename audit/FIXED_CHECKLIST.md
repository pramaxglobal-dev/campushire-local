# CampusHire Fixed and Live-Test Checklist

Date: 2026-07-13

## Product remediation

- [x] Super Admin tenant list, create, edit, activate, and suspend UI.
- [x] Super Admin pending-job approval and rejection UI.
- [x] Super Admin platform-setting read/write UI.
- [x] Super Admin targeted broadcast UI.
- [x] Super Admin activity-log viewer.
- [x] Real account deactivation with password verification and refresh-token revocation.
- [x] Tenant-aware white-label selection and persisted tagline/subdomain/settings.
- [x] Document-verification request, vendor decision, synchronized document status, and requester history.
- [x] Vendor request editing, start-work transition, delivery completion, and requester rating.
- [x] Training course editing and publish/unpublish lifecycle.
- [x] Placement-event editing and cancellation lifecycle.
- [x] Interview rescheduling, cancellation, attendance confirmation, and outcome lifecycle.
- [x] Training Partner enrolled-learner visibility and course-scoped chat initiation.
- [x] Mobile role-gated navigation and API-backed role workspaces.
- [x] Mobile job details, screening-answer application form, and application timeline details.

## Security and platform

- [x] Global CSRF validation for unsafe cookie-authenticated API requests.
- [x] Browser client sends the double-submit CSRF header.
- [x] Bearer-only native clients remain supported without ambient-cookie CSRF requirements.
- [x] Account deactivation and administrative changes create audit records.
- [x] Course-enrollment chat migration applied to the configured Supabase database.
- [x] Prisma schema and migration status verified.
- [x] Compatible dependency security patches applied.
- [ ] Coordinated major dependency upgrade: Next 16/React 19, Expo 57/React Native 0.86, Firebase Admin 14, and React Email 1.

## Automated verification

- [x] API TypeScript check.
- [x] Web TypeScript check.
- [x] Mobile TypeScript check.
- [x] API production build.
- [x] Web production build; 59 routes generated.
- [x] Compiled API health smoke test.
- [x] Compiled web login-page smoke test.
- [x] CSRF negative test: cookie-authenticated unsafe request without header returns 403.
- [x] CSRF positive-path test: matching cookie/header passes CSRF and reaches authentication.
- [x] Git diff whitespace validation.
- [ ] Live deployment health and seven-role login regression — check after the deployment created from this remediation commit completes.
- [ ] Native Android/iOS device regression, accessibility audit, and production load test.

## Live role acceptance paths

- Super Admin: tenant management, job moderation, settings, broadcasts, audit logs, and white-label tenant selection.
- College Admin: events, document sharing, connections, and white-label branding.
- Student/Job Seeker: job detail/application with required screening answers, applications, interviews, documents, events, and courses.
- Corporate Recruiter: job creation/edit/submission, ATS, interview lifecycle, vendor requests, and connections.
- Freelance Recruiter: referrals, links, invoices, and chat.
- Vendor: incoming requests, accept/reject/start/complete, verification decisions, marketplace, and ratings.
- Training Partner: course lifecycle, learner progress, learner chat, course catalog, and settings.
