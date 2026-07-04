import { addHours } from "date-fns";
import { Prisma } from "@prisma/client";
import {
  ApplicationStatus,
  InterviewOutcome,
  InterviewRound,
  InterviewStatus,
  NotificationChannel,
  NotificationType,
  UserRole,
  type InterviewSlot
} from "@campushire/types";
import { formatDate } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import { writeApplicationStatusHistory } from "../../lib/application-history";
import { resolveUserTenant as getUserTenantId } from "../../lib/tenant";
import { notifyInterviewScheduled, sendNotification } from "../../lib/notification";
import type {
  InterviewFilters,
  RescheduleDto,
  ScheduleInterviewDto
} from "./interviews.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

const roundToApplicationStatus: Record<InterviewRound, ApplicationStatus> = {
  R1: ApplicationStatus.INTERVIEW_R1,
  R2: ApplicationStatus.INTERVIEW_R2,
  R3: ApplicationStatus.INTERVIEW_R3,
  FINAL: ApplicationStatus.INTERVIEW_R3,
  HR: ApplicationStatus.INTERVIEW_R3
};

const roundPrerequisites: Record<InterviewRound, ApplicationStatus[]> = {
  R1: [ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW_R1],
  R2: [ApplicationStatus.INTERVIEW_R1, ApplicationStatus.INTERVIEW_R2],
  R3: [ApplicationStatus.INTERVIEW_R2, ApplicationStatus.INTERVIEW_R3],
  FINAL: [ApplicationStatus.INTERVIEW_R2, ApplicationStatus.INTERVIEW_R3],
  HR: [ApplicationStatus.INTERVIEW_R2, ApplicationStatus.INTERVIEW_R3]
};

const toDateTime = (date: Date, hhmm: string): Date => {
  const [hoursRaw, minutesRaw] = hhmm.split(":");
  const hours = Number.parseInt(hoursRaw ?? "0", 10);
  const minutes = Number.parseInt(minutesRaw ?? "0", 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new ServiceError("Invalid time format. Use HH:mm.", 400);
  }
  const dt = new Date(date);
  dt.setHours(hours, minutes, 0, 0);
  return dt;
};

const ensureRecruiterOwnershipOfApplication = async (applicationId: string, recruiterId: string) => {
  const tenantId = await getUserTenantId(recruiterId);
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      tenantId
    },
    include: {
      job: true,
      candidate: true
    }
  });
  if (!application) {
    throw new ServiceError("Application not found.", 404);
  }
  if (application.job.createdByUserId !== recruiterId) {
    throw new ServiceError("Forbidden", 403);
  }
  return application;
};

const hasOverlappingInterview = async (
  candidateUserId: string,
  startAt: Date,
  endAt: Date,
  tenantId: string,
  ignoreSlotId?: string
): Promise<boolean> => {
  const overlap = await prisma.interviewSlot.findFirst({
    where: {
      candidateUserId,
      application: {
        tenantId
      },
      status: {
        in: [InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED, InterviewStatus.RESCHEDULED]
      },
      ...(ignoreSlotId ? { id: { not: ignoreSlotId } } : {}),
      AND: [
        {
          scheduledStartAt: {
            lt: endAt
          }
        },
        {
          scheduledEndAt: {
            gt: startAt
          }
        }
      ]
    },
    select: { id: true }
  });
  return Boolean(overlap);
};

const markApplicationInterviewStage = async (
  applicationId: string,
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus,
  changedByUserId: string
): Promise<void> => {
  if (fromStatus === toStatus) {
    return;
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: toStatus
    }
  });

  await writeApplicationStatusHistory(prisma, {
    applicationId,
    fromStatus,
    toStatus,
    changedByUserId
  });
};

const appendNote = (current: string | null, line: string): string => {
  if (!current) {
    return line;
  }
  return `${current}\n${line}`;
};

export const scheduleInterview = async (
  recruiterId: string,
  dto: ScheduleInterviewDto
): Promise<InterviewSlot> => {
  const application = await ensureRecruiterOwnershipOfApplication(dto.applicationId, recruiterId);

  const allowedStatuses = roundPrerequisites[dto.round];
  if (!allowedStatuses.includes(application.status)) {
    throw new ServiceError("Application stage does not allow this interview round.", 400);
  }

  const scheduledStartAt = toDateTime(dto.interviewDate, dto.startTime);
  const scheduledEndAt = toDateTime(dto.interviewDate, dto.endTime);
  if (scheduledEndAt <= scheduledStartAt) {
    throw new ServiceError("Interview end time must be after start time.", 400);
  }

  const conflict = await hasOverlappingInterview(
    application.candidateUserId,
    scheduledStartAt,
    scheduledEndAt,
    application.tenantId
  );
  if (conflict) {
    throw new ServiceError("Candidate has a conflicting interview slot.", 409);
  }

  const slot = await prisma.interviewSlot.create({
    data: {
      applicationId: application.id,
      jobId: application.jobId,
      candidateUserId: application.candidateUserId,
      createdByUserId: recruiterId,
      round: dto.round,
      mode: dto.mode,
      status: InterviewStatus.SCHEDULED,
      scheduledStartAt,
      scheduledEndAt,
      meetingLink: dto.meetingLink ?? null,
      location: dto.venue ?? null
    }
  });

  await markApplicationInterviewStage(
    application.id,
    application.status,
    roundToApplicationStatus[dto.round],
    recruiterId
  );

  await notifyInterviewScheduled(slot, application, application.job, application.candidate);

  await logActivity({
    actorUserId: recruiterId,
    tenantId: application.tenantId,
    action: "interview.scheduled",
    entityType: "InterviewSlot",
    entityId: slot.id
  });

  return slot;
};

export const rescheduleInterview = async (
  slotId: string,
  recruiterId: string,
  dto: RescheduleDto
): Promise<InterviewSlot> => {
  const tenantId = await getUserTenantId(recruiterId);
  const slot = await prisma.interviewSlot.findFirst({
    where: {
      id: slotId,
      application: {
        tenantId
      }
    },
    include: {
      application: {
        include: {
          job: true,
          candidate: true
        }
      }
    }
  });
  if (!slot) {
    throw new ServiceError("Interview slot not found.", 404);
  }
  if (slot.application.job.createdByUserId !== recruiterId) {
    throw new ServiceError("Forbidden", 403);
  }

  const startAt = toDateTime(dto.interviewDate, dto.startTime);
  const endAt = toDateTime(dto.interviewDate, dto.endTime);
  if (endAt <= startAt) {
    throw new ServiceError("Interview end time must be after start time.", 400);
  }

  const conflict = await hasOverlappingInterview(
    slot.candidateUserId,
    startAt,
    endAt,
    slot.application.tenantId,
    slot.id
  );
  if (conflict) {
    throw new ServiceError("Candidate has a conflicting interview slot.", 409);
  }

  const updated = await prisma.interviewSlot.update({
    where: { id: slot.id },
    data: {
      scheduledStartAt: startAt,
      scheduledEndAt: endAt,
      meetingLink: dto.meetingLink ?? slot.meetingLink,
      location: dto.venue ?? slot.location,
      status: InterviewStatus.RESCHEDULED
    }
  });

  await notifyInterviewScheduled(
    updated,
    slot.application,
    slot.application.job,
    slot.application.candidate
  );

  await logActivity({
    actorUserId: recruiterId,
    tenantId: slot.application.tenantId,
    action: "interview.rescheduled",
    entityType: "InterviewSlot",
    entityId: updated.id
  });

  return updated;
};

export const cancelInterview = async (
  slotId: string,
  recruiterId: string,
  reason: string
): Promise<InterviewSlot> => {
  const tenantId = await getUserTenantId(recruiterId);
  const slot = await prisma.interviewSlot.findFirst({
    where: {
      id: slotId,
      application: {
        tenantId
      }
    },
    include: {
      application: {
        include: {
          job: true,
          candidate: true
        }
      }
    }
  });
  if (!slot) {
    throw new ServiceError("Interview slot not found.", 404);
  }
  if (slot.application.job.createdByUserId !== recruiterId) {
    throw new ServiceError("Forbidden", 403);
  }

  const updated = await prisma.interviewSlot.update({
    where: { id: slot.id },
    data: {
      status: InterviewStatus.CANCELLED,
      note: appendNote(slot.note, `Cancelled: ${reason}`)
    }
  });

  await sendNotification({
    userId: slot.candidateUserId,
    type: NotificationType.INTERVIEW_SCHEDULED,
    title: "Interview Cancelled",
    body: reason,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
    contextType: "APPLICATION",
    contextId: slot.applicationId
  });

  await logActivity({
    actorUserId: recruiterId,
    tenantId: slot.application.tenantId,
    action: "interview.cancelled",
    entityType: "InterviewSlot",
    entityId: updated.id
  });

  return updated;
};

export const confirmInterview = async (slotId: string, candidateUserId: string): Promise<InterviewSlot> => {
  const tenantId = await getUserTenantId(candidateUserId);
  const slot = await prisma.interviewSlot.findFirst({
    where: {
      id: slotId,
      application: {
        tenantId
      }
    },
    include: {
      application: true
    }
  });
  if (!slot) {
    throw new ServiceError("Interview slot not found.", 404);
  }
  if (slot.candidateUserId !== candidateUserId) {
    throw new ServiceError("Forbidden", 403);
  }

  const updated = await prisma.interviewSlot.update({
    where: { id: slot.id },
    data: {
      status: InterviewStatus.CONFIRMED,
      candidateConfirmed: true,
      note: appendNote(slot.note, `Candidate confirmed at ${new Date().toISOString()}`)
    }
  });

  await logActivity({
    actorUserId: candidateUserId,
    tenantId: slot.application.tenantId,
    action: "interview.confirmed",
    entityType: "InterviewSlot",
    entityId: updated.id
  });

  return updated;
};

export const recordOutcome = async (
  slotId: string,
  recruiterId: string,
  outcome: InterviewOutcome,
  note?: string
): Promise<InterviewSlot> => {
  const tenantId = await getUserTenantId(recruiterId);
  const slot = await prisma.interviewSlot.findFirst({
    where: {
      id: slotId,
      application: {
        tenantId
      }
    },
    include: {
      application: {
        include: {
          job: true
        }
      }
    }
  });
  if (!slot) {
    throw new ServiceError("Interview slot not found.", 404);
  }
  if (slot.application.job.createdByUserId !== recruiterId) {
    throw new ServiceError("Forbidden", 403);
  }

  const updated = await prisma.interviewSlot.update({
    where: { id: slot.id },
    data: {
      outcome,
      status: InterviewStatus.COMPLETED,
      note: note ? appendNote(slot.note, note) : slot.note
    }
  });

  await logActivity({
    actorUserId: recruiterId,
    tenantId: slot.application.tenantId,
    action: "interview.outcome_recorded",
    entityType: "InterviewSlot",
    entityId: updated.id,
    metadata: {
      outcome
    }
  });

  return updated;
};

export const getInterviewsForRecruiter = async (
  recruiterId: string,
  filters: InterviewFilters
): Promise<InterviewSlot[]> => {
  const tenantId = await getUserTenantId(recruiterId);
  return prisma.interviewSlot.findMany({
    where: {
      createdByUserId: recruiterId,
      application: {
        tenantId
      },
      status: filters.status,
      round: filters.round,
      ...(filters.startDate || filters.endDate
        ? {
            scheduledStartAt: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {})
            }
          }
        : {})
    },
    orderBy: {
      scheduledStartAt: "asc"
    }
  });
};

export const getInterviewsForCandidate = async (
  candidateUserId: string
): Promise<
  Array<
    InterviewSlot & {
      application: {
        job: {
          title: string;
          recruiterProfile: {
            companyName: string;
          };
        };
      };
    }
  >
> => {
  const tenantId = await getUserTenantId(candidateUserId);
  return prisma.interviewSlot.findMany({
    where: {
      candidateUserId,
      application: {
        tenantId
      }
    },
    include: {
      application: {
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
      }
    },
    orderBy: {
      scheduledStartAt: "asc"
    }
  });
};

export const getInterviewDetail = async (slotId: string, userId: string) => {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantId: true }
  });
  if (!actor) {
    throw new ServiceError("Unauthorized", 401);
  }

  const slot =
    actor.role === UserRole.SUPER_ADMIN
      ? await prisma.interviewSlot.findUnique({
          where: { id: slotId },
          include: {
            application: {
              include: {
                job: true,
                candidate: true
              }
            }
          }
        })
      : await prisma.interviewSlot.findFirst({
          where: {
            id: slotId,
            application: {
              tenantId: actor.tenantId ?? undefined
            }
          },
          include: {
            application: {
              include: {
                job: true,
                candidate: true
              }
            }
          }
        });
  if (!slot) {
    throw new ServiceError("Interview slot not found.", 404);
  }

  const isRecruiter = slot.application.job.createdByUserId === userId;
  const isCandidate = slot.candidateUserId === userId;
  const isAdmin = actor.role === UserRole.SUPER_ADMIN;

  if (!isRecruiter && !isCandidate && !isAdmin) {
    throw new ServiceError("Forbidden", 403);
  }
  return slot;
};

export const sendInterviewReminders = async (): Promise<void> => {
  const now = new Date();
  const next24 = addHours(now, 24);

  const slots = await prisma.interviewSlot.findMany({
    where: {
      status: {
        in: [InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED, InterviewStatus.RESCHEDULED]
      },
      scheduledStartAt: {
        gte: now,
        lte: next24
      },
      reminderSent: false
    },
    include: {
      application: {
        include: {
          job: true
        }
      },
      candidate: true
    }
  });

  for (const slot of slots) {
    const startLabel = formatDate(slot.scheduledStartAt, "dd MMM yyyy, hh:mm a");
    await sendNotification({
      userId: slot.candidateUserId,
      type: NotificationType.INTERVIEW_SCHEDULED,
      title: "Interview Reminder",
      body: `Reminder: ${slot.application.job.title} interview at ${startLabel}.`,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
      contextType: "APPLICATION",
      contextId: slot.applicationId
    });

    await prisma.interviewSlot.update({
      where: { id: slot.id },
      data: {
        reminderSent: true
      }
    });

    await logActivity({
      actorUserId: slot.createdByUserId,
      tenantId: slot.application.tenantId,
      action: "interview.reminder_sent",
      entityType: "InterviewSlot",
      entityId: slot.id
    });
  }
};
