import { UserRole } from "@campushire/types";

export interface RequesterInfo {
  userId: string;
  role: UserRole;
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
 * unless the requester is a SUPER_ADMIN or the college's own admin user.
 */
export function sanitizeCollegeProfile<T extends Record<string, any>>(
  college: T | null | undefined,
  requester?: RequesterInfo | null
): T | null | undefined {
  if (!college) return college;

  const isSuperAdmin = requester?.role === UserRole.SUPER_ADMIN;
  const isOwnCollege = Boolean(requester?.userId && college.adminUserId === requester.userId);

  if (isSuperAdmin || isOwnCollege) {
    return college;
  }

  const copy = { ...college };
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
 * if the user is a COLLEGE_ADMIN and the requester is NOT SUPER_ADMIN and NOT the user themselves.
 */
export function sanitizeUserProfile<T extends Record<string, any>>(
  user: T | null | undefined,
  requester?: RequesterInfo | null
): T | null | undefined {
  if (!user) return user;

  const isSuperAdmin = requester?.role === UserRole.SUPER_ADMIN;
  const isSelf = Boolean(requester?.userId && user.id === requester.userId);

  if (isSuperAdmin || isSelf) {
    return user;
  }

  const copy = { ...user };
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
