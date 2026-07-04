import { Prisma } from "@prisma/client";
import type {
  Notification,
  NotificationPreference,
  PaginatedResponse
} from "@campushire/types";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { logActivity } from "../../lib/activity";
import { resolveExistingUserTenantOrNull as getUserTenantOrNull } from "../../lib/tenant";
import type { UpdatePreferencesDto } from "./notifications.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

const unreadCacheKey = (userId: string): string => `notif:unread:${userId}`;

const getUserTenant = async (userId: string): Promise<string> => {
  const tenantId = await getUserTenantOrNull(userId);
  if (!tenantId) {
    throw new ServiceError("User not found in tenant scope.", 404);
  }
  return tenantId;
};

const invalidateUnreadCount = async (userId: string): Promise<void> => {
  await redis.del(unreadCacheKey(userId));
};

export const getNotifications = async (
  userId: string,
  page: number,
  limit: number,
  unreadOnly?: boolean
): Promise<PaginatedResponse<Notification[]>> => {
  const tenantId = await getUserTenantOrNull(userId);
  if (!tenantId) {
    return {
      success: true,
      data: [],
      error: null,
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 1
      }
    };
  }

  const where: Prisma.NotificationWhereInput = {
    tenantId,
    userId,
    ...(unreadOnly ? { isRead: false } : {})
  };

  const [total, data] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
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

export const getUnreadCount = async (userId: string): Promise<number> => {
  const key = unreadCacheKey(userId);
  const cached = await redis.get(key);
  if (cached) {
    const parsed = Number.parseInt(cached, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  const tenantId = await getUserTenantOrNull(userId);
  if (!tenantId) {
    await redis.set(key, "0", "EX", 30);
    return 0;
  }

  const count = await prisma.notification.count({
    where: {
      tenantId,
      userId,
      isRead: false
    }
  });
  await redis.set(key, String(count), "EX", 30);
  return count;
};

export const markAsRead = async (notificationId: string, userId: string): Promise<void> => {
  const tenantId = await getUserTenantOrNull(userId);
  if (!tenantId) {
    return;
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      tenantId,
      userId
    },
    select: { id: true }
  });

  if (!notification) {
    throw new ServiceError("Notification not found.", 404);
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  await invalidateUnreadCount(userId);
  await logActivity({
    actorUserId: userId,
    tenantId,
    action: "notification.read",
    entityType: "Notification",
    entityId: notification.id
  });
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  const tenantId = await getUserTenantOrNull(userId);
  if (!tenantId) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      tenantId,
      userId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  await invalidateUnreadCount(userId);
  await logActivity({
    actorUserId: userId,
    tenantId,
    action: "notification.read_all",
    entityType: "Notification",
    entityId: userId
  });
};

export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
  const tenantId = await getUserTenant(userId);
  const deleted = await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      tenantId,
      userId
    }
  });

  if (deleted.count === 0) {
    throw new ServiceError("Notification not found.", 404);
  }

  await invalidateUnreadCount(userId);
  await logActivity({
    actorUserId: userId,
    tenantId,
    action: "notification.deleted",
    entityType: "Notification",
    entityId: notificationId
  });
};

export const getPreferences = async (userId: string): Promise<NotificationPreference[]> => {
  const tenantId = await getUserTenantOrNull(userId);
  if (!tenantId) {
    return [];
  }

  return prisma.notificationPreference.findMany({
    where: {
      userId,
      OR: [{ tenantId }, { tenantId: null }]
    },
    orderBy: [{ type: "asc" }, { channel: "asc" }]
  });
};

export const updatePreferences = async (
  userId: string,
  dto: UpdatePreferencesDto
): Promise<NotificationPreference[]> => {
  const tenantId = await getUserTenantOrNull(userId);
  if (!tenantId) {
    return [];
  }

  const writes = dto.preferences.map((preference) =>
    prisma.notificationPreference.upsert({
      where: {
        userId_type_channel: {
          userId,
          type: preference.type,
          channel: preference.channel
        }
      },
      update: {
        tenantId,
        isEnabled: preference.isEnabled
      },
      create: {
        tenantId,
        userId,
        type: preference.type,
        channel: preference.channel,
        isEnabled: preference.isEnabled
      }
    })
  );

  await prisma.$transaction(writes);
  await logActivity({
    actorUserId: userId,
    tenantId,
    action: "notification.preferences_updated",
    entityType: "NotificationPreference",
    entityId: userId,
    metadata: {
      updated: dto.preferences.length
    }
  });

  return getPreferences(userId);
};
