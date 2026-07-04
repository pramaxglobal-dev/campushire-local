# 00 Project Overview

## What this product currently appears to be
CampusHire is a multi-tenant hiring platform connecting colleges, students/job-seekers, recruiters, and partner roles (freelance recruiter, vendor, training partner) with ATS, events, documents, messaging, notifications, and analytics.

Evidence:
- apps/web/src/app/(dashboard)/dashboard/*
- apps/api/src/modules/*
- prisma/schema.prisma

## Tech stack actually used
- Monorepo orchestration: Turbo + npm workspaces
- Frontend web: Next.js 14, React 18, TypeScript, Tailwind, Zustand, Axios
- Backend API: Express, TypeScript, Prisma, PostgreSQL, Redis, Socket.IO, Zod
- Mobile app: Expo/React Native + expo-router
- AI service: FastAPI + SQLAlchemy + scikit-learn

Evidence:
- package.json
- apps/web/package.json
- apps/api/package.json
- apps/mobile/package.json
- apps/ai/requirements.txt

## Monorepo/app structure
- apps/web: Next.js web client
- apps/api: Express API
- apps/mobile: Expo mobile app
- apps/ai: Python AI microservice
- packages/types: shared TS domain types
- packages/utils: shared utility functions
- packages/ui: shared UI components
- prisma: schema + seed

Evidence:
- apps/
- packages/
- prisma/

## Frontend apps
- Web app routes found: 67
- Mobile route files found: 8

Evidence:
- audit_web_pages.json
- audit_mobile_pages.json

## Backend apps
- API route handlers found: 150
- API modules currently mounted:
- `auth`: 13 routes
- `jobs`: 13 routes
- `admin`: 12 routes
- `training`: 11 routes
- `events`: 9 routes
- `vendors`: 9 routes
- `ats`: 8 routes
- `freelance`: 7 routes
- `interviews`: 7 routes
- `notifications`: 7 routes
- `whitelabel`: 7 routes
- `applications`: 6 routes
- `chat`: 6 routes
- `connections`: 6 routes
- `documents`: 6 routes
- `tenants`: 6 routes
- `analytics`: 5 routes
- `invites`: 5 routes
- `users`: 5 routes
- `payments`: 2 routes

Evidence:
- apps/api/src/app.ts
- audit_api_routes_detailed.json

## Shared packages
- packages/types
- packages/utils
- packages/ui
- packages/config

Evidence:
- packages/
- package.json (workspaces)

## Deployment targets
Current code indicates likely deployment split:
- Web: Vercel-style Next deployment assumptions
- API: Render/container or Node server deployment assumptions
- AI: separate Python container/service
- Data: PostgreSQL + Redis

Evidence:
- apps/web/src/lib/env.ts
- docker-compose.yml
- apps/api/Dockerfile
- apps/web/Dockerfile
- apps/ai/Dockerfile
- .github/workflows/ci.yml

## Current project maturity
Assessment: **MVP-in-progress with production intent**, not fully production-ready.

Evidence:
- Large functional surface exists across modules (apps/api/src/modules/*)
- Route count is high (150) but route-level validation is uneven (32/150)
- Prisma migration history folder missing (no prisma/migrations)
- Mixed static indicators on some UI dashboards and wrappers

## Major risks
1. White-label public tenant theme fetch path is protected by auth, causing partial/broken host branding behavior.
   - apps/web/src/components/layout/ThemeProvider.tsx
   - apps/web/middleware.ts
   - apps/api/src/modules/whitelabel/whitelabel.routes.ts
2. Missing migration history (prisma/migrations) increases schema drift risk.
   - prisma/
3. High number of API routes without route-level validation middleware.
   - audit_api_routes_detailed.json
4. Seed includes predictable demo credentials and seeded invite codes.
   - prisma/seed.ts
5. Tracked build/runtime artifacts in repo (.pyc, tsconfig.tsbuildinfo).
   - apps/ai/app/**/__pycache__/*.pyc
   - apps/web/tsconfig.tsbuildinfo

## Module status buckets

### Working
- Auth (register/login/refresh/me)
- Jobs
- Applications
- ATS
- Interviews
- Events
- Notifications
- Chat
- Documents

### Partial
- Super Admin dashboard analytics/use-cases
- College Admin dashboards (mixed fallback/static visuals)
- Freelance/Vendor/Training partner business flows
- Billing/Payments (course-payment-only flow)
- AI matching (depends on separate AI service + key)
- Reports/analytics confidence (non-uniform validation and sparse tests)

### Demo/static
- Landing/public marketing blocks
- Some dashboard inline chart segments and seeded default cards
- Wrapper pages that only re-export dashboard pages (27 routes)

### Broken
- Public tenant white-label theme resolution against /api/whitelabel/config (auth mismatch for anonymous host fetch)
