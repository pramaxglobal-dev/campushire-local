import { Prisma } from "@prisma/client";
import {
  ApplicationStatus,
  JobStatus,
  NotificationChannel,
  NotificationType,
  UserRole,
  type Application,
  type PaginatedResponse
} from "@campushire/types";
import { sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import { writeApplicationStatusHistory } from "../../lib/application-history";
import { notifyApplicationReceived, sendNotification } from "../../lib/notification";
import type { AppFilters, ApplyDto } from "./applications.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

export type ApplicationCard = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: Date;
  location: string | null;
};

type ScreeningAnswersMap = Record<string, string>;

const parseJobTargetCollegeIds = (value: Prisma.JsonValue | null): string[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const raw = (value as Record<string, unknown>).targetCollegeIds;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
};

const asInputJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const getCandidate = async (candidateUserId: string) => {
  const candidate = await prisma.user.findUnique({
    where: { id: candidateUserId },
    include: {
      studentProfile: true
    }
  });
  if (!candidate) {
    throw new ServiceError("Candidate not found.", 404);
  }
  if (candidate.role !== UserRole.STUDENT && candidate.role !== UserRole.JOB_SEEKER) {
    throw new ServiceError("Only students and job seekers can apply.", 403);
  }
  return candidate;
};

export const applyToJob = async (
  candidateUserId: string,
  jobId: string,
  dto: ApplyDto
): Promise<Application> => {
  const candidate = await getCandidate(candidateUserId);

  const job = await prisma.job.findUnique({
    where: {
      id: jobId
    }
  });

  if (!job) {
    throw new ServiceError("Job not found.", 404);
  }
  if (job.status !== JobStatus.ACTIVE) {
    throw new ServiceError("Job is not open for applications.", 400);
  }
  if (job.applicationDeadline && job.applicationDeadline.getTime() < Date.now()) {
    throw new ServiceError("Application deadline has passed.", 400);
  }

  const existing = await prisma.application.findFirst({
    where: {
      jobId: job.id,
      candidateUserId
    }
  });

  if (existing) {
    throw new ServiceError("Already applied to this job.", 409);
  }

  const existingScore = await prisma.aIMatchScore.findFirst({
    where: {
      tenantId: job.tenantId,
      candidateUserId,
      jobId: job.id
    },
    select: {
      id: true,
      score: true
    }
  });

  if (candidate.role === UserRole.STUDENT) {
    const targetCollegeIds = parseJobTargetCollegeIds(job.skillsRequired);
    if (targetCollegeIds.length > 0) {
      const collegeId = candidate.studentProfile?.collegeProfileId ?? null;
      if (!collegeId || !targetCollegeIds.includes(collegeId)) {
        throw new ServiceError("This job is not targeted to your college.", 403);
      }
    }
  }

  const application = await prisma.application.create({
    data: {
      tenantId: job.tenantId,
      jobId: job.id,
      candidateUserId,
      status: ApplicationStatus.APPLIED,
      source: "job_feed",
      coverLetter: dto.coverNote ? sanitizeInput(dto.coverNote) : null,
      screeningAnswers: asInputJson(dto.answers ?? {})
    }
  });

  if (existingScore) {
    await prisma.aIMatchScore.update({
      where: {
        id: existingScore.id
      },
      data: {
        applicationId: application.id
      }
    });
  }

  await writeApplicationStatusHistory(prisma, {
    applicationId: application.id,
    fromStatus: null,
    toStatus: ApplicationStatus.APPLIED,
    changedByUserId: candidateUserId
  });

  await prisma.job.update({
    where: { id: job.id },
    data: {
      applyCount: {
        increment: 1
      }
    }
  });

  await notifyApplicationReceived(application, job, candidate);
  await sendNotification({
    userId: candidateUserId,
    type: NotificationType.APPLICATION_STATUS,
    title: "Application Submitted",
    body: `Your application for ${job.title} has been submitted successfully.`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
    contextType: "APPLICATION",
    contextId: application.id
  });

  await logActivity({
    actorUserId: candidateUserId,
    tenantId: job.tenantId,
    action: "application.created",
    entityType: "Application",
    entityId: application.id
  });

  return application;
};

export const withdrawApplication = async (
  applicationId: string,
  candidateUserId: string
): Promise<Application> => {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      candidateUserId
    },
    include: {
      job: true
    }
  });
  if (!application) {
    throw new ServiceError("Application not found.", 404);
  }
  if (
    application.status !== ApplicationStatus.APPLIED &&
    application.status !== ApplicationStatus.SCREENING
  ) {
    throw new ServiceError("Application cannot be withdrawn at this stage.", 400);
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      status: ApplicationStatus.WITHDRAWN,
      withdrawnAt: new Date()
    }
  });

  await writeApplicationStatusHistory(prisma, {
    applicationId: updated.id,
    fromStatus: application.status,
    toStatus: ApplicationStatus.WITHDRAWN,
    changedByUserId: candidateUserId
  });

  await sendNotification({
    userId: application.job.createdByUserId,
    type: NotificationType.APPLICATION_STATUS,
    title: "Candidate Withdrew Application",
    body: `An application was withdrawn for ${application.job.title}.`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    contextType: "APPLICATION",
    contextId: application.id
  });

  await logActivity({
    actorUserId: candidateUserId,
    tenantId: application.tenantId,
    action: "application.withdrawn",
    entityType: "Application",
    entityId: updated.id
  });

  return updated;
};

export const getMyApplications = async (
  userId: string,
  filters: AppFilters,
  page: number,
  limit: number
): Promise<PaginatedResponse<ApplicationCard[]>> => {
  const where: Prisma.ApplicationWhereInput = {
    candidateUserId: userId,
    status: filters.status
  };

  const [total, rows] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: {
        job: {
          include: {
            recruiterProfile: true
          }
        }
      },
      orderBy: {
        appliedAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const data: ApplicationCard[] = rows.map((row) => ({
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.job.title,
    company: row.job.recruiterProfile.companyName,
    status: row.status,
    appliedAt: row.appliedAt,
    location: row.job.location
  }));

  return {
    success: true,
    data,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const getApplicationDetail = async (applicationId: string, userId: string) => {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantId: true }
  });
  if (!actor) {
    throw new ServiceError("Unauthorized", 401);
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        include: {
          recruiterProfile: true
        }
      },
      candidate: true,
      statusHistory: {
        orderBy: {
          createdAt: "asc"
        }
      },
      interviewSlots: {
        orderBy: {
          scheduledStartAt: "asc"
        }
      }
    }
  });

  if (!application) {
    throw new ServiceError("Application not found.", 404);
  }

  const isCandidate = application.candidateUserId === userId;
  const isRecruiter = application.job.createdByUserId === userId;
  const isAdmin = actor.role === UserRole.SUPER_ADMIN;

  if (!isCandidate && !isRecruiter && !isAdmin) {
    throw new ServiceError("Forbidden", 403);
  }

  return application;
};

const mergeNoteIntoAnswers = (
  current: Prisma.JsonValue | null,
  key: "candidateNote" | "recruiterNote",
  note: string
): Prisma.InputJsonValue => {
  const base: ScreeningAnswersMap =
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as ScreeningAnswersMap)
      : {};
  return asInputJson({
    ...base,
    [key]: note
  });
};

export const addCandidateNote = async (
  applicationId: string,
  candidateUserId: string,
  note: string
): Promise<Application> => {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      candidateUserId
    }
  });
  if (!application) {
    throw new ServiceError("Application not found.", 404);
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      screeningAnswers: mergeNoteIntoAnswers(
        application.screeningAnswers,
        "candidateNote",
        sanitizeInput(note)
      )
    }
  });

  await logActivity({
    actorUserId: candidateUserId,
    tenantId: application.tenantId,
    action: "application.note_added_candidate",
    entityType: "Application",
    entityId: updated.id
  });

  return updated;
};

export const addRecruiterNote = async (
  applicationId: string,
  recruiterUserId: string,
  note: string
): Promise<Application> => {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId
    },
    include: {
      job: true
    }
  });
  if (!application) {
    throw new ServiceError("Application not found.", 404);
  }
  if (application.job.createdByUserId !== recruiterUserId) {
    throw new ServiceError("Forbidden", 403);
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      screeningAnswers: mergeNoteIntoAnswers(
        application.screeningAnswers,
        "recruiterNote",
        sanitizeInput(note)
      )
    }
  });

  await logActivity({
    actorUserId: recruiterUserId,
    tenantId: application.tenantId,
    action: "application.note_added_recruiter",
    entityType: "Application",
    entityId: updated.id
  });

  return updated;
};
