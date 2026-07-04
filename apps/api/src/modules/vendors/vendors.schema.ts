import { z } from "zod";
import { ServiceRequestStatus, ServiceRequestType, UserRole, VendorType } from "@campushire/types";

export const VendorFiltersSchema = z.object({
  vendorType: z.nativeEnum(VendorType).optional(),
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  isVerified: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const VendorIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const CreateServiceRequestSchema = z.object({
  vendorId: z.string().trim().min(1),
  requestType: z.nativeEnum(ServiceRequestType),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  candidateUserIds: z.array(z.string().trim().min(1)).default([]),
  documentsRequired: z.array(z.string().trim().min(1)).default([]),
  deadline: z.coerce.date().optional()
});

export const UpdateServiceRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  expectedCost: z.coerce.number().int().nonnegative().optional(),
  finalCost: z.coerce.number().int().nonnegative().optional(),
  dueDate: z.coerce.date().optional(),
  status: z.nativeEnum(ServiceRequestStatus).optional(),
  payload: z.record(z.unknown()).optional()
});

export const RespondServiceRequestSchema = z.object({
  action: z.enum(["accept", "reject"]),
  note: z.string().trim().max(2000).optional()
});

export const CompleteServiceRequestSchema = z.object({
  note: z.string().trim().min(1).max(2000)
});

export const RateVendorSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  review: z.string().trim().min(1).max(2000)
});

export const ServiceRequestIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const ServiceRequestQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(ServiceRequestStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type VendorFilters = z.infer<typeof VendorFiltersSchema>;
export type CreateServiceRequestDto = z.infer<typeof CreateServiceRequestSchema>;
export type UpdateServiceRequestDto = z.infer<typeof UpdateServiceRequestSchema>;
