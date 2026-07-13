import { subDays } from "date-fns";
import { Prisma } from "@prisma/client";
import {
  NotificationChannel,
  NotificationType,
  Plan,
  UserRole,
  type FeatureFlag,
  type ActivityLog,
  type FreelanceRecruiterProfile,
  type CollegeProfile,
  type PaginatedResponse,
  type PlatformSetting,
  type RecruiterProfile,
  type TrainingPartnerProfile,
  type VendorProfile
} from "@campushire/types";
import { getRoleLabel, sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import { sendNotification } from "../../lib/notification";
import { APPROVAL_REQUIRED_ROLES } from "../../lib/user-guards";
import { FULL_USER_INCLUDE, SAFE_USER_SELECT, type FullUserWithRelations } from "../../lib/user-selects";
import type { SafeUser } from "../auth/auth.service";
import type { BroadcastDto, UserFilters, CohortDashboardFilters } from "./admin.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

type FullUserProfile = FullUserWithRelations;

export interface PlatformStats {
  usersByRole: Record<UserRole, number>;
  totalTenants: number;
  totalJobs: number;
  totalApplications: number;
  newSignupsLast7Days: number;
}

export interface PendingApproval {
  user: SafeUser;
  profile:
    | CollegeProfile
    | RecruiterProfile
    | VendorProfile
    | TrainingPartnerProfile
    | FreelanceRecruiterProfile
    | null;
  role: UserRole;
}

export interface FeatureFlagListItem {
  key: string;
  isEnabled: boolean;
  enabledForPlans: Plan[];
  description: string | null;
}

const mergeMetadata = (
  metadata: Prisma.JsonValue | null,
  patch: Record<string, unknown>
): Prisma.InputJsonValue => {
  const current =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  return {
    ...current,
    ...patch
  } as Prisma.InputJsonValue;
};

const requireUserById = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  return user;
};

export const listUsers = async (
  filters: UserFilters,
  page: number,
  limit: number
): Promise<PaginatedResponse<SafeUser[]>> => {
  const where: Prisma.UserWhereInput = {
    role: filters.role,
    isApproved: filters.isApproved,
    tenantId: filters.tenantId,
    ...(filters.search
      ? {
          OR: [
            { firstName: { contains: filters.search, mode: "insensitive" } },
            { lastName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  if (typeof filters.isSuspended === "boolean") {
    where.isActive = !filters.isSuspended;
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: SAFE_USER_SELECT,
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  return {
    success: true,
    data: users,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const getUserDetail = async (userId: string): Promise<FullUserProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: FULL_USER_INCLUDE
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  return user;
};

export const approveUser = async (userId: string, adminId: string): Promise<SafeUser> => {
  const user = await requireUserById(userId);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isApproved: true,
      isActive: true,
      metadata: mergeMetadata(user.metadata, {
        approvedBy: adminId,
        approvedAt: new Date().toISOString(),
        isSuspended: false
      })
    },
    select: SAFE_USER_SELECT
  });

  await logActivity({
    actorUserId: adminId,
    tenantId: updated.tenantId ?? undefined,
    action: "admin.user_approved",
    entityType: "User",
    entityId: updated.id,
    metadata: {
      approvedUserId: updated.id
    }
  });

  await sendNotification({
    userId: updated.id,
    type: NotificationType.SYSTEM,
    title: "Account Approved",
    body: `Your ${getRoleLabel(updated.role)} account has been approved. You can now access all features.`,
    actionUrl: "/dashboard",
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });

  return updated;
};

export const rejectUser = async (
  userId: string,
  adminId: string,
  reason: string
): Promise<SafeUser> => {
  const user = await requireUserById(userId);
  const cleanReason = sanitizeInput(reason);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      isApproved: false,
      metadata: mergeMetadata(user.metadata, {
        rejectedBy: adminId,
        rejectedAt: new Date().toISOString(),
        rejectionReason: cleanReason,
        isSuspended: true
      })
    },
    select: SAFE_USER_SELECT
  });

  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  await logActivity({
    actorUserId: adminId,
    tenantId: updated.tenantId ?? undefined,
    action: "admin.user_rejected",
    entityType: "User",
    entityId: updated.id,
    metadata: {
      reason: cleanReason
    }
  });

  await sendNotification({
    userId: updated.id,
    type: NotificationType.SYSTEM,
    title: "Account Not Approved",
    body: `Your account could not be approved. Reason: ${cleanReason}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });

  return updated;
};

export const suspendUser = async (
  userId: string,
  adminId: string,
  reason: string
): Promise<SafeUser> => {
  const user = await requireUserById(userId);
  const cleanReason = sanitizeInput(reason);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      metadata: mergeMetadata(user.metadata, {
        isSuspended: true,
        suspendedBy: adminId,
        suspendedAt: new Date().toISOString(),
        suspensionReason: cleanReason
      })
    },
    select: SAFE_USER_SELECT
  });

  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  await logActivity({
    actorUserId: adminId,
    tenantId: updated.tenantId ?? undefined,
    action: "admin.user_suspended",
    entityType: "User",
    entityId: updated.id,
    metadata: {
      reason: cleanReason
    }
  });

  return updated;
};

export const unsuspendUser = async (userId: string, adminId: string): Promise<SafeUser> => {
  const user = await requireUserById(userId);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      metadata: mergeMetadata(user.metadata, {
        isSuspended: false,
        unsuspendedBy: adminId,
        unsuspendedAt: new Date().toISOString()
      })
    },
    select: SAFE_USER_SELECT
  });

  await logActivity({
    actorUserId: adminId,
    tenantId: updated.tenantId ?? undefined,
    action: "admin.user_unsuspended",
    entityType: "User",
    entityId: updated.id
  });

  return updated;
};

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const sevenDaysAgo = subDays(new Date(), 7);

  const [users, totalTenants, totalJobs, totalApplications, newSignupsLast7Days] =
    await prisma.$transaction([
      prisma.user.findMany({
        where: {
          OR: [{ tenantId: { not: null } }, { role: UserRole.SUPER_ADMIN }]
        },
        select: {
          role: true
        }
      }),
      prisma.tenant.count(),
      prisma.job.count({
        where: {
          tenantId: { not: "" }
        }
      }),
      prisma.application.count({
        where: {
          tenantId: { not: "" }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          OR: [{ tenantId: { not: null } }, { role: UserRole.SUPER_ADMIN }]
        }
      })
    ]);

  const usersByRole: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 0,
    [UserRole.COLLEGE_ADMIN]: 0,
    [UserRole.STUDENT]: 0,
    [UserRole.JOB_SEEKER]: 0,
    [UserRole.CORPORATE_RECRUITER]: 0,
    [UserRole.FREELANCE_RECRUITER]: 0,
    [UserRole.VENDOR]: 0,
    [UserRole.TRAINING_PARTNER]: 0
  };

  for (const row of users) {
    usersByRole[row.role] += 1;
  }

  return {
    usersByRole,
    totalTenants,
    totalJobs,
    totalApplications,
    newSignupsLast7Days
  };
};

export const getPendingApprovals = async (): Promise<PendingApproval[]> => {
  const pendingUsers = await prisma.user.findMany({
    where: {
      isApproved: false,
      isEmailVerified: true,
      role: {
        in: [
          ...APPROVAL_REQUIRED_ROLES
        ]
      }
    },
    include: {
      recruiterProfile: true,
      collegeProfileManaged: true,
      vendorProfile: true,
      trainingPartnerProfile: true,
      freelanceRecruiterProfile: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return pendingUsers.map((user) => ({
    user: {
      id: user.id,
      tenantId: user.tenantId,
      tin: user.tin,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      subRole: user.subRole,
      profileVisibility: user.profileVisibility,
      isApproved: user.isApproved,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isActive: user.isActive,
      metadata: user.metadata,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    profile:
      user.recruiterProfile ??
      user.collegeProfileManaged ??
      user.vendorProfile ??
      user.trainingPartnerProfile ??
      user.freelanceRecruiterProfile ??
      null,
    role: user.role
  }));
};

export const updatePlatformSetting = async (
  key: string,
  value: string,
  adminId: string
): Promise<PlatformSetting> => {
  const cleanKey = sanitizeInput(key);
  const cleanValue = sanitizeInput(value);

  const setting = await prisma.platformSetting.upsert({
    where: {
      key: cleanKey
    },
    update: {
      value: cleanValue
    },
    create: {
      key: cleanKey,
      tenantId: null,
      value: cleanValue
    }
  });

  await logActivity({
    actorUserId: adminId,
    action: "admin.platform_setting_updated",
    entityType: "PlatformSetting",
    entityId: setting.id,
    metadata: {
      key: cleanKey
    }
  });

  return setting;
};

export const listPlatformSettings = async (): Promise<PlatformSetting[]> => {
  return prisma.platformSetting.findMany({
    where: { tenantId: null },
    orderBy: { key: "asc" }
  });
};

export const listAuditLogs = async (): Promise<Array<ActivityLog & { user: { firstName: string; lastName: string; email: string } | null; tenant: { name: string } | null }>> => {
  return prisma.activityLog.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      tenant: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
};

export const toggleFeatureFlag = async (key: string, adminId: string): Promise<FeatureFlag> => {
  const cleanKey = sanitizeInput(key);

  const existing = await prisma.featureFlag.findMany({
    where: {
      key: cleanKey,
      tenantId: null
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  let toggled: FeatureFlag | null = null;

  if (existing.length === 0) {
    toggled = await prisma.featureFlag.create({
      data: {
        tenantId: null,
        key: cleanKey,
        plan: Plan.ENTERPRISE,
        isEnabled: true
      }
    });
  } else {
    const updates = existing.map((flag) =>
      prisma.featureFlag.update({
        where: {
          id: flag.id
        },
        data: {
          isEnabled: !flag.isEnabled
        }
      })
    );

    const updated = await prisma.$transaction(updates);
    toggled = updated[0] ?? null;
  }

  if (!toggled) {
    throw new ServiceError("Unable to toggle feature flag.", 500);
  }

  await logActivity({
    actorUserId: adminId,
    action: "admin.feature_flag_toggled",
    entityType: "FeatureFlag",
    entityId: toggled.id,
    metadata: {
      key: cleanKey
    }
  });

  return toggled;
};

export const listFeatureFlags = async (): Promise<FeatureFlagListItem[]> => {
  const rows = await prisma.featureFlag.findMany({
    where: {
      tenantId: null
    },
    orderBy: [{ key: "asc" }, { plan: "asc" }]
  });

  const grouped = new Map<string, FeatureFlagListItem>();
  for (const row of rows) {
    const current = grouped.get(row.key);
    if (!current) {
      grouped.set(row.key, {
        key: row.key,
        isEnabled: row.isEnabled,
        enabledForPlans: row.isEnabled ? [row.plan] : [],
        description: row.description
      });
      continue;
    }

    current.isEnabled = current.isEnabled || row.isEnabled;
    if (row.isEnabled) {
      current.enabledForPlans = [...current.enabledForPlans, row.plan];
    }
    if (!current.description && row.description) {
      current.description = row.description;
    }
  }

  return [...grouped.values()];
};

export const broadcastNotification = async (
  dto: BroadcastDto,
  adminId: string
): Promise<void> => {
  const title = sanitizeInput(dto.title);
  const body = sanitizeInput(dto.body);
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: dto.roles ? { in: dto.roles } : undefined
    },
    select: {
      id: true
    }
  });

  if (users.length === 0) {
    return;
  }

  for (const user of users) {
    await sendNotification({
      userId: user.id,
      type: dto.type ?? NotificationType.SYSTEM,
      title,
      body,
      channels: [dto.channel ?? NotificationChannel.IN_APP]
    });
  }

  await logActivity({
    actorUserId: adminId,
    action: "admin.broadcast_notification",
    entityType: "Notification",
    entityId: "broadcast",
    metadata: {
      roles: dto.roles,
      count: users.length
    }
  });
};

export const bulkApproveStudents = async (
  userIds: string[],
  collegeProfileId: string
): Promise<{ approvedCount: number; failedIds: string[] }> => {
  return prisma.$transaction(async (tx) => {
    const students = await tx.studentProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, collegeProfileId: true }
    });

    const validUserIds = students
      .filter((s) => s.collegeProfileId === collegeProfileId)
      .map((s) => s.userId);

    if (validUserIds.length === 0) {
      return { approvedCount: 0, failedIds: userIds };
    }

    const failedIds = userIds.filter((id) => !validUserIds.includes(id));

    const result = await tx.user.updateMany({
      where: { id: { in: validUserIds } },
      data: { isApproved: true, isActive: true }
    });

    // Defense-in-depth: Runtime guard against logic bugs in our filtering step.
    // Prisma's updateMany on User cannot filter by relational fields (like studentProfile.collegeProfileId).
    // So we fetch the updated users and assert they belong to the correct college.
    const updatedStudents = await tx.studentProfile.findMany({
      where: { userId: { in: validUserIds } },
      select: { userId: true, collegeProfileId: true }
    });
    
    const hasInvalidUpdates = updatedStudents.some(s => s.collegeProfileId !== collegeProfileId);
    if (hasInvalidUpdates) {
      throw new Error("CRITICAL: Attempted to approve students outside of authorized college profile. Aborting transaction.");
    }

    return { approvedCount: result.count, failedIds };
  });
};

export const getCohortDashboardStats = async (
  collegeProfileId: string,
  filters: CohortDashboardFilters
) => {
  const studentWhere: Prisma.StudentProfileWhereInput = {
    collegeProfileId,
    ...(filters.batchYear ? { graduationYear: filters.batchYear } : {})
  };

  const totalStudents = await prisma.studentProfile.count({ where: studentWhere });

  const placedStudentsCount = await prisma.studentProfile.count({
    where: {
      ...studentWhere,
      user: { applications: { some: { status: "HIRED" } } }
    }
  });

  const unplacedStudentsCount = totalStudents - placedStudentsCount;

  const appsPerStage = await prisma.application.groupBy({
    by: ["status"],
    where: { candidate: { studentProfile: { collegeProfileId } } },
    _count: true
  });

  const applicationsPerStage = appsPerStage.reduce((acc, curr) => {
    acc[curr.status] = curr._count;
    return acc;
  }, {} as Record<string, number>);

  const topCompaniesRaw = await prisma.$queryRaw<{ company_name: string; count: bigint }[]>`
    SELECT rp.company_name, COUNT(a.id) as count
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN recruiter_profiles rp ON j.recruiter_profile_id = rp.id
    JOIN users u ON a.candidate_user_id = u.id
    JOIN student_profiles sp ON u.id = sp.user_id
    WHERE sp.college_profile_id = ${collegeProfileId}
      AND a.status = 'HIRED'
    GROUP BY rp.company_name
    ORDER BY count DESC
    LIMIT 5
  `;

  const topRecruitingCompanies = topCompaniesRaw.map((row) => ({
    companyName: row.company_name,
    hiredCount: Number(row.count)
  }));

  return {
    totalStudents,
    placedStudents: placedStudentsCount,
    unplacedStudents: unplacedStudentsCount,
    applicationsPerStage,
    topRecruitingCompanies
  };
};

export const getCohortDashboardStudents = async (
  collegeProfileId: string,
  filters: CohortDashboardFilters
) => {
  const where: Prisma.StudentProfileWhereInput = {
    collegeProfileId,
    ...(filters.batchYear ? { graduationYear: filters.batchYear } : {})
  };

  if (filters.placementStatus === "PLACED") {
    where.user = { applications: { some: { status: "HIRED" } } };
  } else if (filters.placementStatus === "UNPLACED") {
    where.user = { applications: { none: { status: "HIRED" } } };
  }

  const [total, students] = await prisma.$transaction([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, isApproved: true } }
      },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit
    })
  ]);

  return {
    success: true,
    data: students,
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit))
    }
  };
};
