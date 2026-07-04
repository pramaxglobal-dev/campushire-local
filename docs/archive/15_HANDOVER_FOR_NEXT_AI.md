# 15 Handover For Next AI

## Product summary
CampusHire is a multi-tenant SaaS hiring platform for college-to-recruiter pipelines with role-based dashboards, jobs, applications, ATS, interviews, events, documents, messaging, notifications, analytics, and optional partner modules.

## Current state
- Architecture surface is broad and mostly implemented.
- Core MVP flow exists but needs hardening.
- White-label host/public config path has a known mismatch.
- Migration governance is incomplete (no migrations folder).

## Must-read docs
1. /docs/00_PROJECT_OVERVIEW.md
2. /docs/01_VISION_TO_CODE_MAPPING.md
3. /docs/02_SYSTEM_ARCHITECTURE.md
4. /docs/07_AUTH_ROLE_PERMISSION_AUDIT.md
5. /docs/10_LIMITATIONS_AND_KNOWN_ISSUES.md
6. /docs/11_DEVELOPMENT_RULES.md
7. /docs/12_MVP_SCOPE_LOCK.md
8. /docs/13_FIX_PHASE_PLAN.md

## Current MVP scope
Follow /docs/12_MVP_SCOPE_LOCK.md strictly.

## Strict dev rules
Follow /docs/11_DEVELOPMENT_RULES.md with no exceptions.

## Known risks
- White-label anonymous fetch/auth mismatch
- Missing migration history
- Uneven API validation coverage
- Seed credential risk
- Duplicate wrapper route surface

## Next recommended task
Begin Phase 1 from /docs/13_FIX_PHASE_PLAN.md:
- stabilize setup/env/db/seed reproducibility
- document exact local bootstrap verification
- do not add features

## Warning against duplicate development
Before creating any route/module/component/model, search existing code and docs first. Reuse existing implementations and update in place. Duplicate feature creation is explicitly forbidden.
