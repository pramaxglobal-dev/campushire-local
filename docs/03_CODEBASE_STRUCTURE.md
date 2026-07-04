# 03 Codebase Inventory

## Top-level folder/module explanation
- apps/web: Next.js frontend pages, role dashboards, auth UI, API client adapters.
- apps/api: Express API, middleware, route modules, integrations, background jobs.
- apps/mobile: Expo app with auth and tab routes.
- apps/ai: FastAPI service for scoring/matching.
- packages/types: Shared domain/type contracts.
- packages/utils: Shared utility helpers.
- packages/ui: Shared UI components used by web app.
- prisma: DB schema and seed data.

Evidence:
- apps/
- packages/
- prisma/

## Important files and what they do
- apps/api/src/app.ts: middleware chain + all API route mounts.
- apps/api/src/server.ts: server bootstrap, redis/prisma connect, cron scheduler, graceful shutdown.
- apps/api/src/config/env.ts: strict API env validation.
- apps/api/src/middleware/auth.ts: bearer auth and request user hydration.
- apps/api/src/middleware/rbac.ts: role-based guard.
- apps/api/src/middleware/tenant-resolver.ts: host/subdomain tenant resolution + redis cache.
- apps/api/src/lib/ai.ts: API-to-AI-service matching/scoring integration.
- apps/web/middleware.ts: edge redirects for auth/approval/suspension and tenant probe.
- apps/web/src/lib/api/client.ts: axios auth injection + refresh retry.
- apps/web/src/lib/store/auth.store.ts: token/session persistence.
- apps/web/src/components/auth/ProtectedRoute.tsx: client-side protected-route fallback.
- prisma/schema.prisma: core data model (45 models).
- prisma/seed.ts: initial/demo data and credentials.

## Dead/unused-looking files and artifacts
- Tracked Python bytecode cache files are present and should not be source-controlled.
  - apps/ai/app/**/__pycache__/*.pyc
- Tracked TypeScript build artifact in web app.
  - apps/web/tsconfig.tsbuildinfo
- Duplicate page wrappers (re-export only) increase route surface and maintenance noise.
  - apps/web/src/app/(dashboard)/*/page.tsx wrappers

Evidence:
- git ls-files output for .pyc and tsconfig.tsbuildinfo
- wrapper re-export files under apps/web/src/app/(dashboard)

## Duplicate-looking files
- 27 wrapper pages re-export dashboard pages (same feature accessible via duplicate paths).
  - Example: apps/web/src/app/(dashboard)/jobs/page.tsx -> ../dashboard/jobs/page
  - Example: apps/web/src/app/(dashboard)/admin/page.tsx -> ../dashboard/admin/page

Evidence:
- apps/web/src/app/(dashboard)/*/page.tsx
- audit_web_pages.json

## Risky files
- prisma/schema.prisma: any schema change impacts all services.
- apps/api/src/config/env.ts: strict env contract; deployment can fail at boot if misconfigured.
- apps/api/src/middleware/auth.ts: central auth/tenant behavior.
- apps/api/src/modules/whitelabel/whitelabel.routes.ts: current white-label public access mismatch.
- apps/web/middleware.ts: global redirect and tenant behavior.
- apps/web/src/lib/api/client.ts: token refresh and global API behavior.

## Files that must not be edited casually
- apps/api/src/app.ts
- apps/api/src/middleware/*
- apps/api/src/modules/auth/*
- apps/web/middleware.ts
- apps/web/src/lib/store/auth.store.ts
- apps/web/src/lib/api/client.ts
- prisma/schema.prisma
- prisma/seed.ts
