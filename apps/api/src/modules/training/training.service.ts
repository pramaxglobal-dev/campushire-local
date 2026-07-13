import { nanoid } from "nanoid";
import { Prisma, EnrollmentSource } from "@prisma/client";
import {
  EnrollmentStatus,
  NotificationChannel,
  NotificationType,
  PaymentStatus,
  UserRole,
  type Course,
  type CourseEnrollment,
  type PaginatedResponse,
  type TrainingPartnerProfile
} from "@campushire/types";
import { generateSlug, sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import { sendNotification } from "../../lib/notification";
import { resolveUserTenantContext as getUserWithTenant } from "../../lib/tenant";
import type { CourseFilters, CreateCourseDto, UpdateCourseDto } from "./training.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

type CourseWithPartner = Course & {
  trainingPartner: TrainingPartnerProfile;
  enrollmentCount: number;
};

interface TrainingStats {
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  completionRate: number;
}

const toInputJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const getPartnerProfile = async (partnerId: string, tenantId: string) => {
  const profile = await prisma.trainingPartnerProfile.findFirst({
    where: {
      userId: partnerId,
      tenantId
    },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      platformFeePct: true
    }
  });
  if (!profile) {
    throw new ServiceError("Training partner profile not found.", 404);
  }
  return profile;
};

const normalizeSkillsFilter = (value: CourseFilters["skillsCovered"]): string[] => {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
};

const parseSkills = (value: Prisma.JsonValue | null): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).filter(
      (item): item is string => typeof item === "string"
    );
  }
  return [];
};

export const listCourses = async (
  filters: CourseFilters,
  page: number,
  limit: number,
  viewerUserId?: string
): Promise<PaginatedResponse<Course[]>> => {
  const viewer = viewerUserId
    ? await prisma.user.findUnique({
        where: { id: viewerUserId },
        select: {
          id: true,
          role: true,
          tenantId: true
        }
      })
    : null;

  const viewerTenantId = viewer?.tenantId ?? null;
  const where: Prisma.CourseWhereInput = {
    tenantId: viewerTenantId ?? { not: "" },
    level: filters.level,
    mode: filters.mode,
    trainingPartnerProfileId: filters.trainingPartnerId,
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(viewer?.role === UserRole.TRAINING_PARTNER ? {} : { isActive: true })
  };

  const [total, rows] = await prisma.$transaction([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const skillsFilter = normalizeSkillsFilter(filters.skillsCovered).map((item) =>
    item.toLowerCase()
  );
  const filteredRows = rows.filter((course) => {
    if (skillsFilter.length === 0) {
      return true;
    }
    const skills = parseSkills(course.skillsCovered).map((item) => item.toLowerCase());
    return skillsFilter.some((item) => skills.includes(item));
  });

  return {
    success: true,
    data: filteredRows,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const getCourse = async (
  courseId: string,
  viewerUserId?: string
): Promise<CourseWithPartner> => {
  const viewer = viewerUserId
    ? await prisma.user.findUnique({
        where: { id: viewerUserId },
        select: { id: true, role: true, tenantId: true }
      })
    : null;

  const viewerTenantId = viewer?.tenantId ?? null;
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      tenantId: viewerTenantId ?? { not: "" },
      ...(viewer?.role === UserRole.TRAINING_PARTNER ? {} : { isActive: true })
    },
    include: {
      trainingPartnerProfile: true,
      enrollments: {
        select: { id: true }
      }
    }
  });

  if (!course) {
    throw new ServiceError("Course not found.", 404);
  }

  return {
    ...course,
    trainingPartner: course.trainingPartnerProfile,
    enrollmentCount: course.enrollments.length
  };
};

export const createCourse = async (partnerId: string, dto: CreateCourseDto): Promise<Course> => {
  const actor = await getUserWithTenant(partnerId);
  const partner = await getPartnerProfile(actor.id, actor.tenantId);
  const baseSlug = generateSlug(dto.title) || "course";
  const slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;

  const course = await prisma.course.create({
    data: {
      tenantId: actor.tenantId,
      trainingPartnerProfileId: partner.id,
      createdByUserId: actor.id,
      title: sanitizeInput(dto.title),
      slug,
      description: sanitizeInput(dto.description),
      skillsCovered: toInputJson(dto.skillsCovered),
      durationHours: dto.durationHours ?? null,
      price: dto.price,
      currency: dto.currency,
      seats: dto.seats ?? null,
      level: dto.level,
      mode: dto.mode,
      isActive: false
    }
  });

  await logActivity({
    actorUserId: partnerId,
    tenantId: actor.tenantId,
    action: "training.course_created",
    entityType: "Course",
    entityId: course.id
  });

  return course;
};

export const updateCourse = async (
  courseId: string,
  partnerId: string,
  dto: UpdateCourseDto
): Promise<Course> => {
  const actor = await getUserWithTenant(partnerId);
  const partner = await getPartnerProfile(actor.id, actor.tenantId);
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      tenantId: actor.tenantId,
      trainingPartnerProfileId: partner.id
    }
  });

  if (!course) {
    throw new ServiceError("Course not found.", 404);
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: {
      title: dto.title ? sanitizeInput(dto.title) : undefined,
      description: dto.description ? sanitizeInput(dto.description) : undefined,
      skillsCovered: dto.skillsCovered ? toInputJson(dto.skillsCovered) : undefined,
      durationHours: dto.durationHours,
      price: dto.price,
      currency: dto.currency,
      seats: dto.seats,
      level: dto.level,
      mode: dto.mode
    }
  });

  await logActivity({
    actorUserId: partnerId,
    tenantId: actor.tenantId,
    action: "training.course_updated",
    entityType: "Course",
    entityId: updated.id
  });

  return updated;
};

export const publishCourse = async (courseId: string, partnerId: string): Promise<Course> => {
  const actor = await getUserWithTenant(partnerId);
  const partner = await getPartnerProfile(actor.id, actor.tenantId);

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      tenantId: actor.tenantId,
      trainingPartnerProfileId: partner.id
    }
  });
  if (!course) {
    throw new ServiceError("Course not found.", 404);
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: {
      isActive: true
    }
  });

  await logActivity({
    actorUserId: partnerId,
    tenantId: actor.tenantId,
    action: "training.course_published",
    entityType: "Course",
    entityId: updated.id
  });

  return updated;
};

export const unpublishCourse = async (courseId: string, partnerId: string): Promise<Course> => {
  const actor = await getUserWithTenant(partnerId);
  const partner = await getPartnerProfile(actor.id, actor.tenantId);

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      tenantId: actor.tenantId,
      trainingPartnerProfileId: partner.id
    }
  });
  if (!course) {
    throw new ServiceError("Course not found.", 404);
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: {
      isActive: false
    }
  });

  await logActivity({
    actorUserId: partnerId,
    tenantId: actor.tenantId,
    action: "training.course_unpublished",
    entityType: "Course",
    entityId: updated.id
  });

  return updated;
};

export const enrollInCourse = async (userId: string, courseId: string): Promise<CourseEnrollment> => {
  const actor = await getUserWithTenant(userId);
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      tenantId: actor.tenantId,
      isActive: true
    },
    include: {
      trainingPartnerProfile: {
        select: {
          id: true,
          userId: true,
          platformFeePct: true
        }
      }
    }
  });

  if (!course) {
    throw new ServiceError("Course not found.", 404);
  }

  const existing = await prisma.courseEnrollment.findUnique({
    where: {
      courseId_userId: {
        courseId: course.id,
        userId
      }
    },
    select: { id: true }
  });

  if (existing) {
    throw new ServiceError("Already enrolled in this course.", 409);
  }

  const enrollment = await prisma.$transaction(async (tx) => {
    const createdEnrollment = await tx.courseEnrollment.create({
      data: {
        courseId: course.id,
        userId,
        status: EnrollmentStatus.ENROLLED,
        progressPct: 0
      }
    });

    const grossAmount = course.price;
    const platformPct = course.trainingPartnerProfile.platformFeePct;
    const platformCommissionAmount = Math.round((grossAmount * platformPct) / 100);
    const partnerNetAmount = Math.max(0, grossAmount - platformCommissionAmount);

    await tx.courseRevenue.create({
      data: {
        courseId: course.id,
        enrollmentId: createdEnrollment.id,
        trainingPartnerProfileId: course.trainingPartnerProfile.id,
        grossAmount,
        platformCommissionPct: platformPct,
        platformCommissionAmount,
        partnerNetAmount,
        paymentStatus: grossAmount === 0 ? PaymentStatus.PAID : PaymentStatus.PENDING,
        settledAt: grossAmount === 0 ? new Date() : null
      }
    });

    return createdEnrollment;
  });

  await sendNotification({
    userId: course.trainingPartnerProfile.userId,
    type: NotificationType.SYSTEM,
    title: "New Course Enrollment",
    body: `A learner has enrolled in ${course.title}.`,
    contextType: "SYSTEM",
    contextId: course.id,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });

  await logActivity({
    actorUserId: userId,
    tenantId: actor.tenantId,
    action: "training.course_enrolled",
    entityType: "CourseEnrollment",
    entityId: enrollment.id,
    metadata: {
      courseId: course.id
    }
  });

  return enrollment;
};

export const updateEnrollmentProgress = async (
  enrollmentId: string,
  userId: string,
  progressPct: number
): Promise<CourseEnrollment> => {
  const actor = await getUserWithTenant(userId);
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      id: enrollmentId,
      userId,
      course: {
        tenantId: actor.tenantId
      }
    }
  });

  if (!enrollment) {
    throw new ServiceError("Enrollment not found.", 404);
  }

  const completed = progressPct >= 100;
  const status =
    progressPct <= 0
      ? EnrollmentStatus.ENROLLED
      : completed
        ? EnrollmentStatus.COMPLETED
        : EnrollmentStatus.IN_PROGRESS;

  const updated = await prisma.courseEnrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPct,
      status,
      completedAt: completed ? new Date() : null
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: actor.tenantId,
    action: "training.enrollment_progress_updated",
    entityType: "CourseEnrollment",
    entityId: updated.id,
    metadata: {
      progressPct
    }
  });

  return updated;
};

export const getMyEnrollments = async (userId: string): Promise<CourseEnrollment[]> => {
  const actor = await getUserWithTenant(userId);
  return prisma.courseEnrollment.findMany({
    where: {
      userId,
      course: {
        tenantId: actor.tenantId
      }
    },
    include: {
      course: {
        include: {
          trainingPartnerProfile: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
};

export const getPartnerCourses = async (partnerId: string): Promise<Course[]> => {
  const actor = await getUserWithTenant(partnerId);
  const partner = await getPartnerProfile(actor.id, actor.tenantId);
  return prisma.course.findMany({
    where: {
      tenantId: actor.tenantId,
      trainingPartnerProfileId: partner.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });
};

export const getPartnerEnrollments = async (partnerId: string, courseId?: string) => {
  const actor = await getUserWithTenant(partnerId);
  const partner = await getPartnerProfile(actor.id, actor.tenantId);
  return prisma.courseEnrollment.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      course: {
        tenantId: actor.tenantId,
        trainingPartnerProfileId: partner.id
      }
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
      },
      course: { select: { id: true, title: true } }
    },
    orderBy: { enrolledAt: "desc" }
  });
};

export const getPartnerStats = async (partnerId: string): Promise<TrainingStats> => {
  const actor = await getUserWithTenant(partnerId);
  const partner = await getPartnerProfile(actor.id, actor.tenantId);

  const courses = await prisma.course.findMany({
    where: {
      tenantId: actor.tenantId,
      trainingPartnerProfileId: partner.id
    },
    select: { id: true }
  });
  const courseIds = courses.map((course) => course.id);

  if (courseIds.length === 0) {
    return {
      totalCourses: 0,
      totalEnrollments: 0,
      totalRevenue: 0,
      completionRate: 0
    };
  }

  const [totalEnrollments, completedEnrollments, revenues] = await prisma.$transaction([
    prisma.courseEnrollment.count({
      where: {
        courseId: { in: courseIds }
      }
    }),
    prisma.courseEnrollment.count({
      where: {
        courseId: { in: courseIds },
        status: EnrollmentStatus.COMPLETED
      }
    }),
    prisma.courseRevenue.findMany({
      where: {
        trainingPartnerProfileId: partner.id,
        course: {
          tenantId: actor.tenantId
        }
      },
      select: {
        partnerNetAmount: true
      }
    })
  ]);

  const totalRevenue = revenues.reduce((sum, row) => sum + row.partnerNetAmount, 0);
  const completionRate =
    totalEnrollments === 0 ? 0 : Number(((completedEnrollments / totalEnrollments) * 100).toFixed(2));

  return {
    totalCourses: courses.length,
    totalEnrollments,
    totalRevenue,
    completionRate
  };
};

export const assignStudentsToCourse = async (
  userIds: string[],
  courseId: string,
  adminUserId: string
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Get college profile
    const college = await tx.collegeProfile.findUnique({
      where: { adminUserId }
    });
    if (!college) throw new ServiceError("College profile not found", 403);

    // 2. Get valid users
    const students = await tx.studentProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, collegeProfileId: true }
    });

    const validUserIds = students
      .filter((s) => s.collegeProfileId === college.id)
      .map((s) => s.userId);

    const failedIds = userIds.filter((id) => !validUserIds.includes(id));

    if (validUserIds.length === 0) {
      return { enrolledCount: 0, failedIds };
    }

    // 3. Check existing enrollments
    const existing = await tx.courseEnrollment.findMany({
      where: { courseId, userId: { in: validUserIds } },
      select: { userId: true }
    });
    const existingIds = existing.map(e => e.userId);
    
    const toEnroll = validUserIds.filter(id => !existingIds.includes(id));

    if (toEnroll.length === 0) {
      return { enrolledCount: 0, failedIds: [...failedIds, ...existingIds] };
    }

    // 4. Enroll
    const result = await tx.courseEnrollment.createMany({
      data: toEnroll.map(id => ({
        courseId,
        userId: id,
        source: EnrollmentSource.ADMIN_ASSIGNED,
        assignedByUserId: adminUserId,
      })),
      skipDuplicates: true
    });

    // 5. Trigger notifications
    for (const uid of toEnroll) {
      await sendNotification({
        userId: uid,
        type: NotificationType.SYSTEM,
        channel: NotificationChannel.IN_APP,
        title: "Assigned to a New Course",
        body: "Your college has assigned you a new training course to complete.",
      });
    }

    return { enrolledCount: result.count, failedIds };
  });
};

export const getCourseCompletionStats = async (actor: any, courseId: string) => {
  let collegeProfileId: string | undefined;

  if (actor.role === UserRole.COLLEGE_ADMIN) {
    const college = await prisma.collegeProfile.findUnique({
      where: { adminUserId: actor.userId }
    });
    if (!college) throw new ServiceError("College profile not found", 403);
    collegeProfileId = college.id;
  } else if (actor.role === UserRole.TRAINING_PARTNER) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { trainingPartnerProfile: true }
    });
    if (course?.trainingPartnerProfile.userId !== actor.userId) {
      throw new ServiceError("Unauthorized", 403);
    }
  } else {
    throw new ServiceError("Unauthorized role", 403);
  }

  const whereClause: Prisma.CourseEnrollmentWhereInput = {
    courseId,
    ...(collegeProfileId ? { user: { studentProfile: { collegeProfileId } } } : {})
  };

  const enrollments = await prisma.courseEnrollment.findMany({
    where: whereClause,
    select: {
      status: true,
      progressPct: true
    }
  });

  const total = enrollments.length;
  const completed = enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length;
  const inProgress = enrollments.filter(e => e.status === EnrollmentStatus.IN_PROGRESS).length;
  const enrolled = enrollments.filter(e => e.status === EnrollmentStatus.ENROLLED).length;

  return {
    totalEnrollments: total,
    completed,
    inProgress,
    notStarted: enrolled,
    completionRate: total > 0 ? Number(((completed / total) * 100).toFixed(2)) : 0
  };
};
