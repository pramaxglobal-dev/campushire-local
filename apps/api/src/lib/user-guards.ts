/**
 * user-guards.ts
 *
 * Single source of truth for:
 *   1. User suspension logic
 *   2. Approval-required roles
 *
 * Previously duplicated across:
 *   - middleware/auth.ts        (getSuspendedState)
 *   - modules/auth/auth.service.ts  (isSuspended, approvalRequiredRoles Set)
 *   - modules/admin/admin.service.ts (getSuspendedState, getPendingApprovals inline array)
 *   - middleware/approval.ts    (approvalRequiredRoles Array)
 */

import { UserRole } from "@campushire/types";

/**
 * Roles that require explicit admin approval before the user can access
 * protected features. STUDENT and JOB_SEEKER are auto-approved on email
 * verification; SUPER_ADMIN is never subject to approval.
 *
 * This is the canonical definition. Every approval check in the system
 * (middleware, services, admin queries) must reference this constant.
 */
export const APPROVAL_REQUIRED_ROLES: readonly UserRole[] = [
  UserRole.CORPORATE_RECRUITER,
  UserRole.COLLEGE_ADMIN,
  UserRole.VENDOR,
  UserRole.TRAINING_PARTNER,
  UserRole.FREELANCE_RECRUITER
] as const;

/**
 * Returns true when a given role requires admin approval.
 * Convenience wrapper over APPROVAL_REQUIRED_ROLES for boolean checks.
 */
export const requiresApproval = (role: UserRole): boolean =>
  (APPROVAL_REQUIRED_ROLES as readonly UserRole[]).includes(role);

/**
 * Determines whether a user account is suspended.
 *
 * A user is considered suspended when either:
 *   - isActive is false, OR
 *   - metadata.isSuspended === true
 *
 * Both conditions must be checked because the admin can set isActive=false
 * (hard block) or set metadata.isSuspended=true while leaving isActive=true
 * (soft flag, used for rejection flow).
 *
 * @param user - Minimal user shape required for the check.
 */
export const isUserSuspended = (user: { isActive: boolean; metadata: unknown }): boolean => {
  if (!user.isActive) {
    return true;
  }

  if (!user.metadata || typeof user.metadata !== "object" || Array.isArray(user.metadata)) {
    return false;
  }

  const meta = user.metadata as Record<string, unknown>;
  return meta.isSuspended === true;
};
