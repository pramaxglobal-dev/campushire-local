/**
 * user-selects.ts
 *
 * Single source of truth for Prisma user select / include objects.
 *
 * Previously duplicated across:
 *   - modules/auth/auth.service.ts  (safeUserSelect, fullUserProfileSelect)
 *   - modules/admin/admin.service.ts (safeUserSelect, fullUserInclude)
 *   - modules/users/users.service.ts (fullProfileSelect)
 *
 * The exported types are re-exported so consumers can type their return
 * values without re-deriving from Prisma.UserGetPayload themselves.
 */

import { Prisma } from "@prisma/client";

/**
 * Minimal user projection used by authentication flows and admin listing.
 * Contains all scalar fields needed to identify, display, and gate access
 * for a user. Does NOT include relations.
 *
 * Fields: id, tenantId, tin, email, phone, firstName, lastName, avatarUrl,
 * role, subRole, profileVisibility, isApproved, isEmailVerified,
 * isPhoneVerified, isActive, metadata, lastLoginAt, createdAt, updatedAt.
 */
export const SAFE_USER_SELECT = {
  id: true,
  tenantId: true,
  tin: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  subRole: true,
  profileVisibility: true,
  isApproved: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
  metadata: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof SAFE_USER_SELECT }>;

/**
 * Full user profile projection including all role-specific sub-profiles and
 * candidate portfolio data. Used by /auth/me, /users/profile, and admin
 * user detail endpoints.
 */
export const FULL_USER_PROFILE_SELECT = {
  id: true,
  tenantId: true,
  tin: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  subRole: true,
  headline: true,
  bio: true,
  profileVisibility: true,
  isApproved: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
  metadata: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  tenant: true,
  studentProfile: true,
  recruiterProfile: true,
  freelanceRecruiterProfile: true,
  vendorProfile: true,
  trainingPartnerProfile: true,
  jobSeekerProfile: true,
  collegeProfileManaged: true,
  candidateEducations: true,
  candidateExperiences: true,
  candidateCertifications: true,
  candidateProjects: true
} satisfies Prisma.UserSelect;

export type FullUserProfile = Prisma.UserGetPayload<{
  select: typeof FULL_USER_PROFILE_SELECT;
}>;

/**
 * Full user include (relation-loaded) object used by admin getUserDetail.
 * Semantically identical to FULL_USER_PROFILE_SELECT but expressed as
 * `include` to load relations alongside all scalar fields.
 */
export const FULL_USER_INCLUDE = {
  tenant: true,
  studentProfile: true,
  recruiterProfile: true,
  freelanceRecruiterProfile: true,
  vendorProfile: true,
  trainingPartnerProfile: true,
  jobSeekerProfile: true,
  collegeProfileManaged: true,
  candidateEducations: true,
  candidateExperiences: true,
  candidateCertifications: true,
  candidateProjects: true
} satisfies Prisma.UserInclude;

export type FullUserWithRelations = Prisma.UserGetPayload<{
  include: typeof FULL_USER_INCLUDE;
}>;
