/**
 * tenant.ts
 *
 * Single source of truth for resolving a user's tenant from the database.
 *
 * Previously duplicated as private module-local functions across:
 *   - modules/ats/ats.service.ts              (getUserTenantId)
 *   - modules/interviews/interviews.service.ts (getUserTenantId)
 *   - modules/jobs/jobs.service.ts             (getUserTenantId)
 *   - modules/connections/connections.service.ts (getUserTenantId)
 *   - modules/vendors/vendors.service.ts       (getUserWithTenant — tenant part)
 *   - modules/training/training.service.ts     (getUserWithTenant — tenant part)
 *   - modules/freelance/freelance.service.ts   (getUserWithTenant — tenant part)
 *   - modules/documents/documents.service.ts   (getUserWithTenant — tenant part)
 *   - modules/chat/chat.service.ts             (getUserWithTenant — tenant part)
 *   - modules/notifications/notifications.service.ts (getUserTenantOrNull, getUserTenant)
 *
 * Design decisions:
 *   - resolveUserTenant: used when tenantId must exist (throws on null)
 *   - resolveUserTenantOrNull: used when null is a valid return (notifications module)
 *   - Module-local getUserWithTenant functions that return { id, tenantId, role }
 *     call resolveUserTenant internally. The role field requires a separate
 *     query field; those functions cannot be fully unified without coupling
 *     modules. They are refactored to delegate the tenant lookup here.
 */

import { UserRole } from "@campushire/types";
import { prisma } from "./prisma";

class TenantResolutionError extends Error {
  readonly statusCode = 404;

  constructor(message = "Tenant scope not found for user.") {
    super(message);
    this.name = "TenantResolutionError";
  }
}

// Re-export so consumers can catch this specific error type.
export { TenantResolutionError };

/**
 * Resolves the tenantId for a given userId.
 * Throws TenantResolutionError (statusCode 404) when the user does not exist
 * or has no tenantId. This mirrors the behaviour all previous local
 * implementations had (ServiceError with 404).
 */
export const resolveUserTenant = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true }
  });

  if (!user?.tenantId) {
    throw new TenantResolutionError();
  }

  return user.tenantId;
};

/**
 * Resolves the tenantId for a given userId, returning null instead of
 * throwing when the user has no tenantId.
 *
 * Used by the notifications module where a missing tenant is a graceful
 * no-op rather than an error condition.
 *
 * Returns null when:
 *   - The user does not exist, OR
 *   - The user's tenantId is null (e.g. SUPER_ADMIN, JOB_SEEKER without tenant)
 */
export const resolveUserTenantOrNull = async (userId: string): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true }
  });

  return user?.tenantId ?? null;
};

export const resolveExistingUserTenantOrNull = async (userId: string): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true }
  });

  if (!user) {
    throw new TenantResolutionError("User not found.");
  }

  return user.tenantId ?? null;
};

export const resolveUserTenantContext = async (
  userId: string
): Promise<{ id: string; tenantId: string; role: UserRole }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      role: true
    }
  });

  if (!user?.tenantId) {
    throw new TenantResolutionError();
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    role: user.role
  };
};

export const resolveUserTenantIdentity = async (
  userId: string
): Promise<{ id: string; tenantId: string }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true
    }
  });

  if (!user?.tenantId) {
    throw new TenantResolutionError();
  }

  return {
    id: user.id,
    tenantId: user.tenantId
  };
};

export const resolveUserTenantProfile = async (
  userId: string
): Promise<{
  id: string;
  tenantId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
}> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      role: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });

  if (!user?.tenantId) {
    throw new TenantResolutionError();
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email
  };
};
