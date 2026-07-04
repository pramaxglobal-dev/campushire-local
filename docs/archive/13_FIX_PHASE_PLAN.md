# 13 Fix Phase Plan

## Phase 0: Documentation & audit
- Objective: Establish source-of-truth docs and module status map.
- Files likely involved: /docs/00-15.
- What not to touch: product logic files in apps/prisma.
- Test cases: documentation completeness check against route/page/model counts.
- Exit criteria: all required docs exist and are internally consistent.

## Phase 1: Local setup + env + DB + seed stabilization
- Objective: deterministic local boot and reproducible DB state.
- Files likely involved: package scripts, prisma setup, docker-compose, env docs.
- What not to touch: feature business logic.
- Test cases: fresh install, db generate/push/seed, api/web boot.
- Exit criteria: clean setup runbook works on a fresh machine.

## Phase 2: Auth + roles + redirects
- Objective: remove auth/role drift and close white-label auth mismatch.
- Files likely involved:
  - apps/web/middleware.ts
  - apps/web/src/components/auth/ProtectedRoute.tsx
  - apps/web/src/lib/store/auth.store.ts
  - apps/api/src/middleware/{auth,rbac,approval}.ts
  - apps/api/src/modules/whitelabel/*
- What not to touch: non-auth business modules except integration points.
- Test cases: login/logout/register/refresh/me/role redirects/pending/suspended paths.
- Exit criteria: all role flows pass manual auth matrix.

## Phase 3: Dashboard real data wiring
- Objective: reduce static fallback assumptions and ensure consistent live data.
- Files likely involved: apps/web/src/app/(dashboard)/dashboard/*, analytics APIs.
- What not to touch: schema changes unless approved.
- Test cases: each role dashboard loads and matches API stats.
- Exit criteria: dashboard cards verified with live API in local/UAT data.

## Phase 4: Core MVP flow (college -> student -> recruiter -> job -> apply -> ATS)
- Objective: make the critical hiring flow robust end-to-end.
- Files likely involved:
  - apps/api/src/modules/{invites,jobs,applications,ats,interviews,notifications}/*
  - apps/web/src/app/(dashboard)/dashboard/{college,student,recruiter,jobs,applications,ats,interviews}/*
- What not to touch: out-of-MVP modules.
- Test cases: T-002 to T-008 in testing master plan.
- Exit criteria: full flow passes in UAT without manual DB intervention.

## Phase 5: Notifications + emails
- Objective: validate channel delivery and preference controls.
- Files likely involved: apps/api/src/lib/{notification,mailer,whatsapp,firebase}.ts and notification module/pages.
- What not to touch: unrelated UI redesign.
- Test cases: in-app + email + (optional) WhatsApp/push channel verification.
- Exit criteria: configured channels deliver expected messages with traceability.

## Phase 6: Deployment hardening
- Objective: production-safe deploy process and runtime readiness.
- Files likely involved: Dockerfiles, CI workflow, env docs, migration strategy.
- What not to touch: major feature additions.
- Test cases: CI green, staging deploy smoke tests, rollback drill.
- Exit criteria: repeatable deployment with documented rollback.

## Phase 7: UAT testing and launch checklist
- Objective: founder-run acceptance and go-live readiness.
- Files likely involved: docs/09, docs/10, docs/14.
- What not to touch: core architecture without approval.
- Test cases: full test matrix with screenshots and defect log.
- Exit criteria: no open P0/P1 blockers, signed launch checklist.
