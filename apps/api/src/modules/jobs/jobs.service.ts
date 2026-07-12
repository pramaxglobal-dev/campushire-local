import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import {
  ApplicationStatus,
  JobStatus,
  JobType,
  UserRole,
  WorkMode,
  type Application,
  type Job
} from "@campushire/types";
import { formatSalaryRange, generateSlug } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { logActivity } from "../../lib/activity";
import {
  resolveExistingUserTenantOrNull,
  resolveUserTenant as getUserTenantId
} from "../../lib/tenant";
import { triggerBatchMatching } from "../../lib/ai";
import { sendNotification } from "../../lib/notification";
import type { CreateJobDto, JobFilters, UpdateJobDto } from "./jobs.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

interface SkillRequirement {
  name: string;
  isMandatory: boolean;
}

interface ScreeningQuestion {
  question: string;
  type: string;
  isRequired: boolean;
}

interface JobMetadataPayload {
  skills: SkillRequirement[];
  targetCollegeIds: string[];
}

const normalizeSkillRequirements = (
  skills: Array<{ name?: string; isMandatory?: boolean }> | undefined
): SkillRequirement[] => {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill) => {
      if (!skill || typeof skill.name !== "string") {
        return null;
      }

      const name = skill.name.trim();
      if (!name) {
        return null;
      }

      return {
        name,
        isMandatory: skill.isMandatory === true
      };
    })
    .filter((skill): skill is SkillRequirement => skill !== null);
};

export type ApplicationCard = {
  id: string;
  candidateName: string;
  avatarUrl: string | null;
  tin: string;
  college: string | null;
  cgpa: number | null;
  skills: string[];
  matchScore: number;
  appliedAt: Date;
  status: ApplicationStatus;
};

export type JobCard = {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string | null;
  jobType: JobType;
  workMode: WorkMode;
  salaryRange: string | null;
  skills: string[];
  postedAt: Date;
  applicationDeadline: Date | null;
  hasApplied: boolean;
  hasSaved: boolean;
  matchScore: number;
};

export type JobDetail = JobCard & {
  description: string;
  screeningQuestions: ScreeningQuestion[];
  recruiterProfile: Record<string, unknown>;
  applyCount: number;
  viewCount: number;
};

export type JobStats = {
  byStatus: Record<JobStatus, number>;
  totalViews: number;
  totalApplications: number;
  topJob: { id: string; title: string; applications: number } | null;
};

const activeApplicationStates: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW_R1,
  ApplicationStatus.INTERVIEW_R2,
  ApplicationStatus.INTERVIEW_R3,
  ApplicationStatus.OFFERED,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.ON_HOLD
];

const parseJobMetadata = (value: Prisma.JsonValue | null): JobMetadataPayload => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      skills: [],
      targetCollegeIds: []
    };
  }

  const record = value as Record<string, unknown>;
  const rawSkills = Array.isArray(record.skills) ? record.skills : [];
  const rawTargetCollegeIds = Array.isArray(record.targetCollegeIds) ? record.targetCollegeIds : [];

  const skills: SkillRequirement[] = rawSkills
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const row = entry as Record<string, unknown>;
      if (typeof row.name !== "string") {
        return null;
      }
      return {
        name: row.name,
        isMandatory: row.isMandatory === true
      };
    })
    .filter((entry): entry is SkillRequirement => entry !== null);

  const targetCollegeIds = rawTargetCollegeIds
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());

  return {
    skills,
    targetCollegeIds
  };
};

const parseScreeningQuestions = (value: Prisma.JsonValue | null): ScreeningQuestion[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const question = typeof row.question === "string" ? row.question : null;
      const type = typeof row.type === "string" ? row.type : "text";
      if (!question) {
        return null;
      }
      return {
        question,
        type,
        isRequired: row.isRequired !== false
      };
    })
    .filter((entry): entry is ScreeningQuestion => entry !== null);
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const buildLocation = (city?: string, state?: string): string | null => {
  if (!city && !state) {
    return null;
  }
  if (city && state) {
    return `${city}, ${state}`;
  }
  return city ?? state ?? null;
};

const parseLocationParts = (location: string | null): { city: string | null; state: string | null } => {
  if (!location) {
    return { city: null, state: null };
  }
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts[0] ?? null,
      state: parts[1] ?? null
    };
  }
  return {
    city: location,
    state: null
  };
};

const appendAndConditions = (
  where: Prisma.JobWhereInput,
  conditions: Prisma.JobWhereInput[]
): void => {
  if (conditions.length === 0) {
    return;
  }
  if (!where.AND) {
    where.AND = conditions;
    return;
  }
  if (Array.isArray(where.AND)) {
    where.AND = [...where.AND, ...conditions];
    return;
  }
  where.AND = [where.AND, ...conditions];
};

const jobCacheKey = (jobId: string): string => `job:${jobId}`;
const jobFeedCacheKey = (userId: string, page: number): string => `feed:${userId}:page:${page}`;

const invalidateJobCache = async (jobId: string): Promise<void> => {
  await redis.del(jobCacheKey(jobId));
};

const invalidateFeedCache = async (): Promise<void> => {
  const feedKeys = await redis.keys("feed:*");
  if (feedKeys.length > 0) {
    await redis.del(...feedKeys);
  }
};

const getRecruiterProfileByUser = async (recruiterUserId: string, tenantId: string) => {
  const recruiterProfile = await prisma.recruiterProfile.findFirst({
    where: {
      tenantId,
      userId: recruiterUserId
    }
  });

  if (!recruiterProfile) {
    throw new ServiceError("Recruiter profile not found.", 404);
  }

  return recruiterProfile;
};

const extractProfileSkills = (value: Prisma.JsonValue | null): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const collected: string[] = [];
    for (const item of Object.values(record)) {
      if (Array.isArray(item)) {
        collected.push(...item.filter((entry): entry is string => typeof entry === "string"));
      }
    }
    return collected;
  }
  return [];
};

const buildJobCard = async (
  job: Prisma.JobGetPayload<{
    include: {
      recruiterProfile: true;
      applications: {
        where: { candidateUserId: string };
        select: { id: true };
      };
      savedJobs: {
        where: { candidateUserId: string };
        select: { id: true };
      };
      aiMatchScores: {
        where: { candidateUserId: string };
        select: { score: true };
      };
    };
  }>,
  viewerUserId?: string
): Promise<JobCard> => {
  const metadata = parseJobMetadata(job.skillsRequired);
  const jobSkills = metadata.skills.map((skill) => skill.name);
  const hasApplied = viewerUserId ? job.applications.length > 0 : false;
  const hasSaved = viewerUserId ? job.savedJobs.length > 0 : false;
  const score = viewerUserId ? (job.aiMatchScores[0]?.score ?? 0) : 0;

  return {
    id: job.id,
    title: job.title,
    company: job.recruiterProfile.companyName,
    logo: job.recruiterProfile.logoUrl,
    location: job.location,
    jobType: job.jobType,
    workMode: job.workMode,
    salaryRange: job.minCtc && job.maxCtc ? formatSalaryRange(job.minCtc, job.maxCtc) : null,
    skills: jobSkills,
    postedAt: job.createdAt,
    applicationDeadline: job.applicationDeadline ?? null,
    hasApplied,
    hasSaved,
    matchScore: score
  };
};

export const createJob = async (
  recruiterId: string,
  tenantId: string,
  dto: CreateJobDto
): Promise<Job> => {
  const recruiterProfile = await getRecruiterProfileByUser(recruiterId, tenantId);
  const slug = `${generateSlug(dto.title)}-${nanoid(4).toLowerCase()}`;
  const location = buildLocation(dto.locationCity, dto.locationState);
  const metadata: JobMetadataPayload = {
    skills: normalizeSkillRequirements(dto.skillsRequired),
    targetCollegeIds: dto.targetCollegeIds ?? []
  };

  const job = await prisma.job.create({
    data: {
      tenantId,
      recruiterProfileId: recruiterProfile.id,
      createdByUserId: recruiterId,
      title: dto.title,
      slug,
      description: dto.description,
      location,
      locationCity: dto.locationCity ?? null,
      locationState: dto.locationState ?? null,
      workMode: dto.workMode,
      jobType: dto.jobType,
      status: dto.status ?? JobStatus.DRAFT,
      openings: dto.openings,
      minCtc: dto.salaryMin,
      maxCtc: dto.salaryMax,
      skillsRequired: toJsonValue(metadata),
      screeningQuestions: toJsonValue(dto.screeningQuestions),
      experienceMinMonths: dto.experienceMin,
      experienceMaxMonths: dto.experienceMax,
      applicationDeadline: dto.applicationDeadline,
      referralCommissionType: dto.commissionType,
      referralCommissionValue: dto.commissionPct,
      referralCommissionTrigger: dto.commissionTrigger,
      isFreelanceReferralAllowed: Boolean(dto.commissionPct),
      collegeProfileId: dto.targetCollegeIds?.[0] ?? null,
      isPublished: dto.status === JobStatus.ACTIVE,
      publishedAt: dto.status === JobStatus.ACTIVE ? new Date() : null
    }
  });

  await logActivity({
    actorUserId: recruiterId,
    tenantId,
    action: "job.created",
    entityType: "Job",
    entityId: job.id
  });

  if (job.status === JobStatus.ACTIVE) {
    await triggerBatchMatching(job.id);
  }
  await invalidateFeedCache();

  return job;
};

export const updateJob = async (
  jobId: string,
  recruiterId: string,
  dto: UpdateJobDto
): Promise<Job> => {
  const tenantId = await getUserTenantId(recruiterId);
  const existing = await prisma.job.findFirst({
    where: {
      id: jobId,
      createdByUserId: recruiterId,
      tenantId
    }
  });
  if (!existing) {
    throw new ServiceError("Job not found.", 404);
  }

  const previousStatus = existing.status;
  const existingMeta = parseJobMetadata(existing.skillsRequired);
  const mergedMeta: JobMetadataPayload = {
    skills: dto.skillsRequired
      ? normalizeSkillRequirements(dto.skillsRequired)
      : existingMeta.skills,
    targetCollegeIds: dto.targetCollegeIds ?? existingMeta.targetCollegeIds
  };

  const location =
    dto.locationCity !== undefined || dto.locationState !== undefined
      ? buildLocation(dto.locationCity, dto.locationState)
      : undefined;

  const updated = await prisma.job.update({
    where: { id: existing.id },
    data: {
      title: dto.title,
      description: dto.description,
      jobType: dto.jobType,
      workMode: dto.workMode,
      location,
      locationCity: dto.locationCity !== undefined ? dto.locationCity : undefined,
      locationState: dto.locationState !== undefined ? dto.locationState : undefined,
      openings: dto.openings,
      minCtc: dto.salaryMin,
      maxCtc: dto.salaryMax,
      skillsRequired: dto.skillsRequired || dto.targetCollegeIds ? toJsonValue(mergedMeta) : undefined,
      screeningQuestions: dto.screeningQuestions ? toJsonValue(dto.screeningQuestions) : undefined,
      experienceMinMonths: dto.experienceMin,
      experienceMaxMonths: dto.experienceMax,
      applicationDeadline: dto.applicationDeadline,
      status: dto.status,
      isPublished: dto.status ? dto.status === JobStatus.ACTIVE : undefined,
      publishedAt:
        dto.status && dto.status === JobStatus.ACTIVE && previousStatus !== JobStatus.ACTIVE
          ? new Date()
          : undefined,
      referralCommissionType: dto.commissionType,
      referralCommissionValue: dto.commissionPct,
      referralCommissionTrigger: dto.commissionTrigger,
      isFreelanceReferralAllowed:
        dto.commissionPct !== undefined ? Boolean(dto.commissionPct) : undefined,
      collegeProfileId: dto.targetCollegeIds?.[0]
    }
  });

  await invalidateJobCache(jobId);
  await invalidateFeedCache();

  await logActivity({
    actorUserId: recruiterId,
    tenantId: existing.tenantId,
    action: "job.updated",
    entityType: "Job",
    entityId: updated.id
  });

  if (previousStatus !== JobStatus.ACTIVE && updated.status === JobStatus.ACTIVE) {
    await triggerBatchMatching(updated.id);
  }

  return updated;
};

export const deleteJob = async (jobId: string, recruiterId: string): Promise<void> => {
  const tenantId = await getUserTenantId(recruiterId);
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      createdByUserId: recruiterId,
      tenantId
    }
  });
  if (!job) {
    throw new ServiceError("Job not found.", 404);
  }

  const activeApplications = await prisma.application.count({
    where: {
      tenantId: job.tenantId,
      jobId: job.id,
      status: {
        in: activeApplicationStates
      }
    }
  });

  if (activeApplications > 0) {
    throw new ServiceError("Cannot close job with active applications.", 409);
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: JobStatus.CLOSED,
      isPublished: false
    }
  });

  await invalidateJobCache(jobId);
  await invalidateFeedCache();
  await logActivity({
    actorUserId: recruiterId,
    tenantId: job.tenantId,
    action: "job.closed",
    entityType: "Job",
    entityId: job.id
  });
};

export const getJob = async (
  jobId: string,
  viewerUserId?: string
): Promise<JobDetail> => {
  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      createdByUserId: true
    }
  });
  if (!existing) {
    throw new ServiceError("Job not found.", 404);
  }

  const isOwner = Boolean(viewerUserId && existing.createdByUserId === viewerUserId);
  if (existing.status !== JobStatus.ACTIVE && !isOwner) {
    throw new ServiceError("Job not found.", 404);
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      viewCount: { increment: 1 }
    }
  });

  const cached = await redis.get(jobCacheKey(jobId));

  if (cached) {
    const parsed = JSON.parse(cached) as JobDetail;
    parsed.viewCount = Math.max(0, parsed.viewCount + 1);
    if (viewerUserId) {
      const [hasApplied, hasSaved] = await Promise.all([
        prisma.application.findFirst({
          where: {
            jobId,
            candidateUserId: viewerUserId
          },
          select: { id: true }
        }),
        prisma.savedJob.findFirst({
          where: {
            jobId,
            candidateUserId: viewerUserId
          },
          select: { id: true }
        })
      ]);
      parsed.hasApplied = Boolean(hasApplied);
      parsed.hasSaved = Boolean(hasSaved);
    }
    await redis.set(jobCacheKey(jobId), JSON.stringify(parsed), "EX", 300);
    return parsed;
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      recruiterProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      },
      applications: viewerUserId
        ? {
            where: {
              candidateUserId: viewerUserId
            },
            select: { id: true }
          }
        : false,
      savedJobs: viewerUserId
        ? {
            where: {
              candidateUserId: viewerUserId
            },
            select: { id: true }
          }
        : false,
      aiMatchScores: viewerUserId
        ? {
            where: {
              candidateUserId: viewerUserId
            },
            select: { score: true }
          }
        : false
    }
  });

  if (!job) {
    throw new ServiceError("Job not found.", 404);
  }

  const baseCard = await buildJobCard(
    {
      ...job,
      applications: Array.isArray(job.applications) ? job.applications : [],
      savedJobs: Array.isArray(job.savedJobs) ? job.savedJobs : [],
      aiMatchScores: Array.isArray(job.aiMatchScores) ? job.aiMatchScores : []
    },
    viewerUserId
  );

  const detail: JobDetail = {
    ...baseCard,
    description: job.description,
    screeningQuestions: parseScreeningQuestions(job.screeningQuestions),
    recruiterProfile: {
      id: job.recruiterProfile.id,
      companyName: job.recruiterProfile.companyName,
      companySlug: job.recruiterProfile.companySlug,
      logoUrl: job.recruiterProfile.logoUrl,
      hiringNow: job.recruiterProfile.hiringNow,
      user: job.recruiterProfile.user
    },
    applyCount: job.applyCount,
    viewCount: job.viewCount
  };

  await redis.set(jobCacheKey(jobId), JSON.stringify(detail), "EX", 300);
  return detail;
};

const applyRoleBasedWhere = async (
  filters: JobFilters,
  viewerUserId?: string
): Promise<{ where: Prisma.JobWhereInput; viewerRole: UserRole | null }> => {
  const where: Prisma.JobWhereInput = {
    ...(filters.jobType ? { jobType: filters.jobType } : {}),
    ...(filters.workMode ? { workMode: filters.workMode } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
    appendAndConditions(where, [
      {
        minCtc: filters.salaryMin !== undefined ? { gte: filters.salaryMin } : undefined,
        maxCtc: filters.salaryMax !== undefined ? { lte: filters.salaryMax } : undefined
      }
    ]);
  }

  if (filters.hasCommission !== undefined) {
    where.isFreelanceReferralAllowed = filters.hasCommission;
  }

  if (filters.locationCity || filters.locationState) {
    if (filters.locationCity) {
      appendAndConditions(where, [
        { locationCity: { contains: filters.locationCity, mode: "insensitive" as const } }
      ]);
    }
    if (filters.locationState) {
      appendAndConditions(where, [
        { locationState: { contains: filters.locationState, mode: "insensitive" as const } }
      ]);
    }
  }

  if (!viewerUserId) {
    where.status = JobStatus.ACTIVE;
    return { where, viewerRole: null };
  }

  const viewer = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: {
      role: true,
      tenantId: true
    }
  });

  if (!viewer) {
    where.status = JobStatus.ACTIVE;
    return { where, viewerRole: null };
  }

  if (filters.myJobsOnly) {
    if (viewer.role !== UserRole.CORPORATE_RECRUITER || !viewer.tenantId) {
      throw new ServiceError("Only recruiters can list own jobs.", 403);
    }
    where.createdByUserId = viewerUserId;
    where.tenantId = viewer.tenantId;
    if (filters.status) {
      where.status = filters.status;
    }
    return { where, viewerRole: viewer.role };
  }

  if (viewer.role === UserRole.SUPER_ADMIN) {
    where.status = filters.status ?? JobStatus.ACTIVE;
    return { where, viewerRole: viewer.role };
  }

  where.status = JobStatus.ACTIVE;
  return { where, viewerRole: viewer.role };
};

const normalizeSkillFilter = (skills: JobFilters["skills"]): string[] => {
  if (!skills) {
    return [];
  }
  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
  }
  return skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0);
};

export const listJobs = async (
  filters: JobFilters,
  viewerUserId?: string
): Promise<{
  success: boolean;
  data: JobCard[];
  error: null;
  meta: { total: number; page: number; limit: number; totalPages: number };
}> => {
  const { where } = await applyRoleBasedWhere(filters, viewerUserId);
  const jobs = await prisma.job.findMany({
    where,
    include: {
      recruiterProfile: true,
      applications: viewerUserId
        ? {
            where: { candidateUserId: viewerUserId },
            select: { id: true }
          }
        : false,
      savedJobs: viewerUserId
        ? {
            where: { candidateUserId: viewerUserId },
            select: { id: true }
          }
        : false,
      aiMatchScores: viewerUserId
        ? {
            where: { candidateUserId: viewerUserId },
            select: { score: true }
          }
        : false
    }
  });

  const skillFilter = normalizeSkillFilter(filters.skills);
  const filteredBySkills = jobs.filter((job) => {
    if (skillFilter.length === 0) {
      return true;
    }
    const metadata = parseJobMetadata(job.skillsRequired);
    const jobSkills = metadata.skills.map((skill) => skill.name.toLowerCase());
    return skillFilter.some((skill) => jobSkills.includes(skill.toLowerCase()));
  });

  const cards = await Promise.all(
    filteredBySkills.map((job) =>
      buildJobCard(
        {
          ...job,
          applications: Array.isArray(job.applications) ? job.applications : [],
          savedJobs: Array.isArray(job.savedJobs) ? job.savedJobs : [],
          aiMatchScores: Array.isArray(job.aiMatchScores) ? job.aiMatchScores : []
        },
        viewerUserId
      )
    )
  );

  if (filters.sortBy === "salary") {
    cards.sort((a, b) => {
      const aMin = a.salaryRange ? Number.parseFloat(a.salaryRange.replace(/[^\d.]/g, "")) : 0;
      const bMin = b.salaryRange ? Number.parseFloat(b.salaryRange.replace(/[^\d.]/g, "")) : 0;
      return filters.sortOrder === "asc" ? aMin - bMin : bMin - aMin;
    });
  } else if (filters.sortBy === "relevance") {
    cards.sort((a, b) => b.matchScore - a.matchScore);
  } else {
    cards.sort((a, b) =>
      filters.sortOrder === "asc"
        ? a.postedAt.getTime() - b.postedAt.getTime()
        : b.postedAt.getTime() - a.postedAt.getTime()
    );
  }

  const total = cards.length;
  const start = (filters.page - 1) * filters.limit;
  const paged = cards.slice(start, start + filters.limit);

  return {
    success: true,
    data: paged,
    error: null,
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit))
    }
  };
};

export const getJobFeed = async (
  userId: string,
  page: number,
  limit: number
): Promise<{
  success: boolean;
  data: JobCard[];
  error: null;
  meta: { total: number; page: number; limit: number; totalPages: number };
}> => {
  const cacheKey = jobFeedCacheKey(userId, page);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as {
      success: boolean;
      data: JobCard[];
      error: null;
      meta: { total: number; page: number; limit: number; totalPages: number };
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      jobSeekerProfile: true
    }
  });

  if (!user || (user.role !== UserRole.STUDENT && user.role !== UserRole.JOB_SEEKER)) {
    throw new ServiceError("Feed is only available for students and job seekers.", 403);
  }

  const appliedJobIds = await prisma.application.findMany({
    where: {
      candidateUserId: userId
    },
    select: {
      jobId: true
    }
  });
  const excludedJobIds = appliedJobIds.map((entry) => entry.jobId);

  const preferredLocations =
    user.role === UserRole.STUDENT
      ? (user.studentProfile?.preferredLocations as Prisma.JsonValue | null)
      : (user.jobSeekerProfile?.preferredLocations as Prisma.JsonValue | null);
  const preferredLocationSet = extractProfileSkills(preferredLocations);
  const preferredWorkMode =
    user.role === UserRole.STUDENT
      ? user.studentProfile?.preferredWorkMode
      : user.jobSeekerProfile?.preferredWorkMode;
  const preferredJobTypes = (() => {
    if (!user.metadata || typeof user.metadata !== "object" || Array.isArray(user.metadata)) {
      return [] as JobType[];
    }
    const raw =
      (user.metadata as Record<string, unknown>).preferredRoles ??
      (user.metadata as Record<string, unknown>).preferredJobTypes;
    if (!Array.isArray(raw)) {
      return [] as JobType[];
    }
    return raw
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toUpperCase())
      .filter((value): value is JobType => Object.values(JobType).includes(value as JobType));
  })();

  const jobs = await prisma.job.findMany({
    where: {
      status: JobStatus.ACTIVE,
      id: {
        notIn: excludedJobIds.length > 0 ? excludedJobIds : undefined
      }
    },
    include: {
      recruiterProfile: true,
      applications: {
        where: { candidateUserId: userId },
        select: { id: true }
      },
      savedJobs: {
        where: { candidateUserId: userId },
        select: { id: true }
      },
      aiMatchScores: {
        where: { candidateUserId: userId },
        select: { score: true }
      }
    },
    take: 300
  });

  const filtered = jobs.filter((job) => {
    const roleOk = preferredJobTypes.length === 0 || preferredJobTypes.includes(job.jobType);
    const workModeOk =
      !preferredWorkMode || preferredWorkMode === WorkMode.ANY || job.workMode === preferredWorkMode;
    const locationOk =
      preferredLocationSet.length === 0 ||
      !job.location ||
      preferredLocationSet.some((location) =>
        job.location?.toLowerCase().includes(location.toLowerCase())
      );
    return roleOk && workModeOk && locationOk;
  });

  filtered.sort((a, b) => {
    const aScore = a.aiMatchScores[0]?.score ?? 0;
    const bScore = b.aiMatchScores[0]?.score ?? 0;
    if (aScore !== bScore) {
      return bScore - aScore;
    }
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const cards = await Promise.all(
    filtered.map((job) =>
      buildJobCard(
        {
          ...job,
          applications: job.applications,
          savedJobs: job.savedJobs,
          aiMatchScores: job.aiMatchScores
        },
        userId
      )
    )
  );

  const total = cards.length;
  const start = (page - 1) * limit;
  const pageData = cards.slice(start, start + limit);

  const result = {
    success: true,
    data: pageData,
    error: null as null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };

  await redis.set(cacheKey, JSON.stringify(result), "EX", 120);
  return result;
};

export const saveJob = async (userId: string, jobId: string): Promise<void> => {
  const tenantId = await resolveExistingUserTenantOrNull(userId);
  const job = await prisma.job.findUnique({
    where: {
      id: jobId
    },
    select: { id: true, tenantId: true }
  });
  if (!job) {
    throw new ServiceError("Job not found.", 404);
  }

  await prisma.savedJob.upsert({
    where: {
      candidateUserId_jobId: {
        candidateUserId: userId,
        jobId
      }
    },
    update: {},
    create: {
      candidateUserId: userId,
      jobId
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: tenantId ?? undefined,
    action: "job.saved",
    entityType: "SavedJob",
    entityId: `${userId}:${jobId}`
  });
};

export const unsaveJob = async (userId: string, jobId: string): Promise<void> => {
  const tenantId = await resolveExistingUserTenantOrNull(userId);

  await prisma.savedJob.deleteMany({
    where: {
      candidateUserId: userId,
      jobId
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: tenantId ?? undefined,
    action: "job.unsaved",
    entityType: "SavedJob",
    entityId: `${userId}:${jobId}`
  });
};

export const getSavedJobs = async (
  userId: string,
  page: number,
  limit: number
): Promise<{
  success: boolean;
  data: JobCard[];
  error: null;
  meta: { total: number; page: number; limit: number; totalPages: number };
}> => {
  await resolveExistingUserTenantOrNull(userId);
  const [total, savedRows] = await prisma.$transaction([
    prisma.savedJob.count({
      where: {
        candidateUserId: userId
      }
    }),
    prisma.savedJob.findMany({
      where: {
        candidateUserId: userId
      },
      include: {
        job: {
          include: {
            recruiterProfile: true,
            applications: {
              where: { candidateUserId: userId },
              select: { id: true }
            },
            savedJobs: {
              where: { candidateUserId: userId },
              select: { id: true }
            },
            aiMatchScores: {
              where: { candidateUserId: userId },
              select: { score: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const cards = await Promise.all(
    savedRows.map((row) =>
      buildJobCard(
        {
          ...row.job,
          applications: row.job.applications,
          savedJobs: row.job.savedJobs,
          aiMatchScores: row.job.aiMatchScores
        },
        userId
      )
    )
  );

  return {
    success: true,
    data: cards,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const submitJobForApproval = async (jobId: string, recruiterId: string): Promise<Job> => {
  const tenantId = await getUserTenantId(recruiterId);
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      createdByUserId: recruiterId,
      tenantId
    }
  });
  if (!job) {
    throw new ServiceError("Job not found.", 404);
  }
  if (job.status !== JobStatus.DRAFT) {
    throw new ServiceError("Only draft jobs can be submitted.", 400);
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      status: JobStatus.PENDING_APPROVAL
    }
  });

  await logActivity({
    actorUserId: recruiterId,
    tenantId: job.tenantId,
    action: "job.submitted_for_approval",
    entityType: "Job",
    entityId: job.id
  });

  const superAdmins = await prisma.user.findMany({
    where: {
      role: UserRole.SUPER_ADMIN,
      isActive: true
    },
    select: { id: true }
  });
  await Promise.all(
    superAdmins.map((admin) =>
      sendNotification({
        userId: admin.id,
        type: "SYSTEM",
        title: "Job Approval Required",
        body: `A job "${job.title}" is pending approval.`,
        channels: ["IN_APP", "EMAIL"],
        contextType: "APPLICATION",
        contextId: job.id
      })
    )
  );
  await invalidateFeedCache();

  return updated;
};

export const approveJob = async (jobId: string, adminId: string): Promise<Job> => {
  const job = await prisma.job.findUnique({
    where: { id: jobId }
  });
  if (!job) {
    throw new ServiceError("Job not found.", 404);
  }
  if (job.status !== JobStatus.PENDING_APPROVAL) {
    throw new ServiceError("Job is not pending approval.", 400);
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      status: JobStatus.ACTIVE,
      isPublished: true,
      publishedAt: new Date()
    }
  });

  await triggerBatchMatching(updated.id);
  await logActivity({
    actorUserId: adminId,
    tenantId: updated.tenantId,
    action: "job.approved",
    entityType: "Job",
    entityId: updated.id
  });

  await sendNotification({
    userId: updated.createdByUserId,
    type: "SYSTEM",
    title: "Job Approved",
    body: `Your job "${updated.title}" is now active.`,
    channels: ["IN_APP", "EMAIL"],
    contextType: "APPLICATION",
    contextId: updated.id
  });
  await invalidateFeedCache();

  return updated;
};

export const rejectJob = async (jobId: string, adminId: string, reason: string): Promise<Job> => {
  const job = await prisma.job.findUnique({
    where: { id: jobId }
  });
  if (!job) {
    throw new ServiceError("Job not found.", 404);
  }
  if (job.status !== JobStatus.PENDING_APPROVAL) {
    throw new ServiceError("Job is not pending approval.", 400);
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      status: JobStatus.DRAFT,
      isPublished: false
    }
  });

  await logActivity({
    actorUserId: adminId,
    tenantId: updated.tenantId,
    action: "job.rejected",
    entityType: "Job",
    entityId: updated.id,
    metadata: { reason }
  });

  await sendNotification({
    userId: updated.createdByUserId,
    type: "SYSTEM",
    title: "Job Rejected",
    body: `Your job "${updated.title}" was moved back to draft. Reason: ${reason}`,
    channels: ["IN_APP", "EMAIL"],
    contextType: "APPLICATION",
    contextId: updated.id
  });
  await invalidateFeedCache();

  return updated;
};

export const getRecruiterJobStats = async (recruiterId: string): Promise<JobStats> => {
  const tenantId = await getUserTenantId(recruiterId);
  const jobs = await prisma.job.findMany({
    where: {
      createdByUserId: recruiterId,
      tenantId
    },
    select: {
      id: true,
      title: true,
      status: true,
      viewCount: true
    }
  });

  const byStatus: Record<JobStatus, number> = {
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    ACTIVE: 0,
    PAUSED: 0,
    CLOSED: 0,
    EXPIRED: 0
  };

  for (const job of jobs) {
    byStatus[job.status] += 1;
  }

  const totalViews = jobs.reduce((sum, job) => sum + job.viewCount, 0);

  const applicationCounts = await prisma.application.groupBy({
    by: ["jobId"],
    where: {
      tenantId,
      jobId: {
        in: jobs.map((job) => job.id)
      }
    },
    _count: {
      _all: true
    }
  });

  const countMap = new Map<string, number>();
  let totalApplications = 0;
  for (const row of applicationCounts) {
    const count = row._count._all ?? 0;
    countMap.set(row.jobId, count);
    totalApplications += count;
  }

  let topJob: { id: string; title: string; applications: number } | null = null;
  for (const job of jobs) {
    const applications = countMap.get(job.id) ?? 0;
    if (!topJob || applications > topJob.applications) {
      topJob = {
        id: job.id,
        title: job.title,
        applications
      };
    }
  }

  return {
    byStatus,
    totalViews,
    totalApplications,
    topJob
  };
};
