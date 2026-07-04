# 07 Auth Role Permission Audit

## Signup flow
- Web: multi-step registration form with role selection, password validation, optional invite/organization input.
- Student role explicitly validates invite code through public invite endpoint.
- Backend registration endpoint validates schema and creates user with role.

Evidence:
- apps/web/src/components/auth/RegisterForm.tsx
- apps/web/src/lib/api/invites.api.ts
- apps/api/src/modules/auth/auth.routes.ts
- apps/api/src/modules/auth/auth.controller.ts
- apps/api/src/modules/auth/auth.service.ts

## Login flow
- Web login form calls useAuth().login.
- API issues access + refresh tokens.
- Web stores tokens in localStorage and cookies and then fetches /api/auth/me.

Evidence:
- apps/web/src/components/auth/LoginForm.tsx
- apps/web/src/lib/hooks/useAuth.ts
- apps/web/src/lib/store/auth.store.ts
- apps/api/src/modules/auth/auth.routes.ts

## Logout flow
- Preferred path uses backend revoke endpoint via useAuth().logout then local clear.
- Some historical direct-store logout usage exists in runtime audit history; current pages should still be regression-tested.

Evidence:
- apps/web/src/lib/hooks/useAuth.ts
- apps/api/src/modules/auth/auth.routes.ts
- RUNTIME_AUDIT.md

## Current user / me flow
- Authenticated GET /api/auth/me populates profile data.
- Client initialization depends on this endpoint to establish auth state.

Evidence:
- apps/api/src/modules/auth/auth.routes.ts
- apps/api/src/modules/auth/auth.controller.ts
- apps/web/src/lib/store/auth.store.ts

## Role selection and redirects
- Role chosen at registration.
- Role dashboard path resolution centralized in routes.ts.
- Middleware + ProtectedRoute both redirect based on role/approval/suspension.

Evidence:
- apps/web/src/lib/utils/routes.ts
- apps/web/middleware.ts
- apps/web/src/components/auth/ProtectedRoute.tsx

## Protected routes
- Next middleware protects /dashboard, /onboarding, /profile, /settings using cookies.
- Client-side ProtectedRoute provides second layer.

Evidence:
- apps/web/middleware.ts
- apps/web/src/app/(dashboard)/layout.tsx
- apps/web/src/components/auth/ProtectedRoute.tsx

## Backend authorization
- JWT auth middleware resolves user and suspension state.
- Role guard middleware enforces route roles.
- Optional approval middleware enforces post-approval restrictions for specific roles.

Evidence:
- apps/api/src/middleware/auth.ts
- apps/api/src/middleware/rbac.ts
- apps/api/src/middleware/approval.ts
- apps/api/src/modules/*/*.routes.ts

## Frontend-only security risks
1. Auth/role state in cookies is used by web middleware; cookies are client-manageable and should not replace backend auth checks.
   - apps/web/middleware.ts
   - apps/web/src/lib/store/auth.store.ts
2. Some non-dashboard duplicated routes exist and rely on client guards through shared layout patterns.
   - apps/web/src/app/(dashboard)/* wrappers

## Tenant isolation risks
1. Tenant resolution is host/subdomain-based and cached; local/host mismatches can bypass intended tenant resolution.
   - apps/api/src/middleware/tenant-resolver.ts
2. White-label public host probing currently conflicts with authenticated config route.
   - apps/web/middleware.ts
   - apps/web/src/components/layout/ThemeProvider.tsx
   - apps/api/src/modules/whitelabel/whitelabel.routes.ts

## Default/demo users and passwords (seed)
- Super admin: admin@campushire.in
- Additional seeded admins/recruiters/partners/vendors/students exist.
- Seed passwords in source:
  - Admin@123
  - Campus@123
- Seed invite codes include:
  - IITD26A1, IITD26B1, IITD26C1
  - IIMA26A1, IIMA26B1, IIMA26C1

Evidence:
- prisma/seed.ts
