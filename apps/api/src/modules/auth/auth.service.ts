import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import { Prisma, type User } from "@prisma/client";
import {
  OAuthProvider,
  PricingModel,
  SubRole,
  UserRole,
  VendorType,
  type JwtPayload
} from "@campushire/types";
import { generateSlug, generateTIN, sanitizeInput, validateEmail } from "@campushire/utils";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { comparePassword, hashPassword } from "../../lib/bcrypt";
import { logActivity } from "../../lib/activity";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken
} from "../../lib/jwt";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail
} from "../../lib/mailer";
import { isUserSuspended, requiresApproval } from "../../lib/user-guards";
import {
  SAFE_USER_SELECT,
  FULL_USER_PROFILE_SELECT,
  type SafeUser,
  type FullUserProfile
} from "../../lib/user-selects";
import type { LoginDto, RegisterDto } from "./auth.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

// SafeUser and FullUserProfile are re-exported from the shared module so that
// other modules importing them from here continue to work without changes.
export type { SafeUser, FullUserProfile };

type TransactionClient = Prisma.TransactionClient;
type RefreshTokenRevokedReason =
  | "LOGOUT"
  | "LOGOUT_ALL"
  | "PASSWORD_RESET"
  | "ROTATED"
  | "REUSE_DETECTED"
  | "SUSPENDED";

export interface OAuthState {
  role: UserRole;
  inviteCode?: string;
}

export interface OAuthProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
  name?: {
    givenName?: string;
    familyName?: string;
  };
}

interface InviteValidationResult {
  inviteId: string;
  tenantId: string;
  collegeProfileId: string | null;
}

const parseDurationToMs = (duration: string): number => {
  if (/^\d+$/.test(duration)) {
    return Number(duration) * 1000;
  }

  const match = duration.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new ServiceError("Invalid token expiry configuration.", 500);
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();

  if (!unit) {
    throw new ServiceError("Invalid token expiry configuration.", 500);
  }

  const factors: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
  };

  const factor = factors[unit];
  if (!factor) {
    throw new ServiceError("Invalid token expiry configuration.", 500);
  }

  return amount * factor;
};

const buildJwtPayload = (
  user: Pick<User, "id" | "role" | "tenantId" | "subRole">,
  familyId?: string | null
): JwtPayload => {
  return {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    subRole: user.subRole ?? SubRole.MEMBER,
    familyId: familyId ?? null
  };
};

const createUniqueTenantSlug = async (tx: TransactionClient, baseName: string): Promise<string> => {
  const baseSlug = generateSlug(baseName) || `tenant-${nanoid(8).toLowerCase()}`;
  let candidate = baseSlug;
  let suffix = 1;

  for (;;) {
    const existing = await tx.tenant.findUnique({ where: { slug: candidate } });
    if (!existing) {
      return candidate;
    }
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const createTenantForRole = async (
  tx: TransactionClient,
  role: UserRole,
  firstName: string,
  lastName: string
): Promise<{ id: string; slug: string }> => {
  const displayName = `${firstName} ${lastName}`.trim();
  const roleSuffix: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "Platform",
    [UserRole.COLLEGE_ADMIN]: "College",
    [UserRole.STUDENT]: "Student",
    [UserRole.JOB_SEEKER]: "Professional",
    [UserRole.CORPORATE_RECRUITER]: "Enterprise",
    [UserRole.FREELANCE_RECRUITER]: "Agency",
    [UserRole.VENDOR]: "Vendor",
    [UserRole.TRAINING_PARTNER]: "Academy"
  };

  const name = `${displayName} ${roleSuffix[role]}`.trim();
  const slug = await createUniqueTenantSlug(tx, name);

  const tenant = await tx.tenant.create({
    data: {
      name,
      slug,
      isActive: true,
      isWhiteLabel: false
    },
    select: {
      id: true,
      slug: true
    }
  });

  return tenant;
};

const validateStudentInvite = async (
  tx: TransactionClient,
  inviteCode: string | undefined
): Promise<InviteValidationResult> => {
  if (!inviteCode) {
    throw new ServiceError("Invite code is required for students.", 400);
  }

  const invite = await tx.invite.findUnique({
    where: { code: inviteCode },
    select: {
      id: true,
      tenantId: true,
      collegeProfileId: true,
      isActive: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true
    }
  });

  if (!invite || !invite.isActive) {
    throw new ServiceError("Invalid invite code.", 400);
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    throw new ServiceError("Invite code has expired.", 400);
  }

  if (invite.usedCount >= invite.maxUses) {
    throw new ServiceError("Invite code usage limit reached.", 400);
  }

  return {
    inviteId: invite.id,
    tenantId: invite.tenantId,
    collegeProfileId: invite.collegeProfileId
  };
};

const createRoleProfileSetup = async (
  tx: TransactionClient,
  user: Pick<User, "id" | "role" | "tenantId" | "firstName" | "lastName">,
  inviteContext?: InviteValidationResult
): Promise<void> => {
  if (user.role === UserRole.STUDENT) {
    if (!user.tenantId || !inviteContext?.collegeProfileId) {
      throw new ServiceError("Student registration requires a valid college invite.", 400);
    }

    await tx.studentProfile.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        collegeProfileId: inviteContext.collegeProfileId,
        careerScore: 0,
        isProfileComplete: false
      }
    });
    return;
  }

  if (user.role === UserRole.JOB_SEEKER) {
    await tx.jobSeekerProfile.create({
      data: {
        userId: user.id,
        careerScore: 0,
        isProfileComplete: false
      }
    });
    return;
  }

  if (user.role === UserRole.CORPORATE_RECRUITER) {
    if (!user.tenantId) {
      throw new ServiceError("Corporate recruiter requires a tenant.", 400);
    }

    const companyName = `${user.firstName} ${user.lastName} Technologies`.trim();
    const companySlug = `${generateSlug(companyName)}-${nanoid(6).toLowerCase()}`;

    await tx.recruiterProfile.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        companyName,
        companySlug,
        hiringNow: false,
        isVerified: false
      }
    });
    return;
  }

  if (user.role === UserRole.FREELANCE_RECRUITER) {
    if (!user.tenantId) {
      throw new ServiceError("Freelance recruiter requires a tenant.", 400);
    }

    await tx.freelanceRecruiterProfile.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        agencyName: `${user.firstName} ${user.lastName} Recruiting`
      }
    });
    return;
  }

  if (user.role === UserRole.VENDOR) {
    if (!user.tenantId) {
      throw new ServiceError("Vendor requires a tenant.", 400);
    }

    await tx.vendorProfile.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        vendorType: VendorType.OTHER,
        businessName: `${user.firstName} ${user.lastName} Services`,
        pricingModel: PricingModel.CUSTOM,
        isActive: true,
        isVerified: false
      }
    });
    return;
  }

  if (user.role === UserRole.TRAINING_PARTNER) {
    if (!user.tenantId) {
      throw new ServiceError("Training partner requires a tenant.", 400);
    }

    await tx.trainingPartnerProfile.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        organizationName: `${user.firstName} ${user.lastName} Academy`
      }
    });
    return;
  }

  if (user.role === UserRole.COLLEGE_ADMIN) {
    if (!user.tenantId) {
      throw new ServiceError("College admin requires a tenant.", 400);
    }

    const collegeName = `${user.firstName} ${user.lastName} College`.trim();
    const collegeSlug = `${generateSlug(collegeName)}-${nanoid(6).toLowerCase()}`;

    await tx.collegeProfile.create({
      data: {
        tenantId: user.tenantId,
        adminUserId: user.id,
        name: collegeName,
        slug: collegeSlug,
        openForPlacement: true
      }
    });
  }
};

const fetchSafeUserById = async (id: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: SAFE_USER_SELECT
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  return user;
};

const createRefreshTokenRecord = async (
  tx: TransactionClient,
  userId: string,
  tokenValue: string,
  ipAddress?: string,
  userAgent?: string,
  familyId?: string | null
): Promise<{ id: string; familyId: string }> => {
  const resolvedFamilyId = familyId ?? nanoid(21);
  const tokenHash = hashToken(tokenValue);
  const created = await tx.refreshToken.create({
    data: {
      userId,
      token: tokenHash,
      familyId: resolvedFamilyId,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN))
    },
    select: {
      id: true,
      familyId: true
    }
  });
  return {
    id: created.id,
    familyId: created.familyId ?? resolvedFamilyId
  };
};

export const register = async (dto: RegisterDto): Promise<{ user: SafeUser; message: string }> => {
  const firstName = sanitizeInput(dto.firstName);
  const lastName = sanitizeInput(dto.lastName);
  const email = dto.email.toLowerCase().trim();

  if (!validateEmail(email)) {
    throw new ServiceError("Invalid email address.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingEmail = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (existingEmail) {
      throw new ServiceError("Email is already registered.", 409);
    }

    if (dto.phone) {
      const existingPhone = await tx.user.findUnique({
        where: { phone: dto.phone.trim() },
        select: { id: true }
      });
      if (existingPhone) {
        throw new ServiceError("Phone is already registered.", 409);
      }
    }

    let inviteContext: InviteValidationResult | undefined;
    let tenantId: string | null = null;

    if (dto.role === UserRole.STUDENT) {
      inviteContext = await validateStudentInvite(tx, dto.inviteCode);
      tenantId = inviteContext.tenantId;
    } else if (dto.role !== UserRole.JOB_SEEKER && dto.role !== UserRole.SUPER_ADMIN) {
      const tenant = await createTenantForRole(tx, dto.role, firstName, lastName);
      tenantId = tenant.id;
    }

    const user = await tx.user.create({
      data: {
        tenantId,
        tin: generateTIN(dto.role),
        email,
        phone: dto.phone?.trim() || null,
        passwordHash: await hashPassword(dto.password),
        firstName,
        lastName,
        role: dto.role,
        subRole: SubRole.MEMBER,
        isApproved: false,
        isEmailVerified: false,
        isActive: true
      }
    });

    await createRoleProfileSetup(tx, user, inviteContext);

    if (inviteContext) {
      await tx.invite.update({
        where: { id: inviteContext.inviteId },
        data: {
          usedCount: {
            increment: 1
          }
        }
      });

      await tx.inviteUse.create({
        data: {
          inviteId: inviteContext.inviteId,
          usedByUserId: user.id
        }
      });
    }

    const verificationToken = randomBytes(24).toString("hex");

    await tx.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    return {
      userId: user.id,
      verificationToken,
      tenantId: user.tenantId,
      role: user.role
    };
  });

  await logActivity({
    actorUserId: result.userId,
    tenantId: result.tenantId ?? undefined,
    action: "auth.register",
    entityType: "User",
    entityId: result.userId,
    metadata: {
      role: result.role
    }
  });

  const safeUser = await fetchSafeUserById(result.userId);
  await sendVerificationEmail(safeUser.email, result.verificationToken, safeUser.firstName);

  return {
    user: safeUser,
    message: "Verify your email"
  };
};

export const login = async (
  dto: LoginDto,
  ipAddress: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> => {
  const email = dto.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    throw new ServiceError("Invalid email or password.", 401);
  }

  const passwordValid = await comparePassword(dto.password, user.passwordHash);
  if (!passwordValid) {
    throw new ServiceError("Invalid email or password.", 401);
  }

  if (!user.isEmailVerified) {
    throw new ServiceError("Email not verified.", 403);
  }

  if (isUserSuspended(user)) {
    throw new ServiceError("Account suspended", 403);
  }

  const familyId = nanoid(21);
  const payload = buildJwtPayload(user, familyId);
  const accessToken = generateAccessToken(payload);
  const refreshTokenValue = generateRefreshToken(payload);

  await prisma.$transaction(async (tx) => {
    await createRefreshTokenRecord(tx, user.id, refreshTokenValue, ipAddress, userAgent, familyId);

    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
  });

  await logActivity({
    actorUserId: user.id,
    tenantId: user.tenantId ?? undefined,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ipAddress,
    userAgent
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: await fetchSafeUserById(user.id)
  };
};

export const refreshToken = async (
  tokenValue: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const decoded = verifyRefreshToken(tokenValue);
  const tokenHash = hashToken(tokenValue);
  const now = new Date();

  const stored = await prisma.refreshToken.findFirst({
    where: {
      userId: decoded.userId,
      token: tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: true
    }
  });

  if (!stored) {
    const revoked = await prisma.refreshToken.findFirst({
      where: {
        userId: decoded.userId,
        token: tokenHash,
        revokedAt: { not: null }
      },
      include: {
        user: true
      }
    });

    if (revoked?.familyId) {
      await prisma.refreshToken.updateMany({
        where: {
          userId: revoked.userId,
          familyId: revoked.familyId,
          revokedAt: null
        },
        data: {
          revokedAt: now,
          revokedReason: "REUSE_DETECTED"
        }
      });

      await logActivity({
        actorUserId: revoked.userId,
        tenantId: revoked.user.tenantId ?? undefined,
        action: "auth.refresh_reuse_detected",
        entityType: "RefreshToken",
        entityId: revoked.id,
        ipAddress: revoked.ipAddress ?? undefined,
        userAgent: revoked.userAgent ?? undefined,
        metadata: {
          familyId: revoked.familyId
        }
      });
    }

    throw new ServiceError("Invalid refresh token.", 401);
  }

  if (isUserSuspended(stored.user)) {
    throw new ServiceError("Invalid refresh token.", 401);
  }

  const familyId = stored.familyId ?? decoded.familyId ?? nanoid(21);
  const payload = buildJwtPayload(stored.user, familyId);
  const accessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  await prisma.$transaction(async (tx) => {
    const created = await createRefreshTokenRecord(
      tx,
      stored.userId,
      newRefreshToken,
      stored.ipAddress ?? undefined,
      stored.userAgent ?? undefined,
      familyId
    );

    await tx.refreshToken.update({
      where: { id: stored.id },
      data: {
        familyId,
        revokedAt: now,
        revokedReason: "ROTATED",
        replacedByTokenId: created.id,
        lastUsedAt: now
      }
    });
  });

  return {
    accessToken,
    refreshToken: newRefreshToken
  };
};

export const logout = async (refreshTokenValue: string): Promise<void> => {
  const tokenHash = hashToken(refreshTokenValue);

  await prisma.refreshToken.updateMany({
    where: {
      token: tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date(),
      revokedReason: "LOGOUT"
    }
  });
};

export const logoutAll = async (
  userId: string,
  reason: RefreshTokenRevokedReason = "LOGOUT_ALL"
): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason
    }
  });
};

export const verifyEmail = async (token: string): Promise<void> => {
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
    include: {
      user: true
    }
  });

  if (!verification) {
    throw new ServiceError("Invalid verification token.", 400);
  }

  if (verification.verifiedAt) {
    return;
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    throw new ServiceError("Verification token expired.", 400);
  }

  const autoApprove =
    verification.user.role === UserRole.STUDENT || verification.user.role === UserRole.JOB_SEEKER;

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: verification.userId },
      data: {
        isEmailVerified: true,
        isApproved: autoApprove ? true : verification.user.isApproved
      }
    })
  ]);

  await logActivity({
    actorUserId: verification.userId,
    tenantId: verification.user.tenantId ?? undefined,
    action: "auth.verify_email",
    entityType: "User",
    entityId: verification.userId
  });

  await sendWelcomeEmail(verification.user.email, verification.user.firstName, verification.user.role);
};

export const resendVerificationEmail = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      firstName: true,
      isEmailVerified: true,
      tenantId: true
    }
  });

  if (!user || user.isEmailVerified) {
    return;
  }

  const verificationToken = randomBytes(24).toString("hex");

  await prisma.$transaction([
    prisma.emailVerification.deleteMany({
      where: {
        userId: user.id,
        verifiedAt: null
      }
    }),
    prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })
  ]);

  await logActivity({
    actorUserId: user.id,
    tenantId: user.tenantId ?? undefined,
    action: "auth.resend_verification",
    entityType: "User",
    entityId: user.id
  });

  await sendVerificationEmail(user.email, verificationToken, user.firstName);
};

export const forgotPassword = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return;
  }

  const rawToken = randomBytes(24).toString("hex");
  const hashedToken = hashToken(rawToken);

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }
  });

  await logActivity({
    actorUserId: user.id,
    tenantId: user.tenantId ?? undefined,
    action: "auth.forgot_password",
    entityType: "User",
    entityId: user.id
  });

  await sendPasswordResetEmail(user.email, rawToken, user.firstName);
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const tokenHash = hashToken(token);

  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token: tokenHash },
    include: {
      user: true
    }
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt.getTime() < Date.now()) {
    throw new ServiceError("Invalid or expired reset token.", 400);
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newPasswordHash }
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() }
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: resetRecord.userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date(),
        revokedReason: "PASSWORD_RESET"
      }
    })
  ]);

  await logActivity({
    actorUserId: resetRecord.userId,
    tenantId: resetRecord.user.tenantId ?? undefined,
    action: "auth.reset_password",
    entityType: "User",
    entityId: resetRecord.userId
  });
};

const getEmailFromOAuthProfile = (profile: OAuthProfile): string => {
  const email = profile.emails?.[0]?.value?.toLowerCase().trim();
  if (!email || !validateEmail(email)) {
    throw new ServiceError("OAuth provider did not return a valid email.", 400);
  }
  return email;
};

const getNamesFromOAuthProfile = (profile: OAuthProfile): { firstName: string; lastName: string } => {
  const first =
    profile.name?.givenName ??
    profile.displayName?.split(" ")[0] ??
    "CampusHire";
  const last =
    profile.name?.familyName ??
    profile.displayName?.split(" ").slice(1).join(" ") ??
    "User";

  return {
    firstName: sanitizeInput(first) || "CampusHire",
    lastName: sanitizeInput(last) || "User"
  };
};

const completeOAuthLogin = async (
  user: Pick<User, "id" | "tenantId" | "role" | "subRole" | "metadata" | "isActive">,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> => {
  if (isUserSuspended(user)) {
    throw new ServiceError("Account suspended", 403);
  }

  const familyId = nanoid(21);
  const payload = buildJwtPayload(user, familyId);
  const accessToken = generateAccessToken(payload);
  const refreshTokenValue = generateRefreshToken(payload);

  await prisma.$transaction(async (tx) => {
    await createRefreshTokenRecord(tx, user.id, refreshTokenValue, ipAddress, userAgent, familyId);

    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), isEmailVerified: true }
    });
  });

  await logActivity({
    actorUserId: user.id,
    tenantId: user.tenantId ?? undefined,
    action: "auth.oauth_login",
    entityType: "User",
    entityId: user.id,
    ipAddress,
    userAgent
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: await fetchSafeUserById(user.id)
  };
};

const ensureOAuthUser = async (
  provider: OAuthProvider,
  profile: OAuthProfile,
  state: OAuthState
): Promise<{ user: User; isNew: boolean }> => {
  const providerAccount = await prisma.oAuthAccount.findFirst({
    where: {
      provider,
      providerAccountId: profile.id
    },
    include: {
      user: true
    }
  });

  if (providerAccount) {
    return {
      user: providerAccount.user,
      isNew: false
    };
  }

  const email = getEmailFromOAuthProfile(profile);
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    await prisma.oAuthAccount.create({
      data: {
        userId: existingUser.id,
        provider,
        providerAccountId: profile.id
      }
    });

    return {
      user: existingUser,
      isNew: false
    };
  }

  const names = getNamesFromOAuthProfile(profile);

  const createdUser = await prisma.$transaction(async (tx) => {
    let inviteContext: InviteValidationResult | undefined;
    let tenantId: string | null = null;

    if (state.role === UserRole.STUDENT) {
      inviteContext = await validateStudentInvite(tx, state.inviteCode);
      tenantId = inviteContext.tenantId;
    } else if (state.role !== UserRole.JOB_SEEKER && state.role !== UserRole.SUPER_ADMIN) {
      const tenant = await createTenantForRole(tx, state.role, names.firstName, names.lastName);
      tenantId = tenant.id;
    }

    const user = await tx.user.create({
      data: {
        tenantId,
        tin: generateTIN(state.role),
        email,
        firstName: names.firstName,
        lastName: names.lastName,
        role: state.role,
        subRole: SubRole.MEMBER,
        isEmailVerified: true,
        isApproved: !requiresApproval(state.role),
        isActive: true
      }
    });

    await tx.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId: profile.id
      }
    });

    await createRoleProfileSetup(tx, user, inviteContext);

    if (inviteContext) {
      await tx.invite.update({
        where: { id: inviteContext.inviteId },
        data: {
          usedCount: {
            increment: 1
          }
        }
      });

      await tx.inviteUse.create({
        data: {
          inviteId: inviteContext.inviteId,
          usedByUserId: user.id
        }
      });
    }

    return user;
  });

  await logActivity({
    actorUserId: createdUser.id,
    tenantId: createdUser.tenantId ?? undefined,
    action: "auth.oauth_register",
    entityType: "User",
    entityId: createdUser.id,
    metadata: {
      provider
    }
  });

  await sendWelcomeEmail(createdUser.email, createdUser.firstName, createdUser.role);

  return {
    user: createdUser,
    isNew: true
  };
};

export const googleOAuthCallback = async (
  profile: OAuthProfile,
  state: OAuthState,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string; user: SafeUser; isNew: boolean }> => {
  const { user, isNew } = await ensureOAuthUser(OAuthProvider.GOOGLE, profile, state);
  const session = await completeOAuthLogin(user, ipAddress, userAgent);

  return {
    ...session,
    isNew
  };
};

export const linkedinOAuthCallback = async (
  profile: OAuthProfile,
  state: OAuthState,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string; user: SafeUser; isNew: boolean }> => {
  const { user, isNew } = await ensureOAuthUser(OAuthProvider.LINKEDIN, profile, state);
  const session = await completeOAuthLogin(user, ipAddress, userAgent);

  return {
    ...session,
    isNew
  };
};

export const getMe = async (userId: string): Promise<FullUserProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: FULL_USER_PROFILE_SELECT
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  return user;
};
