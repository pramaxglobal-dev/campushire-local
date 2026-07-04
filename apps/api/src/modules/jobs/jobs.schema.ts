import { z } from "zod";
import { CommissionTrigger, CommissionType, JobStatus, JobType, WorkMode } from "@campushire/types";

const SkillRequirementSchema = z.object({
  name: z.string().trim().min(1),
  isMandatory: z.boolean().default(false)
});

const ScreeningQuestionSchema = z.object({
  question: z.string().trim().min(1),
  type: z.string().trim().min(1).default("text"),
  isRequired: z.boolean().default(true)
});

export const CreateJobSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  jobType: z.nativeEnum(JobType),
  workMode: z.nativeEnum(WorkMode),
  locationCity: z.string().trim().min(1).optional(),
  locationState: z.string().trim().min(1).optional(),
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  salaryMax: z.coerce.number().int().nonnegative().optional(),
  skillsRequired: z.array(SkillRequirementSchema).default([]),
  openings: z.coerce.number().int().positive().default(1),
  experienceMin: z.coerce.number().int().nonnegative().optional(),
  experienceMax: z.coerce.number().int().nonnegative().optional(),
  applicationDeadline: z.coerce.date().optional(),
  screeningQuestions: z.array(ScreeningQuestionSchema).default([]),
  targetCollegeIds: z.array(z.string().trim().min(1)).optional(),
  commissionPct: z.coerce.number().nonnegative().max(100).optional(),
  commissionType: z.nativeEnum(CommissionType).optional(),
  commissionTrigger: z.nativeEnum(CommissionTrigger).optional(),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT)
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const JobFiltersSchema = z.object({
  jobType: z.nativeEnum(JobType).optional(),
  workMode: z.nativeEnum(WorkMode).optional(),
  locationCity: z.string().trim().optional(),
  locationState: z.string().trim().optional(),
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  salaryMax: z.coerce.number().int().nonnegative().optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  search: z.string().trim().optional(),
  myJobsOnly: z.coerce.boolean().optional(),
  hasCommission: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["newest", "salary", "relevance"]).default("newest"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export const JobIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const RejectJobSchema = z.object({
  reason: z.string().trim().min(1).max(2000)
});

export const JobFeedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateJobDto = z.infer<typeof CreateJobSchema>;
export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;
export type JobFilters = z.infer<typeof JobFiltersSchema>;
