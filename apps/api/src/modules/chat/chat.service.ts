import path from "path";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import {
  ChatContextType,
  ConnectionStatus,
  MessageType,
  NotificationChannel,
  NotificationType,
  ServiceRequestStatus,
  UserRole,
  type ChatMessage,
  type ChatThread,
  type PaginatedResponse
} from "@campushire/types";
import { prisma } from "../../lib/prisma";
import { generateFileKey, getPresignedUrl, uploadFile } from "../../lib/s3";
import { logActivity } from "../../lib/activity";
import { sendNotification } from "../../lib/notification";
import { emitToUser } from "../../lib/socket";
import { resolveUserTenantContext as getUserWithTenant } from "../../lib/tenant";
import type { CreateThreadDto, SendMessageDto } from "./chat.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

const MAX_CHAT_FILE_SIZE = 20 * 1024 * 1024;

interface ChatThreadWithPreview extends ChatThread {
  otherParticipant: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  } | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

const toInputJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const parseParticipants = (value: Prisma.JsonValue | null): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
};

const isParticipant = (thread: ChatThread, userId: string): boolean => {
  return parseParticipants(thread.participantUserIds).includes(userId);
};

const resolveThreadContextFilter = (contextType: ChatContextType, contextId: string) => {
  if (contextType === ChatContextType.APPLICATION) {
    return { applicationId: contextId };
  }
  if (contextType === ChatContextType.REFERRAL) {
    return { referralId: contextId };
  }
  if (contextType === ChatContextType.SERVICE_REQUEST) {
    return { serviceRequestId: contextId };
  }
  if (contextType === ChatContextType.COURSE_ENROLLMENT) {
    return { courseEnrollmentId: contextId };
  }
  return { collegeRecruiterConnectionId: contextId };
};

const assertValidContext = async (
  tenantId: string,
  userAId: string,
  userBId: string,
  contextType: ChatContextType,
  contextId: string
): Promise<void> => {
  if (contextType === ChatContextType.APPLICATION) {
    const application = await prisma.application.findFirst({
      where: {
        id: contextId,
        tenantId
      },
      include: {
        job: {
          select: {
            createdByUserId: true
          }
        }
      }
    });

    if (!application) {
      throw new ServiceError("Application context not found.", 404);
    }

    const users = [userAId, userBId];
    const hasCandidate = users.includes(application.candidateUserId);
    const hasRecruiter = users.includes(application.job.createdByUserId);
    if (!hasCandidate || !hasRecruiter) {
      throw new ServiceError("Invalid application chat participants.", 403);
    }
    return;
  }

  if (contextType === ChatContextType.SERVICE_REQUEST) {
    const request = await prisma.serviceRequest.findFirst({
      where: {
        id: contextId,
        tenantId
      },
      include: {
        vendorProfile: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!request || !request.vendorProfile) {
      throw new ServiceError("Service request context not found.", 404);
    }

    const users = [userAId, userBId];
    const hasVendor = users.includes(request.vendorProfile.userId);
    const hasRequester = users.includes(request.requesterUserId);
    if (!hasVendor || !hasRequester) {
      throw new ServiceError("Invalid service request chat participants.", 403);
    }
    if (request.status === ServiceRequestStatus.CANCELLED) {
      throw new ServiceError("Cannot chat on cancelled service request.", 400);
    }
    return;
  }

  if (contextType === ChatContextType.COLLEGE_RECRUITER) {
    const connection = await prisma.collegeRecruiterConnection.findFirst({
      where: {
        id: contextId,
        tenantId,
        status: ConnectionStatus.APPROVED
      },
      include: {
        collegeProfile: {
          select: {
            adminUserId: true
          }
        },
        recruiterProfile: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!connection) {
      throw new ServiceError("Approved college recruiter connection not found.", 404);
    }

    const users = [userAId, userBId];
    const hasCollegeAdmin = users.includes(connection.collegeProfile.adminUserId);
    const hasRecruiter = users.includes(connection.recruiterProfile.userId);
    if (!hasCollegeAdmin || !hasRecruiter) {
      throw new ServiceError("Invalid connection chat participants.", 403);
    }
    return;
  }

  if (contextType === ChatContextType.COURSE_ENROLLMENT) {
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { id: contextId, course: { tenantId } },
      include: { course: { include: { trainingPartnerProfile: { select: { userId: true } } } } }
    });
    if (!enrollment) {
      throw new ServiceError("Course enrollment context not found.", 404);
    }
    const users = [userAId, userBId];
    if (!users.includes(enrollment.userId) || !users.includes(enrollment.course.trainingPartnerProfile.userId)) {
      throw new ServiceError("Invalid course chat participants.", 403);
    }
    return;
  }

  const referral = await prisma.freelanceReferral.findFirst({
    where: {
      id: contextId,
      tenantId
    },
    include: {
      recruiterProfile: {
        select: {
          userId: true
        }
      }
    }
  });

  if (!referral) {
    throw new ServiceError("Referral context not found.", 404);
  }

  const users = [userAId, userBId];
  const valid =
    (users.includes(referral.referredByUserId) && users.includes(referral.candidateUserId)) ||
    (users.includes(referral.referredByUserId) && users.includes(referral.recruiterProfile.userId));
  if (!valid) {
    throw new ServiceError("Invalid referral chat participants.", 403);
  }
};

const getThreadOrThrow = async (threadId: string, userId: string, tenantId: string) => {
  const thread = await prisma.chatThread.findFirst({
    where: {
      id: threadId,
      tenantId
    }
  });

  if (!thread) {
    throw new ServiceError("Chat thread not found.", 404);
  }
  if (!isParticipant(thread, userId)) {
    throw new ServiceError("Forbidden", 403);
  }

  return thread;
};

export const getOrCreateThread = async (
  userAId: string,
  userBId: string,
  contextType: ChatContextType,
  contextId: string
): Promise<ChatThread> => {
  if (userAId === userBId) {
    throw new ServiceError("Cannot create chat thread with self.", 400);
  }

  const [userA, userB] = await Promise.all([getUserWithTenant(userAId), getUserWithTenant(userBId)]);
  if (userA.tenantId !== userB.tenantId) {
    throw new ServiceError("Users are not in the same tenant.", 403);
  }

  await assertValidContext(userA.tenantId, userAId, userBId, contextType, contextId);

  const contextFilter = resolveThreadContextFilter(contextType, contextId);
  const candidates = await prisma.chatThread.findMany({
    where: {
      tenantId: userA.tenantId,
      contextType,
      ...contextFilter
    }
  });

  const existing = candidates.find((thread) => {
    const participants = parseParticipants(thread.participantUserIds);
    return participants.includes(userAId) && participants.includes(userBId);
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.chatThread.create({
    data: {
      tenantId: userA.tenantId,
      contextType,
      applicationId: contextType === ChatContextType.APPLICATION ? contextId : undefined,
      referralId: contextType === ChatContextType.REFERRAL ? contextId : undefined,
      serviceRequestId: contextType === ChatContextType.SERVICE_REQUEST ? contextId : undefined,
      collegeRecruiterConnectionId:
        contextType === ChatContextType.COLLEGE_RECRUITER ? contextId : undefined,
      courseEnrollmentId:
        contextType === ChatContextType.COURSE_ENROLLMENT ? contextId : undefined,
      createdByUserId: userAId,
      participantUserIds: toInputJson([userAId, userBId])
    }
  });

  await logActivity({
    actorUserId: userAId,
    tenantId: userA.tenantId,
    action: "chat.thread_created",
    entityType: "ChatThread",
    entityId: created.id,
    metadata: {
      contextType,
      contextId
    }
  });

  return created;
};

export const getThreads = async (userId: string): Promise<ChatThreadWithPreview[]> => {
  const actor = await getUserWithTenant(userId);
  const threads = await prisma.chatThread.findMany({
    where: {
      tenantId: actor.tenantId,
      participantUserIds: {
        array_contains: [userId]
      }
    },
    orderBy: [
      {
        lastMessageAt: "desc"
      },
      {
        updatedAt: "desc"
      }
    ]
  });

  const mapped = await Promise.all(
    threads.map(async (thread) => {
      const participants = parseParticipants(thread.participantUserIds);
      const otherUserId = participants.find((id) => id !== userId) ?? null;
      const [otherParticipant, lastMessage, unreadCount] = await Promise.all([
        otherUserId
          ? prisma.user.findFirst({
              where: {
                id: otherUserId,
                tenantId: actor.tenantId
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                role: true
              }
            })
          : Promise.resolve(null),
        prisma.chatMessage.findFirst({
          where: {
            tenantId: actor.tenantId,
            threadId: thread.id
          },
          orderBy: {
            createdAt: "desc"
          }
        }),
        prisma.chatMessage.count({
          where: {
            tenantId: actor.tenantId,
            threadId: thread.id,
            senderUserId: {
              not: userId
            },
            OR: [{ readByUserId: null }, { readByUserId: { not: userId } }]
          }
        })
      ]);

      const result: ChatThreadWithPreview = {
        ...thread,
        otherParticipant,
        lastMessage,
        unreadCount
      };

      return result;
    })
  );

  return mapped;
};

export const getMessages = async (
  threadId: string,
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedResponse<ChatMessage[]>> => {
  const actor = await getUserWithTenant(userId);
  await getThreadOrThrow(threadId, userId, actor.tenantId);

  const where: Prisma.ChatMessageWhereInput = {
    tenantId: actor.tenantId,
    threadId
  };

  const [total, data] = await prisma.$transaction([
    prisma.chatMessage.count({ where }),
    prisma.chatMessage.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.chatMessage.updateMany({
      where: {
        tenantId: actor.tenantId,
        threadId,
        senderUserId: {
          not: userId
        },
        OR: [{ readByUserId: null }, { readByUserId: { not: userId } }]
      },
      data: {
        readAt: new Date(),
        readByUserId: userId
      }
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

export const sendMessage = async (
  threadId: string,
  senderId: string,
  dto: SendMessageDto
): Promise<ChatMessage> => {
  const actor = await getUserWithTenant(senderId);
  const thread = await getThreadOrThrow(threadId, senderId, actor.tenantId);

  if (dto.messageType === MessageType.TEXT && !dto.content) {
    throw new ServiceError("Message content is required.", 400);
  }

  if (dto.messageType === MessageType.FILE && !dto.fileUrl) {
    throw new ServiceError("File URL is required for file messages.", 400);
  }

  const created = await prisma.chatMessage.create({
    data: {
      tenantId: actor.tenantId,
      threadId: thread.id,
      senderUserId: senderId,
      messageType: dto.messageType,
      body: dto.content ?? null,
      fileUrl: dto.fileUrl ?? null,
      fileName: dto.fileName ?? null,
      isSystem: dto.messageType === MessageType.SYSTEM,
      readAt: new Date(),
      readByUserId: senderId
    }
  });

  await prisma.chatThread.update({
    where: {
      id: thread.id
    },
    data: {
      lastMessageAt: new Date()
    }
  });

  const participants = parseParticipants(thread.participantUserIds);
  const recipients = participants.filter((id) => id !== senderId);

  for (const recipientId of recipients) {
    emitToUser(recipientId, "message:new", {
      threadId: thread.id,
      message: created
    });

    await sendNotification({
      userId: recipientId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: "New Message",
      body: dto.messageType === MessageType.FILE ? "You received a file." : dto.content ?? "You have a new message.",
      contextType: "SYSTEM",
      contextId: thread.id,
      actionUrl: "/dashboard/chat",
      channels: [NotificationChannel.IN_APP]
    });
  }

  await logActivity({
    actorUserId: senderId,
    tenantId: actor.tenantId,
    action: "chat.message_sent",
    entityType: "ChatMessage",
    entityId: created.id,
    metadata: {
      threadId: thread.id
    }
  });

  return created;
};

export const markThreadRead = async (threadId: string, userId: string): Promise<void> => {
  const actor = await getUserWithTenant(userId);
  await getThreadOrThrow(threadId, userId, actor.tenantId);

  await prisma.chatMessage.updateMany({
    where: {
      tenantId: actor.tenantId,
      threadId,
      senderUserId: {
        not: userId
      },
      OR: [{ readByUserId: null }, { readByUserId: { not: userId } }]
    },
    data: {
      readAt: new Date(),
      readByUserId: userId
    }
  });
};

export const uploadChatFile = async (
  file: Express.Multer.File,
  senderId: string
): Promise<{ fileUrl: string; fileKey: string; fileName: string }> => {
  await getUserWithTenant(senderId);

  if (file.size > MAX_CHAT_FILE_SIZE) {
    throw new ServiceError("Chat file exceeds 20MB size limit.", 400);
  }

  const ext = path.extname(file.originalname) || "";
  const key = generateFileKey(`chat-files/${senderId}`, `${nanoid(8)}${ext}`);
  await uploadFile(key, file.buffer, file.mimetype);
  const fileUrl = await getPresignedUrl(key, 7 * 24 * 60 * 60);

  return {
    fileUrl,
    fileKey: key,
    fileName: file.originalname
  };
};

export const sendMessageFromSocket = async (
  senderId: string,
  payload: { threadId: string; content?: string; messageType?: MessageType }
): Promise<ChatMessage> => {
  return sendMessage(payload.threadId, senderId, {
    content: payload.content,
    messageType: payload.messageType ?? MessageType.TEXT
  });
};
