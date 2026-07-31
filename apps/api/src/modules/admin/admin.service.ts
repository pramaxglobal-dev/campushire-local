import crypto from "crypto";
import { subDays } from "date-fns";
import { Prisma } from "@prisma/client";
import {
  NotificationChannel,
  NotificationType,
  Plan,
  SubRole,
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
import { hashPassword } from "../../lib/bcrypt";
import { sendNotification } from "../../lib/notification";
import { APPROVAL_REQUIRED_ROLES } from "../../lib/user-guards";
import { FULL_USER_INCLUDE, SAFE_USER_SELECT, type FullUserWithRelations } from "../../lib/user-selects";
import type { SafeUser } from "../auth/auth.service";
import type { BroadcastDto, UserFilters, CohortDashboardFilters, AddTeamMemberDto } from "./admin.schema";

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

export const approveUser = async (
  userId: string,
  adminId: string,
  adminRole?: UserRole,
  adminSubRole?: SubRole | null,
  adminTenantId?: string | null
): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...SAFE_USER_SELECT,
      studentProfile: { select: { collegeProfileId: true } }
    }
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  if (adminRole === UserRole.COLLEGE_ADMIN) {
    if (adminSubRole === SubRole.MEMBER) {
      throw new ServiceError("Forbidden: Coordinators cannot approve student accounts.", 403);
    }
    if (user.role !== UserRole.STUDENT) {
      throw new ServiceError("College Admins can only approve student accounts.", 403);
    }
    const college = await prisma.collegeProfile.findFirst({
      where: {
        OR: [
          { adminUserId: adminId },
          ...(adminTenantId ? [{ tenantId: adminTenantId }] : [])
        ]
      },
      select: { id: true }
    });
    if (!college || user.studentProfile?.collegeProfileId !== college.id) {
      throw new ServiceError("Forbidden: You can only approve students from your own college.", 403);
    }
  }

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
  reason: string,
  adminRole?: UserRole,
  adminSubRole?: SubRole | null,
  adminTenantId?: string | null
): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...SAFE_USER_SELECT,
      studentProfile: { select: { collegeProfileId: true } }
    }
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  if (adminRole === UserRole.COLLEGE_ADMIN) {
    if (adminSubRole === SubRole.MEMBER) {
      throw new ServiceError("Forbidden: Coordinators cannot reject student accounts.", 403);
    }
    if (user.role !== UserRole.STUDENT) {
      throw new ServiceError("College Admins can only reject student accounts.", 403);
    }
    const college = await prisma.collegeProfile.findFirst({
      where: {
        OR: [
          { adminUserId: adminId },
          ...(adminTenantId ? [{ tenantId: adminTenantId }] : [])
        ]
      },
      select: { id: true }
    });
    if (!college || user.studentProfile?.collegeProfileId !== college.id) {
      throw new ServiceError("Forbidden: You can only reject students from your own college.", 403);
    }
  }

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
  const college = await prisma.collegeProfile.findUnique({
    where: { id: collegeProfileId },
    select: { tenantId: true }
  });

  const studentWhere: Prisma.StudentProfileWhereInput = {
    OR: [
      { collegeProfileId },
      ...(college?.tenantId ? [{ tenantId: college.tenantId }] : [])
    ],
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
    where: {
      candidate: {
        studentProfile: {
          OR: [
            { collegeProfileId },
            ...(college?.tenantId ? [{ tenantId: college.tenantId }] : [])
          ]
        }
      }
    },
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
    WHERE (sp.college_profile_id = ${collegeProfileId} OR sp.tenant_id = ${college?.tenantId || collegeProfileId})
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
  const college = await prisma.collegeProfile.findUnique({
    where: { id: collegeProfileId },
    select: { tenantId: true }
  });

  const where: Prisma.StudentProfileWhereInput = {
    OR: [
      { collegeProfileId },
      ...(college?.tenantId ? [{ tenantId: college.tenantId }] : [])
    ],
    ...(filters.batchYear ? { graduationYear: filters.batchYear } : {})
  };

  if (filters.placementStatus === "PLACED") {
    where.user = { applications: { some: { status: "HIRED" } } };
  } else if (filters.placementStatus === "UNPLACED") {
    where.user = { applications: { none: { status: "HIRED" } } };
  }

  const [total, studentsRaw] = await prisma.$transaction([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            isApproved: true,
            applications: {
              select: {
                id: true
              }
            }
          }
        }
      },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit
    })
  ]);

  const candidateUserIds = studentsRaw.map((s) => s.userId);
  const upcomingInterviews = await prisma.interviewSlot.findMany({
    where: {
      candidateUserId: { in: candidateUserIds },
      status: { in: ["SCHEDULED", "CONFIRMED", "RESCHEDULED"] }
    },
    select: {
      candidateUserId: true,
      scheduledStartAt: true
    },
    orderBy: { scheduledStartAt: "asc" }
  });

  const nextInterviewMap = new Map<string, Date>();
  for (const inv of upcomingInterviews) {
    if (!nextInterviewMap.has(inv.candidateUserId)) {
      nextInterviewMap.set(inv.candidateUserId, inv.scheduledStartAt);
    }
  }

  const students = studentsRaw.map((s) => ({
    ...s,
    applicationsCount: s.user.applications.length,
    upcomingInterviewDate: nextInterviewMap.get(s.userId) ?? null
  }));

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

export const getStudentDetailsForCollegeAdmin = async (
  collegeTenantId: string,
  collegeProfileId: string,
  studentUserId: string
) => {
  const studentProfile = await prisma.studentProfile.findFirst({
    where: {
      userId: studentUserId,
      OR: [
        { tenantId: collegeTenantId },
        { collegeProfileId }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isApproved: true,
          isActive: true
        }
      }
    }
  });

  if (!studentProfile) {
    throw new ServiceError("Student profile not found or does not belong to your college.", 404);
  }

  const applications = await prisma.application.findMany({
    where: { candidateUserId: studentUserId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          recruiterProfile: {
            select: {
              companyName: true
            }
          }
        }
      }
    },
    orderBy: { appliedAt: "desc" }
  });

  const interviews = await prisma.interviewSlot.findMany({
    where: {
      candidateUserId: studentUserId
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          recruiterProfile: {
            select: {
              companyName: true
            }
          }
        }
      }
    },
    orderBy: { scheduledStartAt: "asc" }
  });

  return {
    student: {
      id: studentProfile.id,
      userId: studentProfile.userId,
      firstName: studentProfile.user.firstName,
      lastName: studentProfile.user.lastName,
      email: studentProfile.user.email,
      phone: studentProfile.user.phone,
      isApproved: studentProfile.user.isApproved,
      program: studentProfile.program,
      department: studentProfile.department,
      graduationYear: studentProfile.graduationYear,
      cgpa: studentProfile.cgpa,
      skills: studentProfile.skills,
      resumeUrl: studentProfile.resumeUrl
    },
    applications: applications.map((app) => ({
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.job.title,
      companyName: app.job.recruiterProfile?.companyName || "N/A",
      appliedAt: app.appliedAt,
      status: app.status
    })),
    interviews: interviews.map((inv) => ({
      id: inv.id,
      jobTitle: inv.job.title,
      companyName: inv.job.recruiterProfile?.companyName || "N/A",
      scheduledStartAt: inv.scheduledStartAt,
      scheduledEndAt: inv.scheduledEndAt,
      round: inv.round,
      mode: inv.mode,
      status: inv.status
    }))
  };
};

export interface CollegeTeamMemberItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  subRole: SubRole | null;
  isActive: boolean;
  isApproved: boolean;
  createdAt: Date | string;
  lastLoginAt: Date | string | null;
  temporaryPassword?: string;
}

const generateTemporaryPassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pass = "CH#";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
};

export const listCollegeTeam = async (
  tenantId: string
): Promise<CollegeTeamMemberItem[]> => {
  const members = await prisma.user.findMany({
    where: {
      tenantId,
      role: UserRole.COLLEGE_ADMIN
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      subRole: true,
      isActive: true,
      isApproved: true,
      createdAt: true,
      lastLoginAt: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return members;
};

export const addCollegeTeamMember = async (
  actorUserId: string,
  actorTenantId: string,
  actorSubRole: SubRole | null,
  dto: AddTeamMemberDto
): Promise<CollegeTeamMemberItem> => {
  if (actorSubRole && actorSubRole !== SubRole.OWNER) {
    throw new ServiceError("Forbidden: Only College Admins (Owners) can add team members.", 403);
  }

  const existing = await prisma.user.findUnique({
    where: { email: dto.email }
  });

  if (existing) {
    throw new ServiceError("A user with this email address already exists.", 400);
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const tin = `tin_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const newMember = await prisma.user.create({
    data: {
      tenantId: actorTenantId,
      tin,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      role: UserRole.COLLEGE_ADMIN,
      subRole: dto.subRole as SubRole,
      isApproved: true,
      isActive: true,
      isEmailVerified: true,
      metadata: {
        mustChangePassword: true,
        temporaryPasswordCreatedAt: new Date().toISOString()
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      subRole: true,
      isActive: true,
      isApproved: true,
      createdAt: true
    }
  });

  await logActivity({
    actorUserId,
    tenantId: actorTenantId,
    action: "team_member.added",
    entityType: "User",
    entityId: newMember.id,
    metadata: {
      subRole: newMember.subRole
    }
  });

  await sendNotification({
    userId: newMember.id,
    type: NotificationType.SYSTEM,
    title: "Staff Account Created",
    body: `Welcome to CampusHire! Your staff account for ${dto.firstName} ${dto.lastName} has been created. Your temporary login password is: ${temporaryPassword}. Please log in and change your password.`,
    actionUrl: "/login",
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
  });

  return {
    ...newMember,
    temporaryPassword
  };
};

export const removeCollegeTeamMember = async (
  actorUserId: string,
  actorTenantId: string,
  actorSubRole: SubRole | null,
  targetUserId: string
): Promise<{ success: boolean }> => {
  if (actorSubRole && actorSubRole !== SubRole.OWNER) {
    throw new ServiceError("Forbidden: Only College Admins (Owners) can remove team members.", 403);
  }

  if (actorUserId === targetUserId) {
    throw new ServiceError("You cannot remove yourself from the college team.", 400);
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!target || target.tenantId !== actorTenantId) {
    throw new ServiceError("Team member not found or does not belong to your college.", 404);
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: false }
  });

  await logActivity({
    actorUserId,
    tenantId: actorTenantId,
    action: "team_member.removed",
    entityType: "User",
    entityId: targetUserId
  });

  return { success: true };
};

export const deleteTeamMemberPermanently = async (
  actorUserId: string,
  actorTenantId: string,
  actorSubRole: SubRole | null,
  targetUserId: string
): Promise<{ success: boolean; blockedReason?: string }> => {
  if (actorSubRole && actorSubRole !== SubRole.OWNER) {
    throw new ServiceError("Forbidden: Only College Admins (Owners) can permanently delete team members.", 403);
  }

  if (actorUserId === targetUserId) {
    throw new ServiceError("You cannot delete your own account.", 400);
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!target || target.tenantId !== actorTenantId) {
    throw new ServiceError("Team member not found or does not belong to your college.", 404);
  }

  // Safety check: has this user created any invite codes?
  const invitesCreated = await prisma.invite.count({
    where: { createdByUserId: targetUserId }
  });

  if (invitesCreated > 0) {
    throw new ServiceError(
      `This staff member has created ${invitesCreated} invite code(s). Deleting them would leave those codes without a creator record. Please deactivate their account instead.`,
      400
    );
  }

  // Safety check: has this user approved any students (activity logs)?
  const approvalActions = await prisma.activityLog.count({
    where: {
      userId: targetUserId,
      action: { in: ["user.approved", "student.approved"] }
    }
  });

  if (approvalActions > 0) {
    throw new ServiceError(
      `This staff member has approved ${approvalActions} student(s). Their account history must be preserved. Please deactivate their account instead.`,
      400
    );
  }

  // Safe to delete — no linked records
  await prisma.user.delete({
    where: { id: targetUserId }
  });

  await logActivity({
    actorUserId,
    tenantId: actorTenantId,
    action: "team_member.deleted",
    entityType: "User",
    entityId: targetUserId
  });

  return { success: true };
};
