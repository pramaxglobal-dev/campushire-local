import { Prisma } from "@prisma/client";
import {
  ApplicationStatus,
  ReferralStatus,
  UserRole,
  type PaginatedResponse
} from "@campushire/types";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { logActivity } from "../../lib/activity";
import type { DateRange } from "./analytics.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

const ANALYTICS_CACHE_TTL_SECONDS = 10 * 60;
const MONTHS_WINDOW = 6;

const monthLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
  timeZone: "UTC"
});

const dayLabelFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC"
});

const toMonthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const toDayKey = (date: Date): string => dayLabelFormatter.format(date);

const buildMonthSeries = (months: number): Array<{ key: string; label: string }> => {
  const now = new Date();
  const result: Array<{ key: string; label: string }> = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const bucket = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    result.push({ key: toMonthKey(bucket), label: monthLabelFormatter.format(bucket) });
  }
  return result;
};

const toPercent = (value: number): number => Math.round(value * 100) / 100;

const toDays = (milliseconds: number): number => milliseconds / (1000 * 60 * 60 * 24);

const parseJsonStringArray = (value: Prisma.JsonValue | null): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry === "string") {
        return [entry];
      }
      if (entry && typeof entry === "object" && "name" in entry) {
        const name = (entry as Record<string, unknown>).name;
        if (typeof name === "string") {
          return [name];
        }
      }
      return [];
    });
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((entry) => {
      if (typeof entry === "string") {
        return [entry];
      }
      if (Array.isArray(entry)) {
        return entry.filter((item): item is string => typeof item === "string");
      }
      if (entry && typeof entry === "object" && "name" in entry) {
        const name = (entry as Record<string, unknown>).name;
        if (typeof name === "string") {
          return [name];
        }
      }
      return [];
    });
  }
  return [];
};

const buildApplicationStatusRecord = (): Record<ApplicationStatus, number> => ({
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

const buildReferralStatusRecord = (): Record<ReferralStatus, number> => ({
  ACTIVE: 0,
  TRIGGERED: 0,
  INVOICED: 0,
  PAID: 0,
  DISPUTED: 0,
  CANCELLED: 0
});

const createCacheKey = (
  role: UserRole,
  userId: string,
  dateRange: DateRange
): string => `analytics:${role}:${userId}:${dateRange.fromIso}:${dateRange.toIso}`;

const getCachedAnalytics = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const cacheAnalytics = async <T>(key: string, value: T): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ANALYTICS_CACHE_TTL_SECONDS);
  } catch {
    // No-op on cache write failures.
  }
};

const ensureUser = async (
  userId: string
): Promise<{
  id: string;
  tenantId: string | null;
  role: UserRole;
}> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      role: true
    }
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  return user;
};

const sumByStatusRows = (
  rows: Array<{ status: ApplicationStatus; _count: { status: number } }>
): Record<ApplicationStatus, number> => {
  const stats = buildApplicationStatusRecord();
  for (const row of rows) {
    stats[row.status] = row._count.status;
  }
  return stats;
};

const mergeIntoMonthSeries = (
  rows: Array<{ at: Date }>,
  field: "count" | "amount"
): Array<{ month: string; count: number } | { month: string; amount: number }> => {
  const months = buildMonthSeries(MONTHS_WINDOW);
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = toMonthKey(row.at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (field === "count") {
    return months.map((month) => ({
      month: month.label,
      count: counts.get(month.key) ?? 0
    }));
  }

  return months.map((month) => ({
    month: month.label,
    amount: counts.get(month.key) ?? 0
  }));
};

const extractCareerScoreFromPayload = (payload: Prisma.JsonValue | null): number | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const rawScore = record.careerScore;
  if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
    return rawScore;
  }

  return null;
};

export interface StudentAnalytics {
  applicationFunnel: {
    applied: number;
    screening: number;
    shortlisted: number;
    interviewing: number;
    offered: number;
    hired: number;
    rejected: number;
  };
  applicationsByMonth: Array<{ month: string; count: number }>;
  topSkillsMatched: Array<{ skill: string; matchCount: number }>;
  responseRate: number;
  avgTimeToResponse: number;
  profileViews: number;
  careerScoreHistory: Array<{ date: string; score: number }>;
  savedJobsCount: number;
  interviewsCount: number;
}

export interface RecruiterAnalytics {
  totalJobsPosted: number;
  activeJobs: number;
  totalApplicationsReceived: number;
  applicationsByStage: Record<ApplicationStatus, number>;
  applicationsByJob: Array<{ jobTitle: string; count: number }>;
  timeToHire: number;
  offerAcceptanceRate: number;
  topSourceColleges: Array<{ college: string; count: number }>;
  interviewsScheduled: number;
  hiresByMonth: Array<{ month: string; count: number }>;
  conversionFunnel: Array<{ stage: string; count: number; rate: number }>;
}

export interface CollegeAnalytics {
  totalStudents: number;
  studentsWithProfile: number;
  studentsApplied: number;
  studentsHired: number;
  placementRate: number;
  topRecruiterConnections: Array<{ company: string; hires: number }>;
  applicationsByBranch: Array<{ branch: string; count: number }>;
  avgCareerScore: number;
  upcomingEvents: number;
  inviteCodeUsage: Array<{ code: string; used: number; max: number }>;
}

export interface PlatformAnalytics {
  userGrowth: Array<{ date: string; role: UserRole; count: number }>;
  tenantStats: Array<{ tenantId: string; name: string; users: number; jobs: number; applications: number }>;
  revenueMetrics: {
    totalCommissions: number;
    totalCourseRevenue: number;
    totalServiceRevenue: number;
    pendingPayouts: number;
  };
  jobFunnelPlatform: Record<ApplicationStatus, number>;
  topColleges: Array<{ name: string; placementRate: number }>;
  topRecruiters: Array<{ company: string; hires: number }>;
  dailyActiveUsers: Array<{ date: string; count: number }>;
  systemHealth: {
    totalApiCalls: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

export interface FreelanceAnalytics {
  totalReferrals: number;
  referralsByStatus: Record<ReferralStatus, number>;
  commissionsByMonth: Array<{ month: string; amount: number }>;
  topJobs: Array<{ jobTitle: string; company: string; referrals: number }>;
  conversionRate: number;
  pendingPayout: number;
  totalEarned: number;
}

export const getStudentAnalytics = async (
  userId: string,
  dateRange: DateRange
): Promise<StudentAnalytics> => {
  const user = await ensureUser(userId);
  const cacheKey = createCacheKey(user.role, userId, dateRange);
  const cached = await getCachedAnalytics<StudentAnalytics>(cacheKey);
  if (cached) {
    return cached;
  }

  const whereByCandidate: Prisma.ApplicationWhereInput = {
    candidateUserId: userId,
    ...(user.tenantId ? { tenantId: user.tenantId } : {})
  };

  const [applications, profileViews, savedJobsCount, interviewsCount, profile] =
    await prisma.$transaction([
      prisma.application.findMany({
        where: whereByCandidate,
        select: {
          id: true,
          appliedAt: true,
          status: true
        }
      }),
      prisma.activityLog.count({
        where: {
          action: "profile.viewed",
          entityType: "User",
          entityId: userId
        }
      }),
      prisma.savedJob.count({
        where: {
          candidateUserId: userId
        }
      }),
      prisma.interviewSlot.count({
        where: {
          candidateUserId: userId
        }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          studentProfile: {
            select: {
              careerScore: true,
              updatedAt: true
            }
          },
          jobSeekerProfile: {
            select: {
              careerScore: true,
              updatedAt: true
            }
          }
        }
      })
    ]);

  const applicationStatusCounts = buildApplicationStatusRecord();
  for (const application of applications) {
    applicationStatusCounts[application.status] += 1;
  }
  const interviewingCount =
    applicationStatusCounts.INTERVIEW_R1 +
    applicationStatusCounts.INTERVIEW_R2 +
    applicationStatusCounts.INTERVIEW_R3;

  const sixMonthBoundary = buildMonthSeries(MONTHS_WINDOW)[0]?.key ?? toMonthKey(new Date());
  const sixMonthStartDate = new Date(`${sixMonthBoundary}-01T00:00:00.000Z`);
  const applicationSeriesSource = applications
    .filter((application) => application.appliedAt >= sixMonthStartDate)
    .map((application) => ({ at: application.appliedAt }));
  const applicationsByMonth = mergeIntoMonthSeries(applicationSeriesSource, "count") as Array<{
    month: string;
    count: number;
  }>;

  const applicationIds = applications.map((application) => application.id);
  const firstResponses = applicationIds.length
    ? await prisma.applicationStatusHistory.findMany({
        where: {
          applicationId: {
            in: applicationIds
          },
          toStatus: {
            not: ApplicationStatus.APPLIED
          }
        },
        orderBy: [{ applicationId: "asc" }, { createdAt: "asc" }],
        select: {
          applicationId: true,
          createdAt: true
        }
      })
    : [];

  const firstResponseByApplication = new Map<string, Date>();
  for (const row of firstResponses) {
    if (!firstResponseByApplication.has(row.applicationId)) {
      firstResponseByApplication.set(row.applicationId, row.createdAt);
    }
  }

  let responseDiffTotal = 0;
  let responseDiffCount = 0;
  const appliedAtById = new Map(applications.map((application) => [application.id, application.appliedAt]));
  for (const [applicationId, firstResponseAt] of firstResponseByApplication.entries()) {
    const appliedAt = appliedAtById.get(applicationId);
    if (!appliedAt) {
      continue;
    }
    responseDiffTotal += toDays(firstResponseAt.getTime() - appliedAt.getTime());
    responseDiffCount += 1;
  }

  const movedPastApplied = applications.filter(
    (application) => application.status !== ApplicationStatus.APPLIED
  ).length;
  const responseRate =
    applications.length === 0 ? 0 : toPercent((movedPastApplied / applications.length) * 100);
  const avgTimeToResponse =
    responseDiffCount === 0 ? 0 : toPercent(responseDiffTotal / responseDiffCount);

  const matchScores = await prisma.aIMatchScore.findMany({
    where: {
      candidateUserId: userId,
      ...(user.tenantId ? { tenantId: user.tenantId } : {})
    },
    select: {
      matchedSkills: true
    }
  });

  const skillCount = new Map<string, number>();
  for (const row of matchScores) {
    const matchedSkills = parseJsonStringArray(row.matchedSkills);
    for (const skill of matchedSkills) {
      const normalized = skill.trim();
      if (!normalized) {
        continue;
      }
      skillCount.set(normalized, (skillCount.get(normalized) ?? 0) + 1);
    }
  }

  const topSkillsMatched = [...skillCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, matchCount]) => ({ skill, matchCount }));

  const careerScoreEvents = await prisma.activityLog.findMany({
    where: {
      userId,
      action: {
        in: ["user.profile_updated", "profile.updated", "student.profile_updated", "jobseeker.profile_updated"]
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      createdAt: true,
      payload: true
    },
    take: 100
  });

  const extractedScorePoints = careerScoreEvents
    .map((log) => {
      const score = extractCareerScoreFromPayload(log.payload);
      if (score === null) {
        return null;
      }
      return {
        date: log.createdAt.toISOString().slice(0, 10),
        score
      };
    })
    .filter((item): item is { date: string; score: number } => item !== null);

  const fallbackCareerScore =
    profile?.studentProfile?.careerScore ?? profile?.jobSeekerProfile?.careerScore ?? 0;
  const fallbackCareerScoreUpdatedAt =
    profile?.studentProfile?.updatedAt ?? profile?.jobSeekerProfile?.updatedAt ?? new Date();
  const careerScoreHistory =
    extractedScorePoints.length > 0
      ? extractedScorePoints.slice(-5)
      : [
          {
            date: fallbackCareerScoreUpdatedAt.toISOString().slice(0, 10),
            score: fallbackCareerScore
          }
        ];

  const analytics: StudentAnalytics = {
    applicationFunnel: {
      applied: applicationStatusCounts.APPLIED,
      screening: applicationStatusCounts.SCREENING,
      shortlisted: applicationStatusCounts.SHORTLISTED,
      interviewing: interviewingCount,
      offered: applicationStatusCounts.OFFERED,
      hired: applicationStatusCounts.HIRED,
      rejected: applicationStatusCounts.REJECTED
    },
    applicationsByMonth,
    topSkillsMatched,
    responseRate,
    avgTimeToResponse,
    profileViews,
    careerScoreHistory,
    savedJobsCount,
    interviewsCount
  };

  await logActivity({
    actorUserId: userId,
    tenantId: user.tenantId ?? undefined,
    action: "analytics.student.viewed",
    entityType: "Analytics",
    entityId: userId,
    metadata: {
      from: dateRange.fromIso,
      to: dateRange.toIso
    }
  });

  await cacheAnalytics(cacheKey, analytics);

  return analytics;
};

export const getRecruiterAnalytics = async (
  recruiterId: string,
  dateRange: DateRange
): Promise<RecruiterAnalytics> => {
  const user = await ensureUser(recruiterId);
  const cacheKey = createCacheKey(user.role, recruiterId, dateRange);
  const cached = await getCachedAnalytics<RecruiterAnalytics>(cacheKey);
  if (cached) {
    return cached;
  }

  const recruiterProfile = await prisma.recruiterProfile.findFirst({
    where: {
      userId: recruiterId,
      ...(user.tenantId ? { tenantId: user.tenantId } : {})
    },
    select: {
      id: true,
      companyName: true
    }
  });

  if (!recruiterProfile) {
    throw new ServiceError("Recruiter profile not found.", 404);
  }

  const jobs = await prisma.job.findMany({
    where: {
      createdByUserId: recruiterId,
      ...(user.tenantId ? { tenantId: user.tenantId } : {})
    },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true
    }
  });
  const jobIds = jobs.map((job) => job.id);

  const applications = jobIds.length
    ? await prisma.application.findMany({
        where: {
          jobId: {
            in: jobIds
          },
          appliedAt: {
            gte: dateRange.from,
            lte: dateRange.to
          }
        },
        include: {
          candidate: {
            select: {
              studentProfile: {
                select: {
                  collegeProfile: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          statusHistory: {
            orderBy: {
              createdAt: "asc"
            },
            select: {
              createdAt: true,
              toStatus: true
            }
          }
        }
      })
    : [];

  const interviewsScheduled = jobIds.length
    ? await prisma.interviewSlot.count({
        where: {
          jobId: {
            in: jobIds
          },
          scheduledStartAt: {
            gte: dateRange.from,
            lte: dateRange.to
          }
        }
      })
    : 0;

  const applicationsByStage = buildApplicationStatusRecord();
  for (const application of applications) {
    applicationsByStage[application.status] += 1;
  }

  const byJobCounter = new Map<string, number>();
  for (const application of applications) {
    byJobCounter.set(application.jobId, (byJobCounter.get(application.jobId) ?? 0) + 1);
  }

  const jobTitleById = new Map(jobs.map((job) => [job.id, job.title]));
  const applicationsByJob = [...byJobCounter.entries()]
    .map(([jobId, count]) => ({
      jobTitle: jobTitleById.get(jobId) ?? "Untitled Job",
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hires = applications.filter((application) => application.status === ApplicationStatus.HIRED);
  const timeToHireDays = hires
    .filter((application) => application.hiredAt)
    .map((application) =>
      toDays(
        (application.hiredAt?.getTime() ?? application.appliedAt.getTime()) -
          application.appliedAt.getTime()
      )
    );
  const timeToHire =
    timeToHireDays.length === 0
      ? 0
      : toPercent(timeToHireDays.reduce((sum, value) => sum + value, 0) / timeToHireDays.length);

  const offeredCount = applicationsByStage.OFFERED;
  const acceptedCount = applicationsByStage.ACCEPTED;
  const offerAcceptanceRate =
    offeredCount === 0 ? 0 : toPercent((acceptedCount / offeredCount) * 100);

  const collegeCounter = new Map<string, number>();
  for (const application of applications) {
    const college = application.candidate.studentProfile?.collegeProfile?.name;
    if (!college) {
      continue;
    }
    collegeCounter.set(college, (collegeCounter.get(college) ?? 0) + 1);
  }
  const topSourceColleges = [...collegeCounter.entries()]
    .map(([college, count]) => ({ college, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hiresByMonth = mergeIntoMonthSeries(
    hires
      .filter((application) => application.hiredAt)
      .map((application) => ({ at: application.hiredAt ?? application.appliedAt })),
    "count"
  ) as Array<{ month: string; count: number }>;

  const funnelStages: Array<{ stage: string; count: number }> = [
    { stage: "Applied", count: applicationsByStage.APPLIED },
    { stage: "Screening", count: applicationsByStage.SCREENING },
    { stage: "Shortlisted", count: applicationsByStage.SHORTLISTED },
    {
      stage: "Interviewing",
      count:
        applicationsByStage.INTERVIEW_R1 +
        applicationsByStage.INTERVIEW_R2 +
        applicationsByStage.INTERVIEW_R3
    },
    { stage: "Offered", count: applicationsByStage.OFFERED },
    { stage: "Hired", count: applicationsByStage.HIRED }
  ];
  const totalApplicationsReceived = applications.length;
  const conversionFunnel = funnelStages.map((row) => ({
    stage: row.stage,
    count: row.count,
    rate: totalApplicationsReceived === 0 ? 0 : toPercent((row.count / totalApplicationsReceived) * 100)
  }));

  const analytics: RecruiterAnalytics = {
    totalJobsPosted: jobs.length,
    activeJobs: jobs.filter((job) => job.status === "ACTIVE").length,
    totalApplicationsReceived,
    applicationsByStage,
    applicationsByJob,
    timeToHire,
    offerAcceptanceRate,
    topSourceColleges,
    interviewsScheduled,
    hiresByMonth,
    conversionFunnel
  };

  await logActivity({
    actorUserId: recruiterId,
    tenantId: user.tenantId ?? undefined,
    action: "analytics.recruiter.viewed",
    entityType: "Analytics",
    entityId: recruiterId,
    metadata: {
      from: dateRange.fromIso,
      to: dateRange.toIso
    }
  });

  await cacheAnalytics(cacheKey, analytics);
  return analytics;
};

export const getCollegeAnalytics = async (
  collegeAdminId: string,
  dateRange: DateRange
): Promise<CollegeAnalytics> => {
  const user = await ensureUser(collegeAdminId);
  const cacheKey = createCacheKey(user.role, collegeAdminId, dateRange);
  const cached = await getCachedAnalytics<CollegeAnalytics>(cacheKey);
  if (cached) {
    return cached;
  }

  const college = await prisma.collegeProfile.findFirst({
    where: {
      adminUserId: collegeAdminId,
      ...(user.tenantId ? { tenantId: user.tenantId } : {})
    },
    select: {
      id: true,
      tenantId: true,
      name: true
    }
  });

  if (!college) {
    throw new ServiceError("College profile not found.", 404);
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      collegeProfileId: college.id
    },
    select: {
      userId: true,
      isProfileComplete: true,
      careerScore: true,
      department: true
    }
  });
  const studentUserIds = students.map((student) => student.userId);

  const applications = studentUserIds.length
    ? await prisma.application.findMany({
        where: {
          candidateUserId: {
            in: studentUserIds
          },
          appliedAt: {
            gte: dateRange.from,
            lte: dateRange.to
          }
        },
        include: {
          job: {
            include: {
              recruiterProfile: {
                select: {
                  companyName: true
                }
              }
            }
          }
        }
      })
    : [];

  const hiredApplications = applications.filter(
    (application) => application.status === ApplicationStatus.HIRED
  );
  const uniqueAppliedStudents = new Set(applications.map((application) => application.candidateUserId));
  const uniqueHiredStudents = new Set(hiredApplications.map((application) => application.candidateUserId));

  const recruiterHireCounter = new Map<string, number>();
  for (const application of hiredApplications) {
    const company = application.job.recruiterProfile.companyName;
    recruiterHireCounter.set(company, (recruiterHireCounter.get(company) ?? 0) + 1);
  }

  const studentByUserId = new Map(students.map((student) => [student.userId, student]));
  const branchCounter = new Map<string, number>();
  for (const application of applications) {
    const branch = studentByUserId.get(application.candidateUserId)?.department ?? "Unspecified";
    branchCounter.set(branch, (branchCounter.get(branch) ?? 0) + 1);
  }

  const upcomingEvents = await prisma.placementEvent.count({
    where: {
      collegeProfileId: college.id,
      status: {
        in: ["UPCOMING", "ONGOING"]
      },
      startAt: {
        gte: new Date()
      }
    }
  });

  const invites = await prisma.invite.findMany({
    where: {
      collegeProfileId: college.id
    },
    select: {
      code: true,
      usedCount: true,
      maxUses: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });

  const totalStudents = students.length;
  const studentsWithProfile = students.filter((student) => student.isProfileComplete).length;
  const studentsApplied = uniqueAppliedStudents.size;
  const studentsHired = uniqueHiredStudents.size;
  const placementRate = totalStudents === 0 ? 0 : toPercent((studentsHired / totalStudents) * 100);
  const avgCareerScore =
    totalStudents === 0
      ? 0
      : toPercent(
          students.reduce((sum, student) => sum + student.careerScore, 0) / totalStudents
        );

  const topRecruiterConnections = [...recruiterHireCounter.entries()]
    .map(([company, hires]) => ({ company, hires }))
    .sort((a, b) => b.hires - a.hires)
    .slice(0, 5);

  const applicationsByBranch = [...branchCounter.entries()]
    .map(([branch, count]) => ({ branch, count }))
    .sort((a, b) => b.count - a.count);

  const inviteCodeUsage = invites.map((invite) => ({
    code: invite.code,
    used: invite.usedCount,
    max: invite.maxUses
  }));

  const analytics: CollegeAnalytics = {
    totalStudents,
    studentsWithProfile,
    studentsApplied,
    studentsHired,
    placementRate,
    topRecruiterConnections,
    applicationsByBranch,
    avgCareerScore,
    upcomingEvents,
    inviteCodeUsage
  };

  await logActivity({
    actorUserId: collegeAdminId,
    tenantId: college.tenantId,
    action: "analytics.college.viewed",
    entityType: "Analytics",
    entityId: college.id,
    metadata: {
      from: dateRange.fromIso,
      to: dateRange.toIso
    }
  });

  await cacheAnalytics(cacheKey, analytics);
  return analytics;
};

export const getPlatformAnalytics = async (
  adminUserId: string,
  dateRange: DateRange
): Promise<PlatformAnalytics> => {
  const user = await ensureUser(adminUserId);
  const cacheKey = createCacheKey(user.role, adminUserId, dateRange);
  const cached = await getCachedAnalytics<PlatformAnalytics>(cacheKey);
  if (cached) {
    return cached;
  }

  const last30Start = new Date();
  last30Start.setUTCDate(last30Start.getUTCDate() - 30);

  const [
    users,
    tenants,
    platformStatuses,
    referrals,
    courseRevenue,
    serviceInvoices,
    dailyActivityRows
  ] = await prisma.$transaction([
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: last30Start
        }
      },
      select: {
        createdAt: true,
        role: true
      }
    }),
    prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
            jobs: true,
            applications: true
          }
        }
      }
    }),
    prisma.application.findMany({
      select: {
        status: true
      }
    }),
    prisma.freelanceReferral.findMany({
      where: {
        status: {
          in: [ReferralStatus.TRIGGERED, ReferralStatus.INVOICED, ReferralStatus.PAID]
        }
      },
      include: {
        job: {
          select: {
            minCtc: true,
            maxCtc: true,
            recruiterProfile: {
              select: {
                companyName: true
              }
            }
          }
        }
      }
    }),
    prisma.courseRevenue.aggregate({
      _sum: {
        grossAmount: true
      }
    }),
    prisma.invoice.aggregate({
      where: {
        serviceRequestId: {
          not: null
        }
      },
      _sum: {
        totalAmount: true
      }
    }),
    prisma.activityLog.findMany({
      where: {
        createdAt: {
          gte: last30Start
        }
      },
      select: {
        action: true,
        createdAt: true,
        payload: true,
        userId: true
      }
    })
  ]);

  const userGrowthMap = new Map<string, number>();
  for (const entry of users) {
    const key = `${toDayKey(entry.createdAt)}::${entry.role}`;
    userGrowthMap.set(key, (userGrowthMap.get(key) ?? 0) + 1);
  }
  const userGrowth = [...userGrowthMap.entries()]
    .map(([key, count]) => {
      const [datePart, rolePart] = key.split("::");
      if (!datePart || !rolePart) {
        return null;
      }
      return {
        date: datePart,
        role: rolePart as UserRole,
        count
      };
    })
    .filter((row): row is { date: string; role: UserRole; count: number } => row !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const tenantStats = tenants.map((tenant) => ({
    tenantId: tenant.id,
    name: tenant.name,
    users: tenant._count.users,
    jobs: tenant._count.jobs,
    applications: tenant._count.applications
  }));

  const totalCommissions = referrals.reduce((sum, referral) => {
    const salaryBasis = referral.job.maxCtc ?? referral.job.minCtc ?? 0;
    if (referral.commissionType === "FLAT") {
      return sum + Math.round(referral.commissionValue);
    }
    return sum + Math.round((salaryBasis * referral.commissionValue) / 100);
  }, 0);

  const pendingPayouts = await prisma.invoice.aggregate({
    where: {
      referralId: {
        not: null
      },
      status: {
        not: "PAID"
      }
    },
    _sum: {
      totalAmount: true
    }
  });

  const jobFunnelPlatform = buildApplicationStatusRecord();
  for (const row of platformStatuses) {
    jobFunnelPlatform[row.status] += 1;
  }

  const [collegeRows, hiredCandidateRows] = await prisma.$transaction([
    prisma.collegeProfile.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            students: true
          }
        }
      }
    }),
    prisma.application.findMany({
      where: {
        status: ApplicationStatus.HIRED
      },
      select: {
        candidateUserId: true
      }
    })
  ]);

  const hiredCountByCandidateId = new Map<string, number>();
  for (const row of hiredCandidateRows) {
    hiredCountByCandidateId.set(
      row.candidateUserId,
      (hiredCountByCandidateId.get(row.candidateUserId) ?? 0) + 1
    );
  }

  const hiredCandidateUserIds = [...hiredCountByCandidateId.keys()];
  const hiredCandidateProfiles: Array<{ userId: string; collegeProfileId: string }> = [];

  const CANDIDATE_QUERY_CHUNK_SIZE = 2000;
  for (let index = 0; index < hiredCandidateUserIds.length; index += CANDIDATE_QUERY_CHUNK_SIZE) {
    const chunk = hiredCandidateUserIds.slice(index, index + CANDIDATE_QUERY_CHUNK_SIZE);
    if (chunk.length === 0) {
      continue;
    }

    const profiles = await prisma.studentProfile.findMany({
      where: {
        userId: {
          in: chunk
        }
      },
      select: {
        userId: true,
        collegeProfileId: true
      }
    });
    hiredCandidateProfiles.push(...profiles);
  }

  const collegeIdByCandidate = new Map(
    hiredCandidateProfiles.map((profile) => [profile.userId, profile.collegeProfileId])
  );
  const hiredCountByCollegeId = new Map<string, number>();
  for (const [candidateUserId, hiredCount] of hiredCountByCandidateId.entries()) {
    const collegeId = collegeIdByCandidate.get(candidateUserId);
    if (!collegeId) {
      continue;
    }
    hiredCountByCollegeId.set(
      collegeId,
      (hiredCountByCollegeId.get(collegeId) ?? 0) + hiredCount
    );
  }

  const topColleges = collegeRows.map((college) => {
    const studentCount = college._count.students;
    const hiredCount = hiredCountByCollegeId.get(college.id) ?? 0;

    return {
      name: college.name,
      placementRate: studentCount === 0 ? 0 : toPercent((hiredCount / studentCount) * 100)
    };
  });

  const topRecruiterMap = new Map<string, number>();
  for (const referral of referrals) {
    const company = referral.job.recruiterProfile.companyName;
    topRecruiterMap.set(company, (topRecruiterMap.get(company) ?? 0) + 1);
  }
  const topRecruiters = [...topRecruiterMap.entries()]
    .map(([company, hires]) => ({ company, hires }))
    .sort((a, b) => b.hires - a.hires)
    .slice(0, 10);

  const activeUsersByDay = new Map<string, Set<string>>();
  for (const row of dailyActivityRows) {
    if (!row.userId) {
      continue;
    }
    const dayKey = toDayKey(row.createdAt);
    const set = activeUsersByDay.get(dayKey) ?? new Set<string>();
    set.add(row.userId);
    activeUsersByDay.set(dayKey, set);
  }
  const dailyActiveUsers = [...activeUsersByDay.entries()]
    .map(([date, userIds]) => ({
      date,
      count: userIds.size
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const apiRequestLogs = dailyActivityRows.filter((row) => row.action === "api.request");
  const totalApiCalls = apiRequestLogs.length;
  const errorCalls = apiRequestLogs.filter((row) => {
    if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) {
      return false;
    }
    const statusCode = (row.payload as Record<string, unknown>).statusCode;
    return typeof statusCode === "number" && statusCode >= 500;
  }).length;
  const responseTimes = dailyActivityRows
    .map((row) => {
      if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) {
        return null;
      }
      const value = (row.payload as Record<string, unknown>).durationMs;
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value !== null);

  const systemHealth = {
    totalApiCalls,
    errorRate: totalApiCalls === 0 ? 0 : toPercent((errorCalls / totalApiCalls) * 100),
    avgResponseTime:
      responseTimes.length === 0
        ? 0
        : toPercent(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
  };

  const analytics: PlatformAnalytics = {
    userGrowth,
    tenantStats,
    revenueMetrics: {
      totalCommissions,
      totalCourseRevenue: courseRevenue._sum.grossAmount ?? 0,
      totalServiceRevenue: serviceInvoices._sum.totalAmount ?? 0,
      pendingPayouts: pendingPayouts._sum.totalAmount ?? 0
    },
    jobFunnelPlatform,
    topColleges: topColleges.sort((a, b) => b.placementRate - a.placementRate).slice(0, 10),
    topRecruiters,
    dailyActiveUsers,
    systemHealth
  };

  await logActivity({
    actorUserId: adminUserId,
    action: "analytics.platform.viewed",
    entityType: "Analytics",
    entityId: "platform",
    metadata: {
      from: dateRange.fromIso,
      to: dateRange.toIso
    }
  });

  await cacheAnalytics(cacheKey, analytics);
  return analytics;
};

export const getFreelanceAnalytics = async (
  freelancerId: string,
  dateRange: DateRange
): Promise<FreelanceAnalytics> => {
  const user = await ensureUser(freelancerId);
  const cacheKey = createCacheKey(user.role, freelancerId, dateRange);
  const cached = await getCachedAnalytics<FreelanceAnalytics>(cacheKey);
  if (cached) {
    return cached;
  }

  const profile = await prisma.freelanceRecruiterProfile.findFirst({
    where: {
      userId: freelancerId,
      ...(user.tenantId ? { tenantId: user.tenantId } : {})
    },
    select: {
      id: true,
      tenantId: true
    }
  });

  if (!profile) {
    throw new ServiceError("Freelance recruiter profile not found.", 404);
  }

  const referrals = await prisma.freelanceReferral.findMany({
    where: {
      tenantId: profile.tenantId,
      freelanceRecruiterProfileId: profile.id,
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to
      }
    },
    include: {
      job: {
        include: {
          recruiterProfile: {
            select: {
              companyName: true
            }
          }
        }
      }
    }
  });

  const referralIds = referrals.map((referral) => referral.id);
  const invoices = referralIds.length
    ? await prisma.invoice.findMany({
        where: {
          referralId: {
            in: referralIds
          }
        },
        select: {
          createdAt: true,
          totalAmount: true,
          status: true,
          referralId: true
        }
      })
    : [];

  const referralsByStatus = buildReferralStatusRecord();
  for (const referral of referrals) {
    referralsByStatus[referral.status] += 1;
  }

  const invoicesByMonth = new Map<string, number>();
  for (const invoice of invoices) {
    const key = toMonthKey(invoice.createdAt);
    invoicesByMonth.set(key, (invoicesByMonth.get(key) ?? 0) + invoice.totalAmount);
  }
  const commissionsByMonth = buildMonthSeries(MONTHS_WINDOW).map((month) => ({
    month: month.label,
    amount: invoicesByMonth.get(month.key) ?? 0
  }));

  const topJobsCounter = new Map<string, { jobTitle: string; company: string; referrals: number }>();
  for (const referral of referrals) {
    const key = referral.jobId;
    const current = topJobsCounter.get(key);
    if (current) {
      current.referrals += 1;
      topJobsCounter.set(key, current);
      continue;
    }
    topJobsCounter.set(key, {
      jobTitle: referral.job.title,
      company: referral.job.recruiterProfile.companyName,
      referrals: 1
    });
  }
  const topJobs = [...topJobsCounter.values()]
    .sort((a, b) => b.referrals - a.referrals)
    .slice(0, 5);

  const totalReferrals = referrals.length;
  const triggeredCount =
    referralsByStatus.TRIGGERED + referralsByStatus.INVOICED + referralsByStatus.PAID;
  const conversionRate =
    totalReferrals === 0 ? 0 : toPercent((triggeredCount / totalReferrals) * 100);
  const totalEarned = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const pendingPayout = invoices
    .filter((invoice) => invoice.status !== "PAID")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  const analytics: FreelanceAnalytics = {
    totalReferrals,
    referralsByStatus,
    commissionsByMonth,
    topJobs,
    conversionRate,
    pendingPayout,
    totalEarned
  };

  await logActivity({
    actorUserId: freelancerId,
    tenantId: profile.tenantId,
    action: "analytics.freelance.viewed",
    entityType: "Analytics",
    entityId: freelancerId,
    metadata: {
      from: dateRange.fromIso,
      to: dateRange.toIso
    }
  });

  await cacheAnalytics(cacheKey, analytics);
  return analytics;
};

export type AnalyticsPaginatedResponse<T> = PaginatedResponse<T[]>;
