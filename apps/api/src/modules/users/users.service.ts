import path from "path";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import {
  UserRole,
  type ActivityLog,
  type NotificationPreference,
  type PaginatedResponse,
  type StudentProfile
} from "@campushire/types";
import { isProfileComplete, sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { generateFileKey, getPresignedUrl, uploadFile } from "../../lib/s3";
import { FULL_USER_PROFILE_SELECT, type FullUserProfile } from "../../lib/user-selects";
import {
  calculateAuthoritativeCareerScore,
  writeCareerScoreForUser
} from "../../lib/career-score";
import type { UpdateProfileDto, NotificationPrefDto } from "./users.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

export type FullProfile = FullUserProfile;

const toInputJson = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
};

const ensureUserTenantScope = async (userId: string, tenantId: string | null): Promise<void> => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId
    },
    select: {
      id: true
    }
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }
};

const fetchFullProfile = async (userId: string): Promise<FullProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: FULL_USER_PROFILE_SELECT
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  return user;
};

export const getProfile = async (userId: string, tenantId: string | null): Promise<FullProfile> => {
  await ensureUserTenantScope(userId, tenantId);

  return fetchFullProfile(userId);
};

const ensureTenantMatch = (resourceTenantId: string | null, actorTenantId: string | null): void => {
  if (resourceTenantId && actorTenantId && resourceTenantId !== actorTenantId) {
    throw new ServiceError("Forbidden tenant access.", 403);
  }
};

export const updateProfile = async (
  userId: string,
  role: UserRole,
  tenantId: string | null,
  dto: UpdateProfileDto
): Promise<FullProfile> => {
  await ensureUserTenantScope(userId, tenantId);

  const userUpdateData: Prisma.UserUpdateManyMutationInput = {};

  if (dto.firstName) {
    userUpdateData.firstName = sanitizeInput(dto.firstName);
  }
  if (dto.lastName) {
    userUpdateData.lastName = sanitizeInput(dto.lastName);
  }
  if (dto.phone) {
    userUpdateData.phone = dto.phone.trim();
  }
  if (dto.headline) {
    userUpdateData.headline = sanitizeInput(dto.headline);
  }
  if (dto.bio) {
    userUpdateData.bio = sanitizeInput(dto.bio);
  }
  if (dto.profileVisibility) {
    userUpdateData.profileVisibility = dto.profileVisibility;
  }

  if (Object.keys(userUpdateData).length > 0) {
    await prisma.user.updateMany({
      where: {
        id: userId,
        tenantId
      },
      data: userUpdateData
    });
  }

  if (role === UserRole.STUDENT && dto.studentProfile) {
    const scoreProfile = dto.studentProfile as unknown as Partial<StudentProfile>;

    const studentData: Prisma.StudentProfileUpdateManyMutationInput = {
      enrollmentNumber: dto.studentProfile.enrollmentNumber,
      program: dto.studentProfile.program,
      department: dto.studentProfile.department,
      yearOfStudy: dto.studentProfile.yearOfStudy,
      graduationYear: dto.studentProfile.graduationYear,
      cgpa: dto.studentProfile.cgpa,
      skills: toInputJson(dto.studentProfile.skills),
      resumeUrl: dto.studentProfile.resumeUrl,
      preferredWorkMode: dto.studentProfile.preferredWorkMode,
      preferredLocations: toInputJson(dto.studentProfile.preferredLocations),
      expectedCtcMin: dto.studentProfile.expectedCtcMin,
      expectedCtcMax: dto.studentProfile.expectedCtcMax,
      linkedInUrl: dto.studentProfile.linkedInUrl,
      githubUrl: dto.studentProfile.githubUrl,
      portfolioUrl: dto.studentProfile.portfolioUrl,
      isProfileComplete: isProfileComplete(scoreProfile)
    };

    await prisma.studentProfile.updateMany({
      where: {
        userId,
        tenantId: tenantId ?? undefined
      },
      data: studentData
    });

    await writeCareerScoreForUser(
      prisma,
      userId,
      calculateAuthoritativeCareerScore(scoreProfile)
    );
  }

  if (role === UserRole.JOB_SEEKER && dto.jobSeekerProfile) {
    const scoreProfile = {
      skills: dto.jobSeekerProfile.skills,
      resumeUrl: dto.jobSeekerProfile.resumeUrl,
      expectedCtcMin: dto.jobSeekerProfile.expectedCtcMin,
      expectedCtcMax: dto.jobSeekerProfile.expectedCtcMax
    } as unknown as Partial<StudentProfile>;

    const profileData: Prisma.JobSeekerProfileUpdateInput = {
      totalExperienceMonths: dto.jobSeekerProfile.totalExperienceMonths,
      currentCity: dto.jobSeekerProfile.currentCity,
      preferredLocations: toInputJson(dto.jobSeekerProfile.preferredLocations),
      skills: toInputJson(dto.jobSeekerProfile.skills),
      expectedCtcMin: dto.jobSeekerProfile.expectedCtcMin,
      expectedCtcMax: dto.jobSeekerProfile.expectedCtcMax,
      availableFrom: dto.jobSeekerProfile.availableFrom,
      resumeUrl: dto.jobSeekerProfile.resumeUrl,
      preferredWorkMode: dto.jobSeekerProfile.preferredWorkMode,
      isProfileComplete: Boolean(dto.jobSeekerProfile.skills && dto.jobSeekerProfile.resumeUrl)
    };

    await prisma.jobSeekerProfile.updateMany({
      where: {
        userId
      },
      data: profileData
    });

    await writeCareerScoreForUser(
      prisma,
      userId,
      calculateAuthoritativeCareerScore(scoreProfile)
    );
  }

  if (role === UserRole.CORPORATE_RECRUITER && dto.recruiterProfile) {
    await prisma.recruiterProfile.updateMany({
      where: {
        userId,
        tenantId: tenantId ?? undefined
      },
      data: {
        ...dto.recruiterProfile,
        companyName: dto.recruiterProfile.companyName
          ? sanitizeInput(dto.recruiterProfile.companyName)
          : undefined,
        about: dto.recruiterProfile.about ? sanitizeInput(dto.recruiterProfile.about) : undefined,
        culture: dto.recruiterProfile.culture
          ? sanitizeInput(dto.recruiterProfile.culture)
          : undefined
      }
    });
  }

  if (role === UserRole.FREELANCE_RECRUITER && dto.freelanceRecruiterProfile) {
    await prisma.freelanceRecruiterProfile.updateMany({
      where: {
        userId,
        tenantId: tenantId ?? undefined
      },
      data: {
        ...dto.freelanceRecruiterProfile,
        specialization: toInputJson(dto.freelanceRecruiterProfile.specialization),
        agencyName: dto.freelanceRecruiterProfile.agencyName
          ? sanitizeInput(dto.freelanceRecruiterProfile.agencyName)
          : undefined
      }
    });
  }

  if (role === UserRole.VENDOR && dto.vendorProfile) {
    await prisma.vendorProfile.updateMany({
      where: {
        userId,
        tenantId: tenantId ?? undefined
      },
      data: {
        ...dto.vendorProfile,
        businessName: dto.vendorProfile.businessName
          ? sanitizeInput(dto.vendorProfile.businessName)
          : undefined,
        about: dto.vendorProfile.about ? sanitizeInput(dto.vendorProfile.about) : undefined
      }
    });
  }

  if (role === UserRole.TRAINING_PARTNER && dto.trainingPartnerProfile) {
    await prisma.trainingPartnerProfile.updateMany({
      where: {
        userId,
        tenantId: tenantId ?? undefined
      },
      data: {
        ...dto.trainingPartnerProfile,
        organizationName: dto.trainingPartnerProfile.organizationName
          ? sanitizeInput(dto.trainingPartnerProfile.organizationName)
          : undefined,
        about: dto.trainingPartnerProfile.about
          ? sanitizeInput(dto.trainingPartnerProfile.about)
          : undefined
      }
    });
  }

  if (role === UserRole.COLLEGE_ADMIN && dto.collegeProfile) {
    await prisma.collegeProfile.updateMany({
      where: {
        adminUserId: userId,
        tenantId: tenantId ?? undefined
      },
      data: {
        ...dto.collegeProfile,
        streams: toInputJson(dto.collegeProfile.streams),
        name: dto.collegeProfile.name ? sanitizeInput(dto.collegeProfile.name) : undefined,
        about: dto.collegeProfile.about ? sanitizeInput(dto.collegeProfile.about) : undefined,
        address: dto.collegeProfile.address ? sanitizeInput(dto.collegeProfile.address) : undefined
      }
    });
  }

  return fetchFullProfile(userId);
};

export const uploadAvatar = async (
  userId: string,
  tenantId: string | null,
  file: Express.Multer.File
): Promise<string> => {
  await ensureUserTenantScope(userId, tenantId);

  if (!file.mimetype.startsWith("image/")) {
    throw new ServiceError("Only image files are allowed.", 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new ServiceError("Avatar exceeds max size of 5MB.", 400);
  }

  const extension = path.extname(file.originalname) || ".png";
  const key = generateFileKey(`avatars/${userId}`, `${nanoid(8)}${extension}`);

  await uploadFile(key, file.buffer, file.mimetype);
  const presignedUrl = await getPresignedUrl(key, 7 * 24 * 60 * 60);

  await prisma.user.updateMany({
    where: {
      id: userId,
      tenantId
    },
    data: {
      avatarUrl: presignedUrl
    }
  });

  return presignedUrl;
};

export const updateNotificationPreferences = async (
  userId: string,
  tenantId: string | null,
  dto: NotificationPrefDto
): Promise<NotificationPreference[]> => {
  await ensureUserTenantScope(userId, tenantId);

  const writes = dto.preferences.map((preference) =>
    prisma.notificationPreference.upsert({
      where: {
        userId_type_channel: {
          userId,
          type: preference.type,
          channel: preference.channel
        }
      },
      update: {
        isEnabled: preference.isEnabled,
        tenantId
      },
      create: {
        userId,
        tenantId,
        type: preference.type,
        channel: preference.channel,
        isEnabled: preference.isEnabled
      }
    })
  );

  await prisma.$transaction(writes);

  return prisma.notificationPreference.findMany({
    where: {
      userId,
      tenantId
    },
    orderBy: [{ type: "asc" }, { channel: "asc" }]
  });
};

export const getActivityLog = async (
  userId: string,
  tenantId: string | null,
  page: number,
  limit: number
): Promise<PaginatedResponse<ActivityLog[]>> => {
  await ensureUserTenantScope(userId, tenantId);

  const where: Prisma.ActivityLogWhereInput = {
    userId,
    tenantId
  };

  const [total, logs] = await prisma.$transaction([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    success: true,
    data: logs,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages
    }
  };
};
