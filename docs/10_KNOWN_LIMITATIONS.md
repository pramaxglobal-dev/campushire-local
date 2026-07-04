# 10 Limitations And Known Issues

## Priority legend
- P0: launch blocker / data/security correctness risk
- P1: high business risk
- P2: medium risk / quality debt
- P3: low risk / improvement

## Current limitations

### P0
1. White-label public tenant config flow is partially broken due auth-protected config endpoint used for anonymous host theme lookup.
   - apps/web/src/components/layout/ThemeProvider.tsx
   - apps/web/middleware.ts
   - apps/api/src/modules/whitelabel/whitelabel.routes.ts
2. Missing Prisma migration history directory; schema evolution lacks durable migration audit chain.
   - prisma/
   - package.json
   - .github/workflows/ci.yml
3. Predictable seed credentials and invite codes present in source.
   - prisma/seed.ts

### P1
4. Route-level validation coverage is low (32/150 routes with validate() middleware).
   - audit_api_routes_detailed.json
   - apps/api/src/modules/*/*.routes.ts
5. Duplicate wrapper routes increase surface and can cause maintenance drift.
   - apps/web/src/app/(dashboard)/* wrappers
6. Swagger docs are partial compared to actual route surface.
   - apps/api/src/docs/swagger.ts
   - apps/api/src/app.ts

### P2
7. Payments module is narrow (course payment flow only), not full platform billing.
   - apps/api/src/modules/payments/*
8. Analytics/dashboards use fallback empty structures and mixed static indicators; reporting trust requires manual verification.
   - apps/web/src/app/(dashboard)/dashboard/*
   - apps/api/src/modules/analytics/*
9. AI matching/scoring reliability depends on external AI service availability and key config.
   - apps/api/src/lib/ai.ts
   - apps/ai/app/*

### P3
10. Tracked build/runtime artifacts in repo (.pyc, tsbuildinfo).
   - apps/ai/app/**/__pycache__/*.pyc
   - apps/web/tsconfig.tsbuildinfo

## Missing backend wiring / static-demo areas
- Some dashboards include inline static arrays/visual placeholders even when API-backed.
  - apps/web/src/app/(dashboard)/dashboard/{admin,college,recruiter,student,freelance,whitelabel}/page.tsx
- Re-export wrapper pages provide duplicate paths without added logic.
  - apps/web/src/app/(dashboard)/*/page.tsx

## Security concerns
- Cookie-based role flags in frontend middleware can be manipulated client-side; backend checks remain critical.
  - apps/web/middleware.ts
  - apps/api/src/middleware/auth.ts
- Multi-tenant filtering relies on service implementation discipline.
  - apps/api/src/modules/*/*.service.ts

## Deployment concerns
- Strict env validation and multi-service dependency chain can fail fast when any required secret/service is missing.
  - apps/api/src/config/env.ts
  - apps/api/src/server.ts

## Scalability concerns
- Heavy dashboard endpoints and broad data joins need load profiling.
  - apps/api/src/modules/analytics/analytics.service.ts
  - apps/api/src/modules/admin/admin.service.ts
- Socket and chat thread joins need scale testing.
  - apps/api/src/lib/socket.ts

## Data integrity concerns
- Missing migration history and seed-default data patterns increase risk of environment drift.
  - prisma/schema.prisma
  - prisma/seed.ts
