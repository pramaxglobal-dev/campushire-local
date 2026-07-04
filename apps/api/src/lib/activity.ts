import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";

export interface LogActivityInput {
  actorUserId: string;
  tenantId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const toJsonValue = (value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined => {
  if (!value) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
};

export const logActivity = async (input: LogActivityInput): Promise<void> => {
  try {
    await prisma.activityLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        payload: toJsonValue(input.metadata)
      }
    });
  } catch (error) {
    logger.error(
      {
        error,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorUserId: input.actorUserId
      },
      "Failed to log activity"
    );
  }
};
