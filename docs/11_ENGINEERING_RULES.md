# 11 Development Rules

This file is mandatory for all future AI coding sessions.

## Core operating rules
1. Always read all docs in /docs before coding.
2. Always inspect existing files before creating any new file/module.
3. Never create duplicate API routes.
4. Never create duplicate Prisma models.
5. Never bypass auth middleware or role guards.
6. Never use static/demo data where real API already exists.
7. Never change schema without migration strategy and migration files.
8. Never change role logic without updating auth/permission docs.
9. Every change must include test evidence (manual and/or automated).
10. Every fix must update /docs/14_CHANGELOG_AND_FIX_LOG.md.
11. Every fix must list affected files explicitly.
12. Every fix must include rollback notes.
13. No random redesigns.
14. No large refactor without explicit approval.

## Mandatory pre-change checklist
- [ ] Read 00_PROJECT_OVERVIEW.md
- [ ] Read 01_VISION_TO_CODE_MAPPING.md
- [ ] Read 07_AUTH_ROLE_PERMISSION_AUDIT.md
- [ ] Read 12_MVP_SCOPE_LOCK.md
- [ ] Search for existing route/model/component before adding anything new
- [ ] Confirm file ownership and blast radius

## API rules
- Reuse existing controller/service patterns in module folder.
- Add/extend route-level validation (zod schema + validate middleware) when changing request shapes.
- Preserve response envelope shape: { success, data, error }.
- For protected endpoints, enforce authenticateJWT and requireRole as needed.

## Database rules
- Treat prisma/schema.prisma as critical.
- Add migrations for all schema changes.
- Avoid nullable/JSON growth without explicit reason and docs update.
- Document tenant impact for every model change.

## Frontend rules
- Reuse existing API clients under apps/web/src/lib/api.
- Do not add duplicate pages when wrapper/re-export already exists.
- Do not replace API data with mock arrays.
- Preserve role-based routing contracts in routes.ts and middleware.

## Release rules
- Run typecheck/build for affected apps.
- Execute relevant manual test rows from 09_TESTING_MASTER_PLAN.md.
- Append changelog entry in 14_CHANGELOG_AND_FIX_LOG.md.
- Include rollback steps before merge/deploy.
