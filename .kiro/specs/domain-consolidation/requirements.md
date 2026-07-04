# Requirements Document

## Introduction

This sprint performs a Domain Consolidation across the CampusHire API codebase. The goal is to
establish exactly one source of truth for five shared business-logic domains — User Suspension
Logic, Approval-Required Roles, Tenant Resolution, Shared User Select Objects, and Application
Status History Writer — without changing any product behaviour, API contract, database schema,
route, or permission.

The consolidation libraries (`lib/user-guards.ts`, `lib/user-selects.ts`, `lib/tenant.ts`,
`lib/application-history.ts`) already exist and are partially adopted. This sprint completes the
adoption by removing every remaining duplicate implementation and migrating all consumers to import
from the canonical library files.

Zero observable changes to any external contract are permitted. If any consumer's behaviour
changes as a side-effect of the migration, the sprint has failed.

---

## Glossary

- **API**: The Node/Express application at `apps/api/`.
- **Canonical Library**: A file under `apps/api/src/lib/` that is the single authoritative
  implementation of a domain.
- **Consumer**: A module (service, middleware) that reads or calls a canonical library export.
- **Domain**: One of the five business-logic areas listed in the sprint scope.
- **Duplicate Implementation**: Any function, constant, or Prisma select object that re-implements
  logic already provided by a canonical library.
- **SAFE_USER_SELECT**: The Prisma `UserSelect` object that projects the scalar user fields used
  by authentication and listing flows; defined in `lib/user-selects.ts`.
- **FULL_USER_PROFILE_SELECT**: The Prisma `UserSelect` object that projects all scalar fields
  plus all role-specific sub-profile relations; defined in `lib/user-selects.ts`.
- **FULL_USER_INCLUDE**: The Prisma `UserInclude` object that loads all role-specific sub-profile
  relations alongside scalar fields; defined in `lib/user-selects.ts`.
- **APPROVAL_REQUIRED_ROLES**: The readonly array of `UserRole` values that require admin
  approval before a user can access protected features; defined in `lib/user-guards.ts`.
- **isUserSuspended**: The function that determines whether a user account is suspended based on
  `isActive` and `metadata.isSuspended`; defined in `lib/user-guards.ts`.
- **resolveUserTenant**: The function that fetches a user's `tenantId` from the database and
  throws `TenantResolutionError` when absent; defined in `lib/tenant.ts`.
- **resolveUserTenantOrNull**: The function that fetches a user's `tenantId` from the database
  and returns `null` when absent; defined in `lib/tenant.ts`.
- **writeApplicationStatusHistory**: The function that writes a single
  `ApplicationStatusHistory` record; defined in `lib/application-history.ts`.
- **ServiceError**: The module-local error class present in each service file that signals
  HTTP error codes to the error handler; must not be replaced.
- **TransactionClient**: `Prisma.TransactionClient` — the client object available inside a
  `prisma.$transaction` callback.
- **Regression**: Any change in observable system behaviour caused by this sprint.

---

## Requirements

---

### Requirement 1: User Suspension Logic — Single Source of Truth

**User Story:** As the engineering team, we want every suspension check in the system to call the
same function, so that a change to suspension logic never requires hunting down multiple files.

#### Acceptance Criteria

1. THE `lib/user-guards.ts` Canonical_Library SHALL export `isUserSuspended` as the sole
   implementation of user-suspension logic in the codebase.

2. WHEN `admin.service.ts` is compiled, THE Compiler SHALL resolve `isUserSuspended` to the
   import from `../../lib/user-guards` and SHALL NOT find a local definition of
   `getSuspendedState` in that file.

3. THE `admin.service.ts` Module SHALL call `isUserSuspended(user)` wherever it previously
   called the local `getSuspendedState(user.isActive, user.metadata)`, passing a value that
   satisfies `{ isActive: boolean; metadata: unknown }`.

4. WHEN `isUserSuspended` is called with `{ isActive: false, metadata: null }`, THE Function
   SHALL return `true`.

5. WHEN `isUserSuspended` is called with `{ isActive: true, metadata: { isSuspended: true } }`,
   THE Function SHALL return `true`.

6. WHEN `isUserSuspended` is called with `{ isActive: true, metadata: { isSuspended: false } }`,
   THE Function SHALL return `false`.

7. WHEN `isUserSuspended` is called with `{ isActive: true, metadata: null }`, THE Function
   SHALL return `false`.

8. THE Migration SHALL NOT change the HTTP status code, response body, or error message returned
   by any endpoint that previously called `getSuspendedState`.

---

### Requirement 2: Approval-Required Roles — Single Source of Truth

**User Story:** As the engineering team, we want the list of roles that require admin approval
to be defined in exactly one place, so that adding or removing a role requires one edit.

#### Acceptance Criteria

1. THE `lib/user-guards.ts` Canonical_Library SHALL export `APPROVAL_REQUIRED_ROLES` as the
   sole definition of approval-required roles in the codebase.

2. WHEN `admin.service.ts` `getPendingApprovals` is compiled, THE Compiler SHALL resolve the
   role list to `APPROVAL_REQUIRED_ROLES` imported from `../../lib/user-guards` and SHALL NOT
   contain an inline literal array of role values for that purpose.

3. THE `admin.service.ts` `getPendingApprovals` function SHALL query the database using
   `role: { in: [...APPROVAL_REQUIRED_ROLES] }` (or the spread-array equivalent), producing
   the same SQL `IN` clause as the previously hardcoded array.

4. THE `APPROVAL_REQUIRED_ROLES` Constant SHALL contain exactly the values
   `CORPORATE_RECRUITER`, `COLLEGE_ADMIN`, `VENDOR`, `TRAINING_PARTNER`, and
   `FREELANCE_RECRUITER` — the same five roles that were previously hardcoded in
   `getPendingApprovals`.

5. THE Migration SHALL NOT change the set of users returned by `GET /admin/approvals` for any
   existing database state.

6. THE Migration SHALL NOT change the HTTP status code or response structure of any admin
   approval endpoint.

---

### Requirement 3: Tenant Resolution — Single Source of Truth

**User Story:** As the engineering team, we want all service-layer tenant lookups to delegate to
one resolver function, so that cache behaviour, error messages, and null-handling are consistent
across modules.

#### Acceptance Criteria

1. THE `lib/tenant.ts` Canonical_Library SHALL export `resolveUserTenant` and
   `resolveUserTenantOrNull` as the sole implementations of user-to-tenant lookup in the
   service layer.

2. WHEN `ats.service.ts` is compiled, THE Compiler SHALL NOT find a local definition of
   `getUserTenantId` in that file; every call site SHALL delegate to `resolveUserTenant` from
   `../../lib/tenant`.

3. WHEN `interviews.service.ts` is compiled, THE Compiler SHALL NOT find a local definition of
   `getUserTenantId` in that file; every call site SHALL delegate to `resolveUserTenant` from
   `../../lib/tenant`.

4. WHEN `jobs.service.ts` is compiled, THE Compiler SHALL NOT find a local definition of
   `getUserTenantId` in that file; every call site SHALL delegate to `resolveUserTenant` from
   `../../lib/tenant`.

5. WHEN `freelance.service.ts` is compiled, THE Compiler SHALL NOT find a local `getUserWithTenant`
   that performs its own `prisma.user.findUnique` for tenant resolution; the tenant-lookup step
   inside `getUserWithTenant` SHALL delegate to `resolveUserTenant` from `../../lib/tenant`.

6. WHEN `notifications.service.ts` is compiled, THE Compiler SHALL NOT find local definitions of
   `getUserTenantOrNull` or `getUserTenant`; those call sites SHALL delegate to
   `resolveUserTenantOrNull` and `resolveUserTenant` from `../../lib/tenant` respectively.

7. WHEN `resolveUserTenant` is called with a `userId` whose `tenantId` is `null` in the
   database, THE Function SHALL throw a `TenantResolutionError` with `statusCode` equal to 404.

8. WHEN `resolveUserTenantOrNull` is called with a `userId` whose `tenantId` is `null` in the
   database, THE Function SHALL return `null` without throwing.

9. THE Migration SHALL NOT change the HTTP status code, error message, or behaviour of any
   endpoint that previously called a local `getUserTenantId` or equivalent.

10. THE Migration SHALL NOT add any extra database queries beyond those already performed by the
    existing local `getUserTenantId` implementations.

---

### Requirement 4: Shared User Select Objects — Single Source of Truth

**User Story:** As the engineering team, we want all Prisma user-projection objects to be defined
once, so that adding a new user field requires one edit and all consumers immediately pick it up.

#### Acceptance Criteria

1. THE `lib/user-selects.ts` Canonical_Library SHALL export `SAFE_USER_SELECT`,
   `FULL_USER_PROFILE_SELECT`, and `FULL_USER_INCLUDE` as the sole Prisma user-projection
   objects in the codebase.

2. WHEN `admin.service.ts` is compiled, THE Compiler SHALL resolve `safeUserSelect` usages to
   `SAFE_USER_SELECT` imported from `../../lib/user-selects` and SHALL NOT find a local
   `safeUserSelect` variable definition in that file.

3. WHEN `admin.service.ts` is compiled, THE Compiler SHALL resolve `fullUserInclude` usages to
   `FULL_USER_INCLUDE` imported from `../../lib/user-selects` and SHALL NOT find a local
   `fullUserInclude` variable definition in that file.

4. WHEN `users.service.ts` is compiled, THE Compiler SHALL resolve `fullProfileSelect` usages
   to `FULL_USER_PROFILE_SELECT` imported from `../../lib/user-selects` and SHALL NOT find a
   local `fullProfileSelect` variable definition in that file.

5. THE `SAFE_USER_SELECT` Object SHALL project exactly the fields `id`, `tenantId`, `tin`,
   `email`, `phone`, `firstName`, `lastName`, `avatarUrl`, `role`, `subRole`,
   `profileVisibility`, `isApproved`, `isEmailVerified`, `isPhoneVerified`, `isActive`,
   `metadata`, `lastLoginAt`, `createdAt`, `updatedAt` — identical to the fields previously
   projected by both the `auth.service.ts` and `admin.service.ts` local copies.

6. THE `FULL_USER_INCLUDE` Object SHALL include exactly the relations `tenant`, `studentProfile`,
   `recruiterProfile`, `freelanceRecruiterProfile`, `vendorProfile`, `trainingPartnerProfile`,
   `jobSeekerProfile`, `collegeProfileManaged`, `candidateEducations`, `candidateExperiences`,
   `candidateCertifications`, `candidateProjects` — identical to the `admin.service.ts` local
   `fullUserInclude`.

7. THE Migration SHALL NOT change the shape of any API response that previously used a local
   projection object, including field presence, field order in serialisation, or field types.

8. THE `admin.service.ts` `FullUserProfile` local type alias SHALL be removed; the file SHALL
   use `FullUserWithRelations` exported from `lib/user-selects.ts`.

---

### Requirement 5: Application Status History Writer — Single Source of Truth

**User Story:** As the engineering team, we want every status-history write to go through one
function, so that schema changes to `ApplicationStatusHistory` require one edit and are
automatically consistent.

#### Acceptance Criteria

1. THE `lib/application-history.ts` Canonical_Library SHALL export `writeApplicationStatusHistory`
   as the sole implementation for creating `ApplicationStatusHistory` records in the codebase.

2. WHEN `applications.service.ts` `applyToJob` is compiled, THE Module SHALL call
   `writeApplicationStatusHistory` instead of `prisma.applicationStatusHistory.create` directly
   for the initial `APPLIED` history entry.

3. WHEN `applications.service.ts` `withdrawApplication` is compiled, THE Module SHALL call
   `writeApplicationStatusHistory` instead of `prisma.applicationStatusHistory.create` directly
   for the `WITHDRAWN` history entry.

4. WHEN `ats.service.ts` `performMove` is compiled, THE Module SHALL call
   `writeApplicationStatusHistory` instead of `prisma.applicationStatusHistory.create` directly
   for every status transition entry.

5. WHEN `interviews.service.ts` `markApplicationInterviewStage` is compiled, THE Module SHALL
   call `writeApplicationStatusHistory` instead of `prisma.applicationStatusHistory.create`
   directly for the interview-stage transition entry.

6. WHEN `freelance.service.ts` `createReferral` is compiled, THE Module SHALL call
   `writeApplicationStatusHistory` inside the `prisma.$transaction` callback instead of
   `tx.applicationStatusHistory.create` directly.

7. WHEN `writeApplicationStatusHistory` is called with a `TransactionClient` and the surrounding
   transaction rolls back, THE Function SHALL NOT commit any `ApplicationStatusHistory` row
   independently of the transaction.

8. WHEN `writeApplicationStatusHistory` is called with the global `prisma` client outside a
   transaction, THE Function SHALL write exactly one `ApplicationStatusHistory` row to the
   database.

9. THE Migration SHALL NOT change the `fromStatus`, `toStatus`, `changedByUserId`, or `note`
   values written to any `ApplicationStatusHistory` row compared to the previous inline calls.

10. THE Migration SHALL NOT change the HTTP status code or response body of any endpoint that
    previously triggered an inline `applicationStatusHistory.create`.

---

### Requirement 6: No Regression — Quality Gate

**User Story:** As a product owner, I want the consolidation sprint to produce zero observable
change for any user, API consumer, or database, so that the codebase can be safely deployed
without a feature-flag or migration window.

#### Acceptance Criteria

1. THE Consolidated_Codebase SHALL compile without TypeScript errors across all modules in
   `apps/api/src/`.

2. WHEN any request that was previously handled correctly is sent to the API after consolidation,
   THE API SHALL return the same HTTP status code, response body structure, and header set as
   before.

3. THE Consolidated_Codebase SHALL NOT introduce any new `prisma.$queryRaw`, `prisma.$executeRaw`,
   or schema-migration file.

4. THE Consolidated_Codebase SHALL NOT modify any route registration in any `*.routes.ts` file.

5. THE Consolidated_Codebase SHALL NOT modify any permission guard in any `*.middleware.ts` or
   `rbac.ts` file.

6. THE Consolidated_Codebase SHALL NOT change the `isActive`, `isApproved`, `isSuspended`,
   `metadata`, `role`, or `tenantId` fields written to the `User` table by any service function.

7. THE Consolidated_Codebase SHALL NOT add, remove, or rename any exported function, type, or
   constant in `middleware/auth.ts`, `middleware/approval.ts`, `middleware/rbac.ts`, or
   `middleware/tenant-resolver.ts`.

8. WHEN the consolidated `lib/tenant.ts` `resolveUserTenant` function encounters a user that
   does not exist in the database, THE Function SHALL throw `TenantResolutionError` with
   `statusCode` 404 — the same error code as all previous local `getUserTenantId` functions.

9. WHEN the consolidated `lib/tenant.ts` `resolveUserTenantOrNull` function encounters a user
   that does not exist in the database, THE Function SHALL return `null` — matching the previous
   `notifications.service.ts` `getUserTenantOrNull` behaviour.

10. THE Sprint SHALL NOT delete any file from `apps/api/src/modules/` or `apps/api/src/lib/`;
    it SHALL only modify existing files by replacing duplicate definitions with canonical imports.
