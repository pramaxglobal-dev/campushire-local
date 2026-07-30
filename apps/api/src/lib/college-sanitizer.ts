import { UserRole } from "@campushire/types";

export interface RequesterInfo {
  userId: string;
  role: UserRole;
  tenantId?: string | null;
}

export const maskEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const parts = email.split("@");
  if (parts.length === 2) {
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : "***";
    return `${maskedName}@${domain}`;
  }
  return "contact.hidden@masked.local";
};

export const maskPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  if (phone.length > 4) {
    return `${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}`;
  }
  return "XXXXXXXXXX";
};

/**
 * Sanitizes a CollegeProfile object by masking placementEmail and placementPhone
 * unless the requester is a SUPER_ADMIN, the college's own admin user, or belongs to the same college tenant.
 */
export function sanitizeCollegeProfile<T extends Record<string, any>>(
  college: T | null | undefined,
  requester?: RequesterInfo | null
): T | null | undefined {
  if (!college) return college;

  const isSuperAdmin = requester?.role === UserRole.SUPER_ADMIN;
  const isOwnCollegeAdmin = Boolean(requester?.userId && college.adminUserId === requester.userId);
  const isSameCollegeTenant = Boolean(
    requester?.tenantId && college.tenantId && requester.tenantId === college.tenantId
  );

  if (isSuperAdmin || isOwnCollegeAdmin || isSameCollegeTenant) {
    return college;
  }

  const copy: any = { ...college };
  if ("placementEmail" in copy && copy.placementEmail) {
    copy.placementEmail = maskEmail(copy.placementEmail as string);
  }
  if ("placementPhone" in copy && copy.placementPhone) {
    copy.placementPhone = maskPhone(copy.placementPhone as string);
  }
  if (copy.adminUser) {
    copy.adminUser = {
      ...copy.adminUser,
      email: maskEmail(copy.adminUser.email),
      phone: maskPhone(copy.adminUser.phone)
    };
  }

  return copy;
}

/**
 * Sanitizes a User object (e.g. FullUserProfile) by masking email/phone and collegeProfileManaged
 * if the requester is NOT SUPER_ADMIN, NOT the user themselves, and NOT from the same tenant.
 */
export function sanitizeUserProfile<T extends Record<string, any>>(
  user: T | null | undefined,
  requester?: RequesterInfo | null
): T | null | undefined {
  if (!user) return user;

  const isSuperAdmin = requester?.role === UserRole.SUPER_ADMIN;
  const isSelf = Boolean(requester?.userId && user.id === requester.userId);
  const isSameCollegeTenant = Boolean(
    requester?.tenantId && user.tenantId && requester.tenantId === user.tenantId
  );

  if (isSuperAdmin || isSelf || isSameCollegeTenant) {
    return user;
  }

  const copy: any = { ...user };
  if (copy.role === UserRole.COLLEGE_ADMIN) {
    if ("email" in copy && copy.email) {
      copy.email = maskEmail(copy.email as string);
    }
    if ("phone" in copy && copy.phone) {
      copy.phone = maskPhone(copy.phone as string);
    }
  }

  if (copy.collegeProfileManaged) {
    copy.collegeProfileManaged = sanitizeCollegeProfile(copy.collegeProfileManaged, requester);
  }

  return copy;
}
