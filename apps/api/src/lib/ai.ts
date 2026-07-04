import { Prisma } from "@prisma/client";
import { JobType, SkillLevel, UserRole, WorkMode, type CandidateProfile, type JobRequirement, type MatchResponse, type MatchResult } from "@campushire/types";
import { prisma } from "./prisma";
import { resolveUserTenantOrNull } from "./tenant";
import { computeAndWriteCareerScoreForUser } from "./career-score";
import { notifyJobMatch } from "./notification";

type JsonRecord = Record<string, unknown>;
const toInputJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const parseSkillLevel = (value: unknown): SkillLevel => {
  if (typeof value !== "string") {
    return SkillLevel.BEGINNER;
  }
  if (value in SkillLevel) {
    return value as SkillLevel;
  }
  return SkillLevel.BEGINNER;
};

const parseSkills = (value: unknown): Array<{ name: string; level: SkillLevel }> => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") {
          return { name: entry, level: SkillLevel.BEGINNER };
        }
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          const record = entry as JsonRecord;
          if (typeof record.name !== "string") {
            return null;
          }
          return {
            name: record.name,
            level: parseSkillLevel(record.level)
          };
        }
        return null;
      })
      .filter((entry): entry is { name: string; level: SkillLevel } => entry !== null);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as JsonRecord;
    const values: Array<{ name: string; level: SkillLevel }> = [];
    for (const item of Object.values(record)) {
      if (typeof item === "string") {
        values.push({ name: item, level: SkillLevel.BEGINNER });
      }
    }
    return values;
  }
  return [];
};

const parseStringArray = (value: unknown): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  }
  return [];
};

const parseJobSkillsRequired = (
  value: unknown
): Array<{ name: string; isMandatory: boolean; level?: SkillLevel }> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const raw = (value as JsonRecord).skills;
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: Array<{ name: string; isMandatory: boolean; level?: SkillLevel }> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const row = entry as JsonRecord;
    if (typeof row.name !== "string") {
      continue;
    }
    parsed.push({
      name: row.name,
      isMandatory: row.isMandatory === true,
      level: row.level ? parseSkillLevel(row.level) : undefined
    });
  }
  return parsed;
};

const getCandidateFromDb = async (candidateUserId: string): Promise<CandidateProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: candidateUserId },
    include: {
      studentProfile: true,
      jobSeekerProfile: true
    }
  });

  if (!user) {
    throw new Error("Candidate not found for AI matching.");
  }

  const student = user.studentProfile;
  const seeker = user.jobSeekerProfile;
  const skills = parseSkills(student?.skills ?? seeker?.skills ?? null);
  const preferredLocations = parseStringArray(
    (student?.preferredLocations ?? seeker?.preferredLocations ?? []) as unknown
  );

  const preferredRoles =
    user.role === UserRole.STUDENT
      ? ["intern", "graduate", "trainee"]
      : ["engineer", "developer", "analyst", "manager"];

  return {
    userId: user.id,
    skills,
    preferredRoles,
    preferredLocations,
    workModePref: (student?.preferredWorkMode ?? seeker?.preferredWorkMode ?? WorkMode.ANY) as
      | WorkMode
      | "ANY",
    expectedSalaryMin: student?.expectedCtcMin ?? seeker?.expectedCtcMin ?? null,
    expectedSalaryMax: student?.expectedCtcMax ?? seeker?.expectedCtcMax ?? null,
    cgpa: student?.cgpa ?? null,
    experienceYears:
      seeker?.totalExperienceMonths !== null && seeker?.totalExperienceMonths !== undefined
        ? Math.max(0, Math.floor(seeker.totalExperienceMonths / 12))
        : null
  };
};

const getJobsForMatching = async (jobIds: string[]): Promise<JobRequirement[]> => {
  const jobs = await prisma.job.findMany({
    where: {
      id: { in: jobIds }
    },
    select: {
      id: true,
      title: true,
      skillsRequired: true,
      locationCity: true,
      locationState: true,
      workMode: true,
      minCtc: true,
      maxCtc: true,
      jobType: true,
      experienceMinMonths: true,
      experienceMaxMonths: true
    }
  });

  return jobs.map((job) => ({
    jobId: job.id,
    title: job.title,
    skillsRequired: parseJobSkillsRequired(job.skillsRequired),
    locationCity: job.locationCity,
    locationState: job.locationState,
    workMode: job.workMode,
    salaryMin: job.minCtc ?? null,
    salaryMax: job.maxCtc ?? null,
    jobType: job.jobType as JobType,
    experienceMin:
      job.experienceMinMonths !== null && job.experienceMinMonths !== undefined
        ? Math.max(0, Math.floor(job.experienceMinMonths / 12))
        : null,
    experienceMax:
      job.experienceMaxMonths !== null && job.experienceMaxMonths !== undefined
        ? Math.max(0, Math.floor(job.experienceMaxMonths / 12))
        : null
  }));
};

const persistMatchResults = async (
  candidateUserId: string,
  tenantId: string | null,
  results: MatchResult[]
): Promise<Array<{ jobId: string; candidateUserId: string; score: number }>> => {
  const persisted: Array<{ jobId: string; candidateUserId: string; score: number }> = [];
  for (const result of results) {
    const score = Math.round(result.matchScore);
    const row = await prisma.aIMatchScore.upsert({
      where: {
        jobId_candidateUserId: {
          jobId: result.jobId,
          candidateUserId
        }
      },
      update: {
        tenantId,
        score,
        matchedSkills: toInputJson([]),
        missingSkills: toInputJson(result.missingSkills),
        reasoning: toInputJson({
          skillMatchPct: result.skillMatchPct,
          recommendedCourseIds: result.recommendedCourseIds
        }),
        calculatedAt: new Date()
      },
      create: {
        tenantId,
        jobId: result.jobId,
        candidateUserId,
        score,
        matchedSkills: toInputJson([]),
        missingSkills: toInputJson(result.missingSkills),
        reasoning: toInputJson({
          skillMatchPct: result.skillMatchPct,
          recommendedCourseIds: result.recommendedCourseIds
        }),
        calculatedAt: new Date()
      },
      select: {
        jobId: true,
        candidateUserId: true,
        score: true
      }
    });
    persisted.push(row);
  }
  return persisted;
};

export async function computeJobMatches(
  candidate: CandidateProfile,
  jobIds: string[]
): Promise<MatchResult[]> {
  const candidateProfile = await getCandidateFromDb(candidate.userId);
  const jobs = await getJobsForMatching(jobIds);

  if (jobs.length === 0) {
    return [];
  }

  const tenantId = await resolveUserTenantOrNull(candidate.userId);
  const results = jobs.map((job) => calculateLocalSkillMatch(candidateProfile, job));

  await persistMatchResults(candidate.userId, tenantId, results);

  return results;
}

export async function computeCareerScore(userId: string): Promise<number> {
  return computeAndWriteCareerScoreForUser(userId);
}

type MatchCandidate = Prisma.UserGetPayload<{
  include: {
    studentProfile: true;
    jobSeekerProfile: true;
  };
}>;

const buildCandidateProfile = (candidate: MatchCandidate): CandidateProfile => ({
  userId: candidate.id,
  skills: parseSkills(candidate.studentProfile?.skills ?? candidate.jobSeekerProfile?.skills ?? null),
  preferredRoles:
    candidate.role === UserRole.STUDENT
      ? ["intern", "graduate", "trainee"]
      : ["engineer", "developer", "analyst", "manager"],
  preferredLocations: parseStringArray(
    candidate.studentProfile?.preferredLocations ?? candidate.jobSeekerProfile?.preferredLocations ?? []
  ),
  workModePref:
    (candidate.studentProfile?.preferredWorkMode ??
      candidate.jobSeekerProfile?.preferredWorkMode ??
      WorkMode.ANY) as WorkMode | "ANY",
  expectedSalaryMin:
    candidate.studentProfile?.expectedCtcMin ?? candidate.jobSeekerProfile?.expectedCtcMin ?? null,
  expectedSalaryMax:
    candidate.studentProfile?.expectedCtcMax ?? candidate.jobSeekerProfile?.expectedCtcMax ?? null,
  cgpa: candidate.studentProfile?.cgpa ?? null,
  experienceYears:
    candidate.jobSeekerProfile?.totalExperienceMonths !== undefined &&
    candidate.jobSeekerProfile?.totalExperienceMonths !== null
      ? Math.floor(candidate.jobSeekerProfile.totalExperienceMonths / 12)
      : null
});

const calculateLocalSkillMatch = (candidate: CandidateProfile, job: JobRequirement): MatchResult => {
  const requiredSkills = job.skillsRequired.map((skill) => String(skill.name));
  if (requiredSkills.length === 0) {
    return {
      jobId: job.jobId,
      matchScore: 0,
      skillMatchPct: 0,
      missingSkills: [],
      recommendedCourseIds: []
    };
  }

  const candidateSkills = new Set(candidate.skills.map((skill) => skill.name.toLowerCase()));
  const missingSkills = requiredSkills.filter((skill) => !candidateSkills.has(skill.toLowerCase()));
  const matchedCount = requiredSkills.length - missingSkills.length;
  const matchScore = Math.round((matchedCount / requiredSkills.length) * 100);

  return {
    jobId: job.jobId,
    matchScore,
    skillMatchPct: matchScore,
    missingSkills,
    recommendedCourseIds: []
  };
};

const computeFallbackBatchMatches = (
  candidates: MatchCandidate[],
  targetJob: JobRequirement
): MatchResponse[] =>
  candidates.map((candidate) => {
    const profile = buildCandidateProfile(candidate);
    return {
      candidateId: candidate.id,
      results: [calculateLocalSkillMatch(profile, targetJob)],
      computedAt: new Date().toISOString()
    };
  });

export async function triggerBatchMatching(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      tenantId: true,
      status: true
    }
  });

  if (!job || job.status !== "ACTIVE") {
    return;
  }

  const candidates = await prisma.user.findMany({
    where: {
      tenantId: job.tenantId,
      role: {
        in: [UserRole.STUDENT, UserRole.JOB_SEEKER]
      },
      isActive: true,
      isApproved: true,
      isEmailVerified: true
    },
    include: {
      studentProfile: true,
      jobSeekerProfile: true
    },
    take: 100
  });

  if (candidates.length === 0) {
    return;
  }

  const jobs = await getJobsForMatching([jobId]);
  const targetJob = jobs[0];
  if (!targetJob) {
    return;
  }

  const responses = computeFallbackBatchMatches(candidates, targetJob);

  const fullJob = await prisma.job.findUnique({ where: { id: jobId } });
  if (!fullJob) {
    return;
  }
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  for (const response of responses) {
    const persisted = await persistMatchResults(response.candidateId, job.tenantId, response.results);
    const candidate = candidatesById.get(response.candidateId);
    if (!candidate) {
      continue;
    }
    for (const row of persisted) {
      if (row.jobId === jobId && row.score >= 40) {
        await notifyJobMatch(candidate, fullJob, row.score);
      }
    }
  }
}
