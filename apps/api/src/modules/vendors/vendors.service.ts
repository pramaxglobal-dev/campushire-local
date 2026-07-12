import { Prisma } from "@prisma/client";
import {
  NotificationChannel,
  NotificationType,
  ServiceRequestStatus,
  ServiceRequestType,
  UserRole,
  VerificationStatus,
  type PaginatedResponse,
  type ServiceRequest,
  type VendorProfile
} from "@campushire/types";
import { sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import { sendNotification } from "../../lib/notification";
import { resolveUserTenantContext as getUserWithTenant } from "../../lib/tenant";
import type {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  VendorFilters
} from "./vendors.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

interface VendorStats {
  totalRequests: number;
  completedRequests: number;
  avgRating: number;
  totalRevenue: number;
}

type VendorDetail = VendorProfile & { recentReviews: ServiceRequest[] };

const toInputJson = (value: Record<string, unknown>): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const parseStringArray = (value: Prisma.JsonValue | null): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).filter(
      (item): item is string => typeof item === "string"
    );
  }
  return [];
};

const parseRatingFromPayload = (payload: Prisma.JsonValue | null): number | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const raw = (payload as Record<string, unknown>).vendorRating;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  return null;
};

export const listVendors = async (
  filters: VendorFilters,
  page: number,
  limit: number,
  tenantId?: string | null
): Promise<PaginatedResponse<VendorProfile[]>> => {
  const where: Prisma.VendorProfileWhereInput = {
    tenantId: tenantId ?? { not: "" },
    vendorType: filters.vendorType,
    isVerified: filters.isVerified,
    isActive: true
  };

  const [total, rows] = await prisma.$transaction([
    prisma.vendorProfile.count({ where }),
    prisma.vendorProfile.findMany({
      where,
      orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const filtered = rows.filter((row) => {
    const areas = parseStringArray(row.serviceAreas).map((value) => value.toLowerCase());
    const cityPass = filters.city ? areas.some((entry) => entry.includes(filters.city!.toLowerCase())) : true;
    const statePass = filters.state
      ? areas.some((entry) => entry.includes(filters.state!.toLowerCase()))
      : true;
    return cityPass && statePass;
  });

  return {
    success: true,
    data: filtered,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const getVendorDetail = async (
  vendorId: string,
  tenantId?: string | null
): Promise<VendorDetail> => {
  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      id: vendorId,
      tenantId: tenantId ?? { not: "" },
      isActive: true
    }
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found.", 404);
  }

  const recentReviews = await prisma.serviceRequest.findMany({
    where: {
      tenantId: vendor.tenantId,
      vendorProfileId: vendor.id,
      status: ServiceRequestStatus.COMPLETED
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: 10
  });

  return {
    ...vendor,
    recentReviews
  };
};

export const createServiceRequest = async (
  requesterId: string,
  dto: CreateServiceRequestDto
): Promise<ServiceRequest> => {
  const requester = await getUserWithTenant(requesterId);

  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      id: dto.vendorId,
      tenantId: requester.tenantId,
      isActive: true
    },
    include: {
      user: {
        select: {
          id: true
        }
      }
    }
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found.", 404);
  }

  const recruiterProfile =
    requester.role === UserRole.CORPORATE_RECRUITER
      ? await prisma.recruiterProfile.findFirst({
          where: {
            userId: requesterId,
            tenantId: requester.tenantId
          },
          select: { id: true }
        })
      : null;

  const payload = {
    candidateUserIds: dto.candidateUserIds,
    documentsRequired: dto.documentsRequired
  };

  const created = await prisma.serviceRequest.create({
    data: {
      tenantId: requester.tenantId,
      requesterUserId: requester.id,
      assignedToUserId: vendor.userId,
      vendorProfileId: vendor.id,
      recruiterProfileId: recruiterProfile?.id ?? null,
      type: dto.requestType,
      status: ServiceRequestStatus.PENDING,
      title: sanitizeInput(dto.title),
      description: sanitizeInput(dto.description),
      payload: toInputJson(payload),
      dueDate: dto.deadline ?? null
    }
  });

  await sendNotification({
    userId: vendor.user.id,
    type: NotificationType.SYSTEM,
    title: "New Service Request",
    body: `A new ${dto.requestType.replaceAll("_", " ")} request is awaiting your response.`,
    contextType: "SERVICE_REQUEST",
    contextId: created.id,
    actionUrl: "/dashboard/vendor",
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });

  await logActivity({
    actorUserId: requester.id,
    tenantId: requester.tenantId,
    action: "vendor.service_request_created",
    entityType: "ServiceRequest",
    entityId: created.id
  });

  return created;
};

export const updateServiceRequest = async (
  requestId: string,
  userId: string,
  dto: UpdateServiceRequestDto
): Promise<ServiceRequest> => {
  const actor = await getUserWithTenant(userId);
  const existing = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      tenantId: actor.tenantId
    }
  });

  if (!existing) {
    throw new ServiceError("Service request not found.", 404);
  }

  const isOwner = existing.requesterUserId === userId;
  const isAssigned = existing.assignedToUserId === userId;
  if (!isOwner && !isAssigned) {
    throw new ServiceError("Forbidden", 403);
  }

  const mergedPayload: Record<string, unknown> =
    existing.payload && typeof existing.payload === "object" && !Array.isArray(existing.payload)
      ? { ...(existing.payload as Record<string, unknown>) }
      : {};

  if (dto.payload) {
    Object.assign(mergedPayload, dto.payload);
  }

  const updated = await prisma.serviceRequest.update({
    where: { id: existing.id },
    data: {
      title: dto.title ? sanitizeInput(dto.title) : undefined,
      description: dto.description ? sanitizeInput(dto.description) : undefined,
      expectedCost: dto.expectedCost,
      finalCost: dto.finalCost,
      dueDate: dto.dueDate,
      status: dto.status,
      payload: dto.payload ? toInputJson(mergedPayload) : undefined
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: actor.tenantId,
    action: "vendor.service_request_updated",
    entityType: "ServiceRequest",
    entityId: updated.id
  });

  return updated;
};

export const respondToServiceRequest = async (
  requestId: string,
  vendorId: string,
  action: "accept" | "reject",
  note?: string
): Promise<ServiceRequest> => {
  const vendorUser = await getUserWithTenant(vendorId);
  const vendorProfile = await prisma.vendorProfile.findFirst({
    where: {
      userId: vendorId,
      tenantId: vendorUser.tenantId
    },
    select: { id: true }
  });

  if (!vendorProfile) {
    throw new ServiceError("Vendor profile not found.", 404);
  }

  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      tenantId: vendorUser.tenantId,
      vendorProfileId: vendorProfile.id
    }
  });

  if (!request) {
    throw new ServiceError("Service request not found.", 404);
  }

  if (request.status !== ServiceRequestStatus.PENDING) {
    throw new ServiceError("Only pending requests can be responded to.", 400);
  }

  const nextStatus =
    action === "accept" ? ServiceRequestStatus.ACCEPTED : ServiceRequestStatus.REJECTED;

  const updated = await prisma.serviceRequest.update({
    where: { id: request.id },
    data: {
      status: nextStatus,
      acceptedAt: action === "accept" ? new Date() : undefined,
      payload: note
        ? toInputJson({
            ...(request.payload && typeof request.payload === "object" && !Array.isArray(request.payload)
              ? (request.payload as Record<string, unknown>)
              : {}),
            vendorResponseNote: sanitizeInput(note)
          })
        : undefined
    }
  });

  if (request.type === ServiceRequestType.DOCUMENT_VERIFICATION && action === "reject") {
    const verification = await prisma.documentVerification.findFirst({ where: { serviceRequestId: request.id } });
    if (verification) {
      await prisma.$transaction([
        prisma.documentVerification.update({
          where: { id: verification.id },
          data: {
            status: VerificationStatus.REJECTED,
            reviewerUserId: vendorId,
            comment: note ? sanitizeInput(note) : null
          }
        }),
        ...(verification.userDocumentId ? [prisma.userDocument.update({
          where: { id: verification.userDocumentId },
          data: { verificationStatus: VerificationStatus.REJECTED }
        })] : [])
      ]);
    }
  }

  await sendNotification({
    userId: request.requesterUserId,
    type: NotificationType.SYSTEM,
    title: action === "accept" ? "Service Request Accepted" : "Service Request Rejected",
    body:
      action === "accept"
        ? `Your request "${request.title}" has been accepted by the vendor.`
        : `Your request "${request.title}" has been rejected by the vendor.`,
    contextType: "SERVICE_REQUEST",
    contextId: request.id,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });

  await logActivity({
    actorUserId: vendorId,
    tenantId: vendorUser.tenantId,
    action:
      action === "accept" ? "vendor.service_request_accepted" : "vendor.service_request_rejected",
    entityType: "ServiceRequest",
    entityId: request.id
  });

  return updated;
};

export const completeServiceRequest = async (
  requestId: string,
  vendorId: string,
  note: string
): Promise<ServiceRequest> => {
  const vendorUser = await getUserWithTenant(vendorId);
  const vendorProfile = await prisma.vendorProfile.findFirst({
    where: {
      userId: vendorId,
      tenantId: vendorUser.tenantId
    },
    select: { id: true }
  });

  if (!vendorProfile) {
    throw new ServiceError("Vendor profile not found.", 404);
  }

  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      tenantId: vendorUser.tenantId,
      vendorProfileId: vendorProfile.id
    }
  });

  if (!request) {
    throw new ServiceError("Service request not found.", 404);
  }

  if (
    request.status !== ServiceRequestStatus.ACCEPTED &&
    request.status !== ServiceRequestStatus.IN_PROGRESS
  ) {
    throw new ServiceError("Only accepted or in-progress requests can be completed.", 400);
  }

  const updated = await prisma.serviceRequest.update({
    where: { id: request.id },
    data: {
      status: ServiceRequestStatus.COMPLETED,
      completedAt: new Date(),
      payload: toInputJson({
        ...(request.payload && typeof request.payload === "object" && !Array.isArray(request.payload)
          ? (request.payload as Record<string, unknown>)
          : {}),
        completionNote: sanitizeInput(note)
      })
    }
  });

  if (request.type === ServiceRequestType.DOCUMENT_VERIFICATION) {
    const verification = await prisma.documentVerification.findFirst({ where: { serviceRequestId: request.id } });
    if (verification) {
      await prisma.$transaction([
        prisma.documentVerification.update({
          where: { id: verification.id },
          data: {
            status: VerificationStatus.VERIFIED,
            reviewerUserId: vendorId,
            comment: sanitizeInput(note),
            verifiedAt: new Date()
          }
        }),
        ...(verification.userDocumentId ? [prisma.userDocument.update({
          where: { id: verification.userDocumentId },
          data: { verificationStatus: VerificationStatus.VERIFIED }
        })] : [])
      ]);
    }
  }

  await sendNotification({
    userId: request.requesterUserId,
    type: NotificationType.SYSTEM,
    title: "Service Request Completed",
    body: `Your request "${request.title}" has been marked as completed.`,
    contextType: "SERVICE_REQUEST",
    contextId: request.id,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });

  await logActivity({
    actorUserId: vendorId,
    tenantId: vendorUser.tenantId,
    action: "vendor.service_request_completed",
    entityType: "ServiceRequest",
    entityId: request.id
  });

  return updated;
};

export const getMyServiceRequests = async (
  userId: string,
  role: UserRole,
  page: number,
  limit: number,
  status?: ServiceRequestStatus
): Promise<PaginatedResponse<ServiceRequest[]>> => {
  const actor = await getUserWithTenant(userId);
  const where: Prisma.ServiceRequestWhereInput = {
    tenantId: actor.tenantId,
    status
  };

  if (role === UserRole.VENDOR) {
    where.vendorProfile = {
      userId,
      tenantId: actor.tenantId
    };
  } else {
    where.requesterUserId = userId;
  }

  const [total, data] = await prisma.$transaction([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

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

export const rateVendor = async (
  requestId: string,
  requesterId: string,
  rating: number,
  review: string
): Promise<ServiceRequest> => {
  const actor = await getUserWithTenant(requesterId);
  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      tenantId: actor.tenantId,
      requesterUserId: requesterId
    }
  });

  if (!request) {
    throw new ServiceError("Service request not found.", 404);
  }

  if (request.status !== ServiceRequestStatus.COMPLETED) {
    throw new ServiceError("Only completed requests can be rated.", 400);
  }

  const updated = await prisma.serviceRequest.update({
    where: { id: request.id },
    data: {
      payload: toInputJson({
        ...(request.payload && typeof request.payload === "object" && !Array.isArray(request.payload)
          ? (request.payload as Record<string, unknown>)
          : {}),
        vendorRating: rating,
        vendorReview: sanitizeInput(review),
        vendorRatedAt: new Date().toISOString()
      })
    }
  });

  await logActivity({
    actorUserId: requesterId,
    tenantId: actor.tenantId,
    action: "vendor.service_request_rated",
    entityType: "ServiceRequest",
    entityId: updated.id,
    metadata: {
      rating
    }
  });

  return updated;
};

export const getVendorStats = async (vendorId: string): Promise<VendorStats> => {
  const vendorUser = await getUserWithTenant(vendorId);
  const vendorProfile = await prisma.vendorProfile.findFirst({
    where: {
      userId: vendorId,
      tenantId: vendorUser.tenantId
    },
    select: {
      id: true
    }
  });

  if (!vendorProfile) {
    throw new ServiceError("Vendor profile not found.", 404);
  }

  const requests = await prisma.serviceRequest.findMany({
    where: {
      tenantId: vendorUser.tenantId,
      vendorProfileId: vendorProfile.id
    },
    select: {
      id: true,
      status: true,
      finalCost: true,
      expectedCost: true,
      payload: true
    }
  });

  const totalRequests = requests.length;
  const completedRequests = requests.filter(
    (request) => request.status === ServiceRequestStatus.COMPLETED
  ).length;

  const ratings = requests
    .map((request) => parseRatingFromPayload(request.payload))
    .filter((value): value is number => value !== null);
  const avgRating =
    ratings.length === 0
      ? 0
      : Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2));

  const totalRevenue = requests.reduce(
    (sum, request) => sum + (request.finalCost ?? request.expectedCost ?? 0),
    0
  );

  return {
    totalRequests,
    completedRequests,
    avgRating,
    totalRevenue
  };
};
