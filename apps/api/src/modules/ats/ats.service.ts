import { Prisma } from "@prisma/client";
import {
  ApplicationStatus,
  NotificationChannel,
  NotificationType,
  type Application,
  type PaginatedResponse
} from "@campushire/types";
import { getPresignedUrl } from "../../lib/s3";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import { logger } from "../../lib/logger";
import { writeApplicationStatusHistory } from "../../lib/application-history";
import { resolveUserTenant as getUserTenantId } from "../../lib/tenant";
import {
  notifyApplicationStatusChanged,
  notifyOfferReceived,
  sendNotification
} from "../../lib/notification";
import { triggerCommission } from "../freelance/freelance.service";
import type { ApplicationCard } from "../jobs/jobs.service";
import type { ATSFilters, MoveApplicationDto } from "./ats.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

export type KanbanBoard = Record<ApplicationStatus, ApplicationCard[]>;

export type ATSStats = {
  totalApplications: number;
  byStage: Record<ApplicationStatus, number>;
  conversionRate: number;
  avgTimeInStage: Record<ApplicationStatus, number>;
  topColleges: Array<{ college: string; count: number }>;
};

const transitionMap: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: [ApplicationStatus.SCREENING, ApplicationStatus.REJECTED, ApplicationStatus.ON_HOLD],
  SCREENING: [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED, ApplicationStatus.ON_HOLD],
  SHORTLISTED: [ApplicationStatus.INTERVIEW_R1, ApplicationStatus.REJECTED, ApplicationStatus.ON_HOLD],
  INTERVIEW_R1: [
    ApplicationStatus.INTERVIEW_R2,
    ApplicationStatus.OFFERED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.ON_HOLD
  ],
  INTERVIEW_R2: [
    ApplicationStatus.INTERVIEW_R3,
    ApplicationStatus.OFFERED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.ON_HOLD
  ],
  INTERVIEW_R3: [ApplicationStatus.OFFERED, ApplicationStatus.REJECTED, ApplicationStatus.ON_HOLD],
  OFFERED: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
  ACCEPTED: [ApplicationStatus.HIRED],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
  ON_HOLD: [ApplicationStatus.SCREENING, ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED]
};

const baseStageStats = (): Record<ApplicationStatus, number> => ({
  APPLIED: 0,
  SCREENING: 0,
  SHORTLISTED: 0,
  INTERVIEW_R1: 0,
  INTERVIEW_R2: 0,
  INTERVIEW_R3: 0,
  OFFERED: 0,
  ACCEPTED: 0,
  HIRED: 0,
  REJECTED: 0,
  WITHDRAWN: 0,
  ON_HOLD: 0
});

const parseSkills = (value: Prisma.JsonValue | null): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const output: string[] = [];
    for (const item of Object.values(record)) {
      if (Array.isArray(item)) {
        output.push(...item.filter((entry): entry is string => typeof entry === "string"));
      }
    }
    return output;
  }
  return [];
};

const resolveCandidateCollege = async (candidateUserId: string, tenantId?: string): Promise<string | null> => {
  const row = await prisma.studentProfile.findFirst({
    where: {
      userId: candidateUserId,
      ...(tenantId ? { tenantId } : {})
    },
    include: {
      collegeProfile: {
        select: { name: true }
      }
    }
  });
  return row?.collegeProfile?.name ?? null;
};

const buildApplicationCard = async (
  application: Prisma.ApplicationGetPayload<{
    include: {
      candidate: {
        include: {
          studentProfile: true;
          jobSeekerProfile: true;
        };
      };
    };
  }>,
  matchScore: number
): Promise<ApplicationCard> => {
  const studentProfile = application.candidate.studentProfile;
  const jobSeekerProfile = application.candidate.jobSeekerProfile;
  const college = await resolveCandidateCollege(application.candidateUserId, application.tenantId);

  return {
    id: application.id,
    candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`.trim(),
    avatarUrl: application.candidate.avatarUrl,
    tin: application.candidate.tin,
    college,
    cgpa: studentProfile?.cgpa ?? null,
    skills: parseSkills(studentProfile?.skills ?? jobSeekerProfile?.skills ?? null),
    matchScore,
    appliedAt: application.appliedAt,
    status: application.status
  };
};

const ensureRecruiterOwnsJob = async (recruiterId: string, jobId: string) => {
  const tenantId = await getUserTenantId(recruiterId);
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      createdByUserId: recruiterId,
      tenantId
    }
  });
  if (!job) {
    throw new ServiceError("Job not found for recruiter.", 404);
  }
  return job;
};

const getMatchScoresMap = async (
  jobId: string,
  candidateIds: string[],
  tenantId: string
): Promise<Map<string, number>> => {
  if (candidateIds.length === 0) {
    return new Map<string, number>();
  }
  const scores = await prisma.aIMatchScore.findMany({
    where: {
      tenantId,
      jobId,
      candidateUserId: {
        in: candidateIds
      }
    },
    select: {
      candidateUserId: true,
      score: true
    }
  });
  return new Map(scores.map((row) => [row.candidateUserId, row.score]));
};

const performMove = async (
  applicationId: string,
  recruiterId: string,
  dto: MoveApplicationDto
): Promise<Application> => {
  const tenantId = await getUserTenantId(recruiterId);
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      tenantId
    },
    include: {
      job: true,
      candidate: true
    }
  });

  if (!application) {
    throw new ServiceError("Application not found.", 404);
  }
  if (application.job.createdByUserId !== recruiterId) {
    throw new ServiceError("Forbidden", 403);
  }

  const allowed = transitionMap[application.status] ?? [];
  if (!allowed.includes(dto.toStatus)) {
    throw new ServiceError(
      `Invalid status transition from ${application.status} to ${dto.toStatus}.`,
      400
    );
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      status: dto.toStatus,
      rejectedAt: dto.toStatus === ApplicationStatus.REJECTED ? new Date() : undefined,
      hiredAt: dto.toStatus === ApplicationStatus.HIRED ? new Date() : undefined
    }
  });

  await writeApplicationStatusHistory(prisma, {
    applicationId: application.id,
    fromStatus: application.status,
    toStatus: dto.toStatus,
    note: dto.note,
    changedByUserId: recruiterId
  });

  const recruiter = await prisma.user.findUnique({
    where: { id: recruiterId }
  });
  if (recruiter) {
    await notifyApplicationStatusChanged(updated, application.job, application.candidate, recruiter);
  }

  if (dto.toStatus === ApplicationStatus.OFFERED) {
    await notifyOfferReceived(
      updated,
      application.job,
      application.candidate,
      application.job.title
    );
  }

  await logActivity({
    actorUserId: recruiterId,
    tenantId: application.tenantId,
    action: "application.status_changed",
    entityType: "Application",
    entityId: updated.id,
    metadata: {
      from: application.status,
      to: dto.toStatus
    }
  });

  if (
    dto.toStatus === ApplicationStatus.OFFERED &&
    application.job.referralCommissionTrigger === "ON_OFFER"
  ) {
    try {
      await triggerCommission(updated.id);
    } catch (error) {
      logger.warn(
        { error, applicationId: updated.id },
        "Referral commission trigger skipped at OFFERED stage"
      );
    }
  }

  if (
    dto.toStatus === ApplicationStatus.HIRED &&
    application.job.referralCommissionTrigger === "ON_JOINING"
  ) {
    try {
      await triggerCommission(updated.id);
    } catch (error) {
      logger.warn(
        { error, applicationId: updated.id },
        "Referral commission trigger skipped at HIRED stage"
      );
    }
  }

  return updated;
};

export const getKanbanBoard = async (recruiterId: string, jobId: string): Promise<KanbanBoard> => {
  const job = await ensureRecruiterOwnsJob(recruiterId, jobId);
  const applications = await prisma.application.findMany({
    where: {
      tenantId: job.tenantId,
      jobId: job.id
    },
    include: {
      candidate: {
        include: {
          studentProfile: true,
          jobSeekerProfile: true
        }
      }
    },
    orderBy: {
      appliedAt: "desc"
    }
  });

  const candidateIds = applications.map((application) => application.candidateUserId);
  const scoresMap = await getMatchScoresMap(job.id, candidateIds, job.tenantId);

  const board: KanbanBoard = {
    APPLIED: [],
    SCREENING: [],
    SHORTLISTED: [],
    INTERVIEW_R1: [],
    INTERVIEW_R2: [],
    INTERVIEW_R3: [],
    OFFERED: [],
    ACCEPTED: [],
    HIRED: [],
    REJECTED: [],
    WITHDRAWN: [],
    ON_HOLD: []
  };

  for (const application of applications) {
    const score = scoresMap.get(application.candidateUserId) ?? 0;
    board[application.status].push(await buildApplicationCard(application, score));
  }

  return board;
};

export const moveApplication = async (
  applicationId: string,
  recruiterId: string,
  dto: MoveApplicationDto
): Promise<Application> => {
  return performMove(applicationId, recruiterId, dto);
};

export const bulkMoveApplications = async (
  applicationIds: string[],
  recruiterId: string,
  toStatus: ApplicationStatus,
  note?: string
): Promise<Application[]> => {
  const moved: Application[] = [];
  for (const applicationId of applicationIds) {
    moved.push(
      await performMove(applicationId, recruiterId, {
        toStatus,
        note
      })
    );
  }
  return moved;
};

export const getApplicationsForJob = async (
  jobId: string,
  recruiterId: string,
  filters: ATSFilters,
  page: number,
  limit: number
): Promise<PaginatedResponse<unknown[]>> => {
  const job = await ensureRecruiterOwnsJob(recruiterId, jobId);
  const where: Prisma.ApplicationWhereInput = {
    tenantId: job.tenantId,
    jobId: job.id,
    status: filters.status,
    ...(filters.search
      ? {
          candidate: {
            OR: [
              { firstName: { contains: filters.search, mode: "insensitive" } },
              { lastName: { contains: filters.search, mode: "insensitive" } }
            ]
          }
        }
      : {})
  };

  const [total, rows] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: {
        candidate: {
          include: {
            studentProfile: true,
            jobSeekerProfile: true
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        },
        interviewSlots: {
          orderBy: {
            scheduledStartAt: "asc"
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

  const candidateIds = rows.map((row) => row.candidateUserId);
  const scoreMap = await getMatchScoresMap(job.id, candidateIds, job.tenantId);

  const filteredRows = rows.filter((row) => {
    if (filters.minScore === undefined) {
      return true;
    }
    return (scoreMap.get(row.candidateUserId) ?? 0) >= filters.minScore;
  });

  const withCollege = await Promise.all(
    filteredRows.map(async (row) => ({
      ...row,
      matchScore: scoreMap.get(row.candidateUserId) ?? 0,
      college: await resolveCandidateCollege(row.candidateUserId, job.tenantId)
    }))
  );

  const collegeFiltered = filters.college
    ? withCollege.filter((row) =>
        row.college?.toLowerCase().includes(filters.college?.toLowerCase() ?? "")
      )
    : withCollege;

  return {
    success: true,
    data: collegeFiltered,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const shortlistApplication = async (
  applicationId: string,
  recruiterId: string
): Promise<Application> => {
  return performMove(applicationId, recruiterId, {
    toStatus: ApplicationStatus.SHORTLISTED
  });
};

export const rejectApplication = async (
  applicationId: string,
  recruiterId: string,
  reason: string
): Promise<Application> => {
  const application = await performMove(applicationId, recruiterId, {
    toStatus: ApplicationStatus.REJECTED,
    note: reason
  });
  await sendNotification({
    userId: application.candidateUserId,
    type: NotificationType.APPLICATION_STATUS,
    title: "Application Rejected",
    body: reason,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
    contextType: "APPLICATION",
    contextId: application.id
  });
  return application;
};

const extractS3KeyFromUrl = (url: string): string | null => {
  const normalized = url.trim();
  if (!normalized) {
    return null;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/^\/+/, "") || null;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
};

export const downloadResume = async (applicationId: string, recruiterId: string): Promise<string> => {
  const tenantId = await getUserTenantId(recruiterId);
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      tenantId
    },
    include: {
      job: true,
      candidate: {
        include: {
          studentProfile: true,
          jobSeekerProfile: true
        }
      }
    }
  });
  if (!application) {
    throw new ServiceError("Application not found.", 404);
  }
  if (application.job.createdByUserId !== recruiterId) {
    throw new ServiceError("Forbidden", 403);
  }

  const resumeUrl =
    application.candidate.studentProfile?.resumeUrl ??
    application.candidate.jobSeekerProfile?.resumeUrl ??
    application.resumeSnapshotUrl;
  if (!resumeUrl) {
    throw new ServiceError("Resume not found.", 404);
  }

  const key = extractS3KeyFromUrl(resumeUrl);
  if (!key) {
    throw new ServiceError("Resume not available.", 404);
  }

  return getPresignedUrl(key, 3600);
};

export const getATSStats = async (recruiterId: string, jobId?: string): Promise<ATSStats> => {
  const tenantId = await getUserTenantId(recruiterId);
  const recruiterJobs = await prisma.job.findMany({
    where: {
      tenantId,
      createdByUserId: recruiterId,
      ...(jobId ? { id: jobId } : {})
    },
    select: { id: true, tenantId: true }
  });

  if (recruiterJobs.length === 0) {
    return {
      totalApplications: 0,
      byStage: baseStageStats(),
      conversionRate: 0,
      avgTimeInStage: baseStageStats(),
      topColleges: []
    };
  }

  const jobIds = recruiterJobs.map((job) => job.id);
  const applications = await prisma.application.findMany({
    where: {
      tenantId,
      jobId: { in: jobIds }
    },
    include: {
      statusHistory: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  const byStage = baseStageStats();
  for (const application of applications) {
    byStage[application.status] += 1;
  }

  const totalApplications = applications.length;
  const hired = byStage.HIRED;
  const conversionRate =
    totalApplications === 0 ? 0 : Number(((hired / totalApplications) * 100).toFixed(2));

  const stageDurations: Record<ApplicationStatus, number[]> = {
    APPLIED: [],
    SCREENING: [],
    SHORTLISTED: [],
    INTERVIEW_R1: [],
    INTERVIEW_R2: [],
    INTERVIEW_R3: [],
    OFFERED: [],
    ACCEPTED: [],
    HIRED: [],
    REJECTED: [],
    WITHDRAWN: [],
    ON_HOLD: []
  };

  for (const application of applications) {
    for (let i = 1; i < application.statusHistory.length; i += 1) {
      const prev = application.statusHistory[i - 1];
      const current = application.statusHistory[i];
      if (!prev || !current) {
        continue;
      }
      const durationHours = (current.createdAt.getTime() - prev.createdAt.getTime()) / 3_600_000;
      stageDurations[current.toStatus].push(Math.max(0, durationHours));
    }
  }

  const avgTimeInStage = baseStageStats();
  for (const [status, durations] of Object.entries(stageDurations) as Array<
    [ApplicationStatus, number[]]
  >) {
    if (durations.length === 0) {
      avgTimeInStage[status] = 0;
      continue;
    }
    const sum = durations.reduce((acc, value) => acc + value, 0);
    avgTimeInStage[status] = Number((sum / durations.length).toFixed(2));
  }

  const collegeCounter = new Map<string, number>();
  for (const application of applications) {
    const college = await resolveCandidateCollege(application.candidateUserId, tenantId);
    if (!college) {
      continue;
    }
    collegeCounter.set(college, (collegeCounter.get(college) ?? 0) + 1);
  }

  const topColleges = [...collegeCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([college, count]) => ({ college, count }));

  return {
    totalApplications,
    byStage,
    conversionRate,
    avgTimeInStage,
    topColleges
  };
};
