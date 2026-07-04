# 08 Deployment Audit

## Required env variables
Primary required API env keys (validated at boot):
- DATABASE_URL
- REDIS_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- JWT_ACCESS_EXPIRES_IN
- JWT_REFRESH_EXPIRES_IN
- API_PORT
- NODE_ENV
- CORS_ORIGIN
- NEXT_PUBLIC_API_URL
- plus optional integration keys (OAuth, SMTP, Twilio, Firebase, S3, Razorpay, AI)

Evidence:
- apps/api/src/config/env.ts
- .env.example

## Local setup commands
- Install: npm ci
- Generate Prisma client: npm run db:generate
- Push schema: npm run db:push
- Seed data: npm run db:seed
- Dev all apps: npm run dev
- API only: npm run dev --workspace=@campushire/api
- Web only: npm run dev --workspace=@campushire/web

Evidence:
- package.json
- apps/api/package.json
- apps/web/package.json

## Build commands
- Monorepo build: npm run build
- API build: npm run build --workspace=@campushire/api
- Web build: npm run build --workspace=@campushire/web

Evidence:
- package.json
- apps/api/package.json
- apps/web/package.json

## Migration commands
- Deploy migrations (expected): npm run db:migrate
- Current CI behavior: npm run db:push

Evidence:
- package.json
- .github/workflows/ci.yml

## Seed commands
- npm run db:seed

Evidence:
- package.json
- prisma/seed.ts

## Deployment platform assumptions
- Web env fallback points to hosted API URL pattern (render-like).
- CORS default includes one Vercel hostname in app.ts.
- Docker setup exists for containerized deployment.

Evidence:
- apps/web/src/lib/env.ts
- apps/api/src/app.ts
- docker-compose.yml

## Vercel issues
- Ensure NEXT_PUBLIC_API_URL does not include trailing /api; normalization exists but config drift can still create confusion.
- Edge middleware tenant probe hits an authenticated white-label endpoint.

Evidence:
- apps/web/src/lib/env.ts
- apps/web/middleware.ts
- apps/api/src/modules/whitelabel/whitelabel.routes.ts

## Render/API issues
- API relies on Redis availability at startup; if Redis unavailable startup fails path includes graceful quit logic.
- Strict env validation can block startup if optional integrations are misconfigured as malformed values.

Evidence:
- apps/api/src/server.ts
- apps/api/src/config/env.ts

## Supabase/Postgres issues
- Prisma migration history folder absent; db push-centric flow can cause schema drift and weaker auditability.

Evidence:
- prisma/
- .github/workflows/ci.yml

## Redis/Upstash issues
- Redis required for runtime features (rate limiting/cache/unread count).
- Connection is lazy but explicitly connected and pinged at startup.

Evidence:
- apps/api/src/config/redis.ts
- apps/api/src/server.ts
- apps/api/src/middleware/rate-limit.ts

## Known blockers
1. White-label anonymous host config fetch mismatch.
2. Migration history gap.
3. Route-level validation coverage gap.
4. External integrations require complete env and credentials.

## Production readiness checklist
- [ ] Remove or protect predictable seed credentials in production paths.
- [ ] Introduce/restore migration history and migration governance.
- [ ] Resolve white-label public config/auth mismatch.
- [ ] Complete manual regression for role flows and tenant isolation.
- [ ] Add API integration tests for high-risk modules (auth/jobs/ats/interviews/notifications).
- [ ] Verify SMTP/Twilio/Firebase/S3/Razorpay with production secrets.
- [ ] Clean tracked build artifacts from repository.
