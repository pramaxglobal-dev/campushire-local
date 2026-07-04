import { z } from "zod";
import { NotificationChannel, NotificationType, UserRole, WorkMode } from "@campushire/types";

export const UpdateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(10).max(20).optional(),
  headline: z.string().trim().min(1).max(180).optional(),
  bio: z.string().trim().min(1).max(5000).optional(),
  profileVisibility: z.enum(["PUBLIC", "COLLEGE_ONLY", "PRIVATE"]).optional(),
  studentProfile: z
    .object({
      enrollmentNumber: z.string().trim().min(1).max(120).optional(),
      program: z.string().trim().min(1).max(150).optional(),
      department: z.string().trim().min(1).max(150).optional(),
      yearOfStudy: z.number().int().min(1).max(10).optional(),
      graduationYear: z.number().int().min(2000).max(2100).optional(),
      cgpa: z.number().min(0).max(10).optional(),
      skills: z.record(z.unknown()).or(z.array(z.unknown())).optional(),
      resumeUrl: z.string().url().optional(),
      preferredWorkMode: z.nativeEnum(WorkMode).optional(),
      preferredLocations: z.array(z.string()).optional(),
      expectedCtcMin: z.number().int().positive().optional(),
      expectedCtcMax: z.number().int().positive().optional(),
      linkedInUrl: z.string().url().optional(),
      githubUrl: z.string().url().optional(),
      portfolioUrl: z.string().url().optional()
    })
    .optional(),
  jobSeekerProfile: z
    .object({
      totalExperienceMonths: z.number().int().min(0).optional(),
      currentCity: z.string().trim().min(1).max(120).optional(),
      preferredLocations: z.array(z.string()).optional(),
      skills: z.record(z.unknown()).or(z.array(z.unknown())).optional(),
      expectedCtcMin: z.number().int().positive().optional(),
      expectedCtcMax: z.number().int().positive().optional(),
      availableFrom: z.coerce.date().optional(),
      resumeUrl: z.string().url().optional(),
      preferredWorkMode: z.nativeEnum(WorkMode).optional()
    })
    .optional(),
  recruiterProfile: z
    .object({
      companyName: z.string().trim().min(1).max(200).optional(),
      industry: z.string().trim().min(1).max(120).optional(),
      website: z.string().url().optional(),
      headquarters: z.string().trim().min(1).max(120).optional(),
      hiringNow: z.boolean().optional(),
      about: z.string().trim().min(1).max(5000).optional(),
      culture: z.string().trim().min(1).max(5000).optional()
    })
    .optional(),
  freelanceRecruiterProfile: z
    .object({
      agencyName: z.string().trim().min(1).max(200).optional(),
      isAgency: z.boolean().optional(),
      specialization: z.record(z.unknown()).or(z.array(z.unknown())).optional(),
      defaultCommissionValue: z.number().min(0).optional()
    })
    .optional(),
  vendorProfile: z
    .object({
      businessName: z.string().trim().min(1).max(200).optional(),
      serviceAreas: z.array(z.string()).optional(),
      basePrice: z.number().min(0).optional(),
      turnaroundHours: z.number().int().positive().optional(),
      about: z.string().trim().min(1).max(5000).optional()
    })
    .optional(),
  trainingPartnerProfile: z
    .object({
      organizationName: z.string().trim().min(1).max(200).optional(),
      website: z.string().url().optional(),
      about: z.string().trim().min(1).max(5000).optional()
    })
    .optional(),
  collegeProfile: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      naacGrade: z.string().trim().min(1).max(20).optional(),
      streams: z.record(z.unknown()).or(z.array(z.unknown())).optional(),
      website: z.string().url().optional(),
      placementEmail: z.string().email().optional(),
      placementPhone: z.string().trim().min(10).max(20).optional(),
      address: z.string().trim().min(1).max(5000).optional(),
      city: z.string().trim().min(1).max(120).optional(),
      state: z.string().trim().min(1).max(120).optional(),
      pincode: z.string().trim().min(4).max(12).optional(),
      openForPlacement: z.boolean().optional(),
      about: z.string().trim().min(1).max(5000).optional()
    })
    .optional()
});

export const NotificationPreferenceSchema = z.object({
  preferences: z
    .array(
      z.object({
        type: z.nativeEnum(NotificationType),
        channel: z.nativeEnum(NotificationChannel),
        isEnabled: z.boolean()
      })
    )
    .min(1)
});

export const ActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const UpdateProfileRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
export type NotificationPrefDto = z.infer<typeof NotificationPreferenceSchema>;
export type ActivityQueryDto = z.infer<typeof ActivityQuerySchema>;