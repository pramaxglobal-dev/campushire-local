import path from "path";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import {
  ApplicationStatus,
  NotificationChannel,
  NotificationType,
  ServiceRequestStatus,
  ServiceRequestType,
  VerificationStatus,
  type UserDocument
} from "@campushire/types";
import { prisma } from "../../lib/prisma";
import { deleteFile, generateFileKey, getPresignedUrl, uploadFile } from "../../lib/s3";
import { logActivity } from "../../lib/activity";
import { sendNotification } from "../../lib/notification";
import { resolveUserTenantIdentity as getUserWithTenant } from "../../lib/tenant";
import type { UploadDocumentDto } from "./documents.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const activeApplicationStatuses: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW_R1,
  ApplicationStatus.INTERVIEW_R2,
  ApplicationStatus.INTERVIEW_R3,
  ApplicationStatus.OFFERED,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.HIRED,
  ApplicationStatus.ON_HOLD
];

const allowedMimeTypes = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const toInputJson = (value: Record<string, unknown>): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const buildMeta = (
  existing: Prisma.JsonValue | null,
  patch: Record<string, unknown>
): Prisma.InputJsonValue => {
  const current =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return toInputJson({
    ...current,
    ...patch
  });
};

const isSharedWithRecruiters = (meta: Prisma.JsonValue | null): boolean => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return false;
  }
  return (meta as Record<string, unknown>).isSharedWithRecruiters === true;
};

const withFreshUrl = async (document: UserDocument): Promise<UserDocument> => {
  try {
    const url = await getPresignedUrl(document.fileKey, 7 * 24 * 60 * 60);
    return {
      ...document,
      fileUrl: url
    };
  } catch {
    return document;
  }
};

export const uploadDocument = async (
  userId: string,
  file: Express.Multer.File,
  dto: UploadDocumentDto
): Promise<UserDocument> => {
  const actor = await getUserWithTenant(userId);

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new ServiceError("Invalid file type. Allowed: PDF, JPG, PNG, DOCX.", 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ServiceError("Document exceeds 10MB file size limit.", 400);
  }

  const ext = path.extname(file.originalname) || ".pdf";
  const key = generateFileKey(
    `documents/${userId}/${dto.documentType.toLowerCase()}`,
    `${nanoid(8)}${ext}`
  );

  await uploadFile(key, file.buffer, file.mimetype);
  const presignedUrl = await getPresignedUrl(key, 7 * 24 * 60 * 60);

  const document = await prisma.userDocument.create({
    data: {
      userId,
      tenantId: actor.tenantId,
      documentType: dto.documentType,
      fileUrl: presignedUrl,
      fileKey: key,
      verificationStatus: VerificationStatus.UNVERIFIED,
      meta: toInputJson({
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        isSharedWithRecruiters: dto.isSharedWithRecruiters
      })
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: actor.tenantId,
    action: "document.uploaded",
    entityType: "UserDocument",
    entityId: document.id,
    metadata: {
      documentType: dto.documentType
    }
  });

  return document;
};

export const getMyDocuments = async (userId: string): Promise<UserDocument[]> => {
  const actor = await getUserWithTenant(userId);
  const documents = await prisma.userDocument.findMany({
    where: {
      userId,
      tenantId: actor.tenantId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return Promise.all(documents.map((document) => withFreshUrl(document)));
};

export const deleteDocument = async (documentId: string, userId: string): Promise<void> => {
  const actor = await getUserWithTenant(userId);
  const document = await prisma.userDocument.findFirst({
    where: {
      id: documentId,
      userId,
      tenantId: actor.tenantId
    }
  });

  if (!document) {
    throw new ServiceError("Document not found.", 404);
  }

  await deleteFile(document.fileKey);
  await prisma.userDocument.delete({
    where: {
      id: document.id
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: actor.tenantId,
    action: "document.deleted",
    entityType: "UserDocument",
    entityId: document.id
  });
};

export const toggleShareWithRecruiters = async (
  documentId: string,
  userId: string,
  share: boolean
): Promise<UserDocument> => {
  const actor = await getUserWithTenant(userId);
  const document = await prisma.userDocument.findFirst({
    where: {
      id: documentId,
      userId,
      tenantId: actor.tenantId
    }
  });

  if (!document) {
    throw new ServiceError("Document not found.", 404);
  }

  const updated = await prisma.userDocument.update({
    where: { id: document.id },
    data: {
      meta: buildMeta(document.meta, { isSharedWithRecruiters: share })
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: actor.tenantId,
    action: "document.share_toggled",
    entityType: "UserDocument",
    entityId: updated.id,
    metadata: {
      share
    }
  });

  return withFreshUrl(updated);
};

export const requestVerification = async (
  documentId: string,
  userId: string,
  vendorId: string
): Promise<UserDocument> => {
  const actor = await getUserWithTenant(userId);
  const document = await prisma.userDocument.findFirst({
    where: {
      id: documentId,
      userId,
      tenantId: actor.tenantId
    }
  });

  if (!document) {
    throw new ServiceError("Document not found.", 404);
  }

  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      id: vendorId,
      tenantId: actor.tenantId,
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

  const verificationRequest = await prisma.$transaction(async (tx) => {
    const updated = await tx.userDocument.update({
      where: { id: document.id },
      data: {
        verificationStatus: VerificationStatus.REQUESTED
      }
    });

    const serviceRequest = await tx.serviceRequest.create({
      data: {
        tenantId: actor.tenantId,
        requesterUserId: userId,
        assignedToUserId: vendor.user.id,
        vendorProfileId: vendor.id,
        type: ServiceRequestType.DOCUMENT_VERIFICATION,
        status: ServiceRequestStatus.PENDING,
        title: `Document Verification: ${document.documentType}`,
        description: `Please verify submitted ${document.documentType} document.`,
        payload: toInputJson({
          userDocumentId: document.id
        })
      }
    });

    await tx.documentVerification.create({
      data: {
        serviceRequestId: serviceRequest.id,
        vendorProfileId: vendor.id,
        userDocumentId: document.id,
        requesterUserId: userId,
        status: VerificationStatus.REQUESTED
      }
    });

    return { updated, serviceRequest };
  });
  const updatedDocument = verificationRequest.updated;

  await sendNotification({
    userId: vendor.user.id,
    type: NotificationType.DOCUMENT_VERIFIED,
    title: "Document Verification Requested",
    body: "A new document verification request requires your attention.",
    contextType: "SERVICE_REQUEST",
    contextId: verificationRequest.serviceRequest.id,
    actionUrl: "/dashboard/vendor",
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });

  await logActivity({
    actorUserId: userId,
    tenantId: actor.tenantId,
    action: "document.verification_requested",
    entityType: "UserDocument",
    entityId: updatedDocument.id,
    metadata: {
      vendorId: vendor.id
    }
  });

  return withFreshUrl(updatedDocument);
};

export const getSharedDocuments = async (
  candidateUserId: string,
  recruiterUserId: string
): Promise<UserDocument[]> => {
  const actor = await getUserWithTenant(recruiterUserId);
  const recruiter = await prisma.recruiterProfile.findFirst({
    where: {
      userId: recruiterUserId,
      tenantId: actor.tenantId
    },
    select: {
      id: true
    }
  });

  if (!recruiter) {
    throw new ServiceError("Recruiter profile not found.", 404);
  }

  const activeApplication = await prisma.application.findFirst({
    where: {
      tenantId: actor.tenantId,
      candidateUserId,
      status: {
        in: activeApplicationStatuses
      },
      job: {
        createdByUserId: recruiterUserId,
        tenantId: actor.tenantId
      }
    },
    select: { id: true }
  });

  if (!activeApplication) {
    throw new ServiceError("No active application found for this candidate.", 403);
  }

  const documents = await prisma.userDocument.findMany({
    where: {
      userId: candidateUserId,
      tenantId: actor.tenantId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const shared = documents.filter((document) => isSharedWithRecruiters(document.meta));
  return Promise.all(shared.map((document) => withFreshUrl(document)));
};

export const getMyDocumentVerifications = async (userId: string) => {
  const actor = await getUserWithTenant(userId);
  return prisma.documentVerification.findMany({
    where: { requesterUserId: userId, serviceRequest: { tenantId: actor.tenantId } },
    include: {
      vendorProfile: { select: { businessName: true } },
      serviceRequest: { select: { status: true, title: true, updatedAt: true } },
      userDocument: { select: { id: true, documentType: true, verificationStatus: true } }
    },
    orderBy: { createdAt: "desc" }
  });
};
