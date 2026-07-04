import { Prisma } from "@prisma/client";
import {
  EventStatus,
  ParticipantStatus,
  UserRole,
  type EventParticipant,
  type PaginatedResponse,
  type PlacementEvent
} from "@campushire/types";
import { sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import { resolveUserTenantOrNull } from "../../lib/tenant";
import type { CreateEventDto, EventFilters, UpdateEventDto } from "./events.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

const getCollegeByAdmin = async (collegeAdminUserId: string) => {
  const college = await prisma.collegeProfile.findFirst({
    where: { adminUserId: collegeAdminUserId },
    select: { id: true, tenantId: true }
  });
  if (!college) {
    throw new ServiceError("College profile not found.", 404);
  }
  return college;
};

const requireEventForTenant = async (eventId: string, tenantId: string): Promise<PlacementEvent> => {
  const event = await prisma.placementEvent.findFirst({
    where: {
      id: eventId,
      tenantId
    }
  });
  if (!event) {
    throw new ServiceError("Event not found.", 404);
  }
  return event;
};

export const createEvent = async (
  collegeAdminUserId: string,
  dto: CreateEventDto
): Promise<PlacementEvent> => {
  const college = await getCollegeByAdmin(collegeAdminUserId);
  const event = await prisma.placementEvent.create({
    data: {
      tenantId: college.tenantId,
      collegeProfileId: college.id,
      recruiterProfileId: dto.recruiterProfileId ?? null,
      createdByUserId: collegeAdminUserId,
      title: sanitizeInput(dto.title),
      description: dto.description ? sanitizeInput(dto.description) : null,
      eventType: dto.eventType,
      status: EventStatus.UPCOMING,
      isOpenToAll: dto.isOpenToAll ?? false,
      startAt: dto.startAt,
      endAt: dto.endAt,
      venue: dto.venue ? sanitizeInput(dto.venue) : null,
      maxParticipants: dto.maxParticipants ?? null,
      registrationDeadline: dto.registrationDeadline ?? null
    }
  });

  await logActivity({
    actorUserId: collegeAdminUserId,
    tenantId: college.tenantId,
    action: "event.created",
    entityType: "PlacementEvent",
    entityId: event.id
  });

  return event;
};

export const updateEvent = async (
  eventId: string,
  userId: string,
  dto: UpdateEventDto
): Promise<PlacementEvent> => {
  const college = await getCollegeByAdmin(userId);
  const event = await requireEventForTenant(eventId, college.tenantId);

  const updated = await prisma.placementEvent.update({
    where: { id: event.id },
    data: {
      title: dto.title ? sanitizeInput(dto.title) : undefined,
      description: dto.description ? sanitizeInput(dto.description) : undefined,
      eventType: dto.eventType,
      isOpenToAll: dto.isOpenToAll,
      startAt: dto.startAt,
      endAt: dto.endAt,
      venue: dto.venue ? sanitizeInput(dto.venue) : undefined,
      maxParticipants: dto.maxParticipants,
      registrationDeadline: dto.registrationDeadline,
      recruiterProfileId: dto.recruiterProfileId
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: college.tenantId,
    action: "event.updated",
    entityType: "PlacementEvent",
    entityId: updated.id
  });

  return updated;
};

export const cancelEvent = async (eventId: string, userId: string): Promise<PlacementEvent> => {
  const college = await getCollegeByAdmin(userId);
  const event = await requireEventForTenant(eventId, college.tenantId);
  const updated = await prisma.placementEvent.update({
    where: { id: event.id },
    data: {
      status: EventStatus.CANCELLED
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: college.tenantId,
    action: "event.cancelled",
    entityType: "PlacementEvent",
    entityId: updated.id
  });

  return updated;
};

export const listEvents = async (
  filters: EventFilters,
  viewerTenantId?: string | null,
  isSuperAdmin = false
): Promise<PaginatedResponse<PlacementEvent[]>> => {
  const where: Prisma.PlacementEventWhereInput = {
    ...(!isSuperAdmin
      ? viewerTenantId
        ? {
            OR: [{ tenantId: viewerTenantId }, { isOpenToAll: true }]
          }
        : { isOpenToAll: true }
      : {}),
    collegeProfileId: filters.collegeId,
    eventType: filters.eventType,
    status: filters.status,
    ...(filters.dateFrom || filters.dateTo
      ? {
          startAt: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {})
          }
        }
      : {})
  };

  const [total, data] = await prisma.$transaction([
    prisma.placementEvent.count({ where }),
    prisma.placementEvent.findMany({
      where,
      orderBy: {
        startAt: "asc"
      },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit
    })
  ]);

  return {
    success: true,
    data,
    error: null,
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit))
    }
  };
};

export const getEvent = async (
  eventId: string,
  viewerTenantId?: string | null,
  isSuperAdmin = false
): Promise<PlacementEvent & { participants: EventParticipant[] }> => {
  const event = await prisma.placementEvent.findUnique({
    where: { id: eventId },
    include: {
      participants: true
    }
  });

  if (!event) {
    throw new ServiceError("Event not found.", 404);
  }
  if (!isSuperAdmin) {
    const hasAccess =
      event.isOpenToAll || (viewerTenantId !== null && viewerTenantId !== undefined && event.tenantId === viewerTenantId);
    if (!hasAccess) {
      throw new ServiceError("Event not found.", 404);
    }
  }

  return event;
};

export const registerForEvent = async (eventId: string, userId: string): Promise<EventParticipant> => {
  const event = await prisma.placementEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      tenantId: true,
      maxParticipants: true,
      status: true
    }
  });

  if (!event) {
    throw new ServiceError("Event not found.", 404);
  }

  if (event.status === EventStatus.CANCELLED) {
    throw new ServiceError("Event is cancelled.", 400);
  }

  const tenantId = await resolveUserTenantOrNull(userId);
  if (!tenantId || tenantId !== event.tenantId) {
    throw new ServiceError("Forbidden tenant access.", 403);
  }

  const existing = await prisma.eventParticipant.findUnique({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId
      }
    }
  });
  if (existing) {
    throw new ServiceError("Already registered.", 409);
  }

  if (event.maxParticipants) {
    const count = await prisma.eventParticipant.count({
      where: {
        eventId: event.id
      }
    });
    if (count >= event.maxParticipants) {
      throw new ServiceError("Event is full.", 400);
    }
  }

  const participant = await prisma.eventParticipant.create({
    data: {
      eventId: event.id,
      userId,
      status: ParticipantStatus.REGISTERED
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: event.tenantId,
    action: "event.registered",
    entityType: "EventParticipant",
    entityId: participant.id
  });

  return participant;
};

export const cancelRegistration = async (eventId: string, userId: string): Promise<void> => {
  const event = await prisma.placementEvent.findUnique({
    where: { id: eventId },
    select: { tenantId: true }
  });
  if (!event) {
    throw new ServiceError("Event not found.", 404);
  }

  const deleted = await prisma.eventParticipant.deleteMany({
    where: {
      eventId,
      userId
    }
  });

  if (deleted.count === 0) {
    throw new ServiceError("Registration not found.", 404);
  }

  await logActivity({
    actorUserId: userId,
    tenantId: event.tenantId,
    action: "event.registration_cancelled",
    entityType: "EventParticipant",
    entityId: `${eventId}:${userId}`
  });
};

export const markAttendance = async (
  eventId: string,
  participantUserId: string,
  attended: boolean,
  markedBy: string
): Promise<EventParticipant> => {
  const college = await getCollegeByAdmin(markedBy);
  const event = await requireEventForTenant(eventId, college.tenantId);
  if (event.collegeProfileId !== college.id) {
    throw new ServiceError("Forbidden", 403);
  }

  const participant = await prisma.eventParticipant.findUnique({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId: participantUserId
      }
    }
  });
  if (!participant) {
    throw new ServiceError("Participant not found.", 404);
  }

  const updated = await prisma.eventParticipant.update({
    where: { id: participant.id },
    data: {
      status: attended ? ParticipantStatus.ATTENDED : ParticipantStatus.ABSENT,
      checkedInAt: attended ? new Date() : null
    }
  });

  await logActivity({
    actorUserId: markedBy,
    tenantId: college.tenantId,
    action: "event.attendance_marked",
    entityType: "EventParticipant",
    entityId: updated.id,
    metadata: {
      attended
    }
  });

  return updated;
};

export const getMyEvents = async (userId: string): Promise<PlacementEvent[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantId: true }
  });

  if (!user) {
    throw new ServiceError("User not found.", 404);
  }

  if (user.role === UserRole.COLLEGE_ADMIN) {
    const college = await prisma.collegeProfile.findFirst({
      where: { adminUserId: userId },
      select: { id: true, tenantId: true }
    });
    if (!college) {
      return [];
    }
    return prisma.placementEvent.findMany({
      where: {
        tenantId: college.tenantId,
        collegeProfileId: college.id
      },
      orderBy: {
        startAt: "asc"
      }
    });
  }

  return prisma.placementEvent.findMany({
    where: {
      tenantId: user.tenantId ?? undefined,
      participants: {
        some: {
          userId
        }
      }
    },
    orderBy: {
      startAt: "asc"
    }
  });
};
