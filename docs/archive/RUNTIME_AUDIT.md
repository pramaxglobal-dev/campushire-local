# CampusHire Runtime Audit

Date: 2026-05-16  
Auditor: Codex (GPT-5)

## Scope Executed

### Frontend checks
1. `npm run build` in `apps/web`  
   - In sandbox: failed with `spawn EPERM` (environment restriction).  
   - Outside sandbox: passed successfully.
2. Register flow invite validation wiring
3. Login token persistence into Zustand
4. Dashboard page data-fetch wiring review
5. UI controls review for backend wiring gaps

### Backend checks
1. `npx tsc --noEmit` in `apps/api`
2. Route mounting review in `apps/api/src/app.ts`
3. `/api/notifications` 404 root-cause audit
4. `/api/auth/me` payload audit
5. CORS policy audit for `campushire-web-8bwf.vercel.app`

## Required Command Results

### `apps/api`
- Command: `npx tsc --noEmit`
- Result: PASS

### `apps/web`
- Command: `npm run build`
- Result: PASS (when run outside sandbox restrictions)

## Findings

### P0 (core-flow breaking) — Fixed

1. **API typecheck broken in admin stats aggregation**
   - File: `apps/api/src/modules/admin/admin.service.ts:374-416`
   - Problem: `prisma.user.groupBy(...)` triggered recursive TS type errors (`TS2615`), blocking `npx tsc --noEmit`.
   - Exact fix: Replaced role aggregation query with `findMany({ select: { role: true } })` and in-memory counting.
   - Status: Fixed.

2. **API typecheck broken in job skill metadata handling**
   - File: `apps/api/src/modules/jobs/jobs.service.ts:47-71`, `420-423`, `492-497`
   - Problem: `skillsRequired` shape from DTOs did not satisfy `SkillRequirement[]` in strict type-check paths (`TS2322`).
   - Exact fix: Added `normalizeSkillRequirements(...)` and used it in both create/update metadata construction.
   - Status: Fixed.

3. **`/api/notifications` 404 in deployed setups due base URL double-prefix risk**
   - File: `apps/web/src/lib/env.ts:9-16`
   - Problem: If `NEXT_PUBLIC_API_URL` is configured with a trailing `/api`, frontend calls like `/api/notifications` become `/api/api/notifications` and 404.
   - Exact fix: Normalize API URL by stripping trailing slash and trailing `/api`.
   - Status: Fixed.

4. **Logout flow bypassing backend revoke endpoint on key pages**
   - Files:
     - `apps/web/src/app/pending/page.tsx:8,17,57`
     - `apps/web/src/app/suspended/page.tsx:6,9,25`
     - `apps/web/src/app/(dashboard)/settings/page.tsx:9,43,296-299`
   - Problem: These pages called `useAuthStore().logout` directly (local clear only), skipping API logout revoke flow.
   - Exact fix: Switched to `useAuth().logout()` so backend `/api/auth/logout` is invoked before local session clear.
   - Status: Fixed.

5. **Invite validation helper incorrectly required auth token**
   - File: `apps/web/src/lib/api/invites.api.ts:2,34-36`
   - Problem: `validateInviteCode` used `apiClient` (auth interceptor) for a public endpoint, risking register flow failures in shared usage.
   - Exact fix: Switched to `publicApiClient` and encoded invite code.
   - Status: Fixed.

6. **CORS policy too narrow for production web domain**
   - File: `apps/api/src/app.ts:35-40`, `56`, `65-74`
   - Problem: CORS previously allowed only a single origin string from env, commonly breaking Vercel frontend calls.
   - Exact fix: Added allowlist logic:
     - Parses comma-separated `CORS_ORIGIN`
     - Includes `https://campushire-web-8bwf.vercel.app`
     - Uses dynamic origin callback
     - Syncs CSP `connectSrc` with allowed origins
   - Status: Fixed.

### High risk (security/runtime) — Fixed

7. **Sensitive `passwordHash` exposure risk in profile endpoints**
   - Files:
     - `apps/api/src/modules/auth/auth.service.ts:89-127`, `1047-1051`
     - `apps/api/src/modules/users/users.service.ts:28-64`, `90-94`
   - Problem: Full user objects with `include` could expose internal sensitive fields in `/api/auth/me` and profile reads.
   - Exact fix: Replaced broad `include` queries with explicit safe `select` objects for full profile payloads.
   - Status: Fixed.

### Non-P0 (found, not blocking core flows)

8. **Deactivate Account UI is not true deactivation**
   - File: `apps/web/src/app/(dashboard)/settings/page.tsx:274-299`
   - Problem: “Deactivate Account” currently performs sign-out only; no backend account deactivation endpoint is called.
   - Exact fix needed: Add dedicated backend endpoint (`PATCH /api/users/deactivate`), invoke it from settings, and gate by confirmation + re-auth.
   - Status: Not implemented in this pass (non-P0 per request).

9. **“Remember me” checkbox has no persistence behavior**
   - File: `apps/web/src/components/auth/LoginForm.tsx:19`, `82-90`
   - Problem: Toggle state exists but does not affect token persistence/session duration.
   - Exact fix needed: Bind checkbox to token storage strategy (sessionStorage vs localStorage) and/or refresh-token TTL policy.
   - Status: Not implemented in this pass (non-P0).

## Route Mount Audit (Backend)

All expected core routers are mounted in `apps/api/src/app.ts`:
- `/api/auth`
- `/api/users`
- `/api/notifications`
- `/api/jobs`
- `/api/applications`
- `/api/analytics`
- and remaining domain routers.

No missing mount for `/api/notifications` was found.

## `/api/notifications` 404 Root Cause

Primary likely causes discovered:
1. Frontend API base URL misconfiguration with trailing `/api` causing `/api/api/...` requests.
2. CORS origin mismatch in production (`campushire-web-8bwf.vercel.app` not allowed).

Both mitigated in this pass via `apps/web/src/lib/env.ts` and `apps/api/src/app.ts`.

## `/api/auth/me` Audit Result

- Endpoint is mounted and protected in `apps/api/src/modules/auth/auth.routes.ts`.
- Now returns the expected profile payload without sensitive password hash leakage due explicit safe select.

## Dashboard/Data Fetch Wiring Summary

Core dashboard pages (student/recruiter/college/admin/etc.) are wired to concrete API modules and backend routes.  
No missing route mount was found for these core fetch paths in this audit pass.

