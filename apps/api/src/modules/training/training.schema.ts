import { z } from "zod";
import { CourseLevel, CourseMode } from "@campushire/types";

export const CourseFiltersSchema = z.object({
  level: z.nativeEnum(CourseLevel).optional(),
  mode: z.nativeEnum(CourseMode).optional(),
  skillsCovered: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().trim().min(1).optional(),
  trainingPartnerId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const CourseIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const CreateCourseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  skillsCovered: z.array(z.string().trim().min(1)).default([]),
  durationHours: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().int().nonnegative(),
  currency: z.string().trim().min(3).max(8).default("INR"),
  seats: z.coerce.number().int().positive().optional(),
  level: z.nativeEnum(CourseLevel),
  mode: z.nativeEnum(CourseMode)
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

export const UpdateEnrollmentProgressSchema = z.object({
  enrollmentId: z.string().trim().min(1),
  progressPct: z.coerce.number().int().min(0).max(100)
});

export type CourseFilters = z.infer<typeof CourseFiltersSchema>;
export type CreateCourseDto = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseDto = z.infer<typeof UpdateCourseSchema>;
