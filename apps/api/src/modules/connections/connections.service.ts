import {
  ConnectionStatus,
  NotificationChannel,
  NotificationType,
  type CollegeRecruiterConnection,
  type PaginatedResponse
} from "@campushire/types";
import { sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import { resolveUserTenant as getUserTenantId } from "../../lib/tenant";
import {
  notifyConnectionApproved,
  notifyConnectionRequest,
  sendNotification
} from "../../lib/notification";
import type { BrowseCollegeQueryDto } from "./connections.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

const getRecruiterProfileByUser = async (recruiterUserId: string, tenantId: string) => {
  const profile = await prisma.recruiterProfile.findFirst({
    where: {
      userId: recruiterUserId,
      tenantId
    }
  });
  if (!profile) {
    throw new ServiceError("Recruiter profile not found.", 404);
  }
  return profile;
};

const getCollegeAdminCollege = async (collegeAdminUserId: string, tenantId: string) => {
  const college = await prisma.collegeProfile.findFirst({
    where: {
      adminUserId: collegeAdminUserId,
      tenantId
    }
  });
  if (!college) {
    throw new ServiceError("College profile not found.", 404);
  }
  return college;
};

export const requestConnection = async (
  recruiterId: string,
  collegeId: string,
  message: string,
  tenantId?: string
): Promise<CollegeRecruiterConnection> => {
  const scopedTenantId = tenantId ?? (await getUserTenantId(recruiterId));
  const [recruiterProfile, college] = await Promise.all([
    getRecruiterProfileByUser(recruiterId, scopedTenantId),
    prisma.collegeProfile.findUnique({
      where: {
        id: collegeId
      }
    })
  ]);

  if (!college) {
    throw new ServiceError("College profile not found.", 404);
  }

  const existing = await prisma.collegeRecruiterConnection.findFirst({
    where: {
      collegeProfileId: college.id,
      recruiterProfileId: recruiterProfile.id,
      status: {
        in: [ConnectionStatus.PENDING, ConnectionStatus.APPROVED]
      }
    }
  });

  if (existing) {
    throw new ServiceError("Connection already pending or approved.", 409);
  }

  const connection = await prisma.collegeRecruiterConnection.create({
    data: {
      tenantId: college.tenantId,
      collegeProfileId: college.id,
      recruiterProfileId: recruiterProfile.id,
      status: ConnectionStatus.PENDING,
      note: sanitizeInput(message),
      initiatedByUserId: recruiterId
    }
  });

  await notifyConnectionRequest(college, recruiterProfile);
  await logActivity({
    actorUserId: recruiterId,
    tenantId: college.tenantId,
    action: "connection.requested",
    entityType: "CollegeRecruiterConnection",
    entityId: connection.id,
    metadata: {
      collegeId: college.id,
      recruiterProfileId: recruiterProfile.id
    }
  });

  return connection;
};

export const respondToConnection = async (
  connectionId: string,
  collegeAdminUserId: string,
  action: "approve" | "reject",
  tenantId?: string
): Promise<CollegeRecruiterConnection> => {
  const scopedTenantId = tenantId ?? (await getUserTenantId(collegeAdminUserId));
  const college = await getCollegeAdminCollege(collegeAdminUserId, scopedTenantId);
  const connection = await prisma.collegeRecruiterConnection.findFirst({
    where: {
      id: connectionId,
      tenantId: scopedTenantId,
      collegeProfileId: college.id
    },
    include: {
      recruiterProfile: true,
      collegeProfile: true
    }
  });

  if (!connection) {
    throw new ServiceError("Connection not found.", 404);
  }

  if (connection.status !== ConnectionStatus.PENDING) {
    throw new ServiceError("Only pending requests can be updated.", 400);
  }

  const status = action === "approve" ? ConnectionStatus.APPROVED : ConnectionStatus.REJECTED;
  const updated = await prisma.collegeRecruiterConnection.update({
    where: { id: connection.id },
    data: {
      status,
      respondedByUserId: collegeAdminUserId,
      respondedAt: new Date()
    }
  });

  if (status === ConnectionStatus.APPROVED) {
    await notifyConnectionApproved(connection.collegeProfile, connection.recruiterProfile);
  } else {
    await sendNotification({
      userId: connection.recruiterProfile.userId,
      type: NotificationType.CONNECTION_REQUEST,
      title: "College Connection Rejected",
      body: `${connection.collegeProfile.name} rejected your connection request.`,
      contextType: "COLLEGE_RECRUITER",
      contextId: connection.id,
      actionUrl: "/connections",
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    });
  }

  await logActivity({
    actorUserId: collegeAdminUserId,
    tenantId: scopedTenantId,
    action: status === ConnectionStatus.APPROVED ? "connection.approved" : "connection.rejected",
    entityType: "CollegeRecruiterConnection",
    entityId: updated.id
  });

  return updated;
};

export const listConnectionsForCollege = async (
  collegeId: string,
  status?: ConnectionStatus,
  tenantId?: string
) => {
  if (!tenantId) {
    throw new ServiceError("Tenant scope missing.", 400);
  }
  const college = await prisma.collegeProfile.findFirst({
    where: {
      id: collegeId,
      tenantId
    },
    select: { id: true, tenantId: true }
  });

  if (!college) {
    throw new ServiceError("College profile not found.", 404);
  }

  return prisma.collegeRecruiterConnection.findMany({
    where: {
      tenantId,
      collegeProfileId: college.id,
      status
    },
    include: {
      recruiterProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
};

export const listConnectionsForRecruiter = async (
  recruiterId: string,
  status?: ConnectionStatus,
  tenantId?: string
) => {
  const scopedTenantId = tenantId ?? (await getUserTenantId(recruiterId));
  const recruiterProfile = await getRecruiterProfileByUser(recruiterId, scopedTenantId);

  return prisma.collegeRecruiterConnection.findMany({
    where: {
      recruiterProfileId: recruiterProfile.id,
      status
    },
    include: {
      collegeProfile: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
};

export const disconnectConnection = async (
  connectionId: string,
  userId: string,
  _tenantId?: string
): Promise<void> => {
  const connection = await prisma.collegeRecruiterConnection.findFirst({
    where: {
      id: connectionId
    },
    include: {
      collegeProfile: true,
      recruiterProfile: true
    }
  });

  if (!connection) {
    throw new ServiceError("Connection not found.", 404);
  }

  const canDisconnect =
    connection.collegeProfile.adminUserId === userId ||
    connection.recruiterProfile.userId === userId ||
    connection.initiatedByUserId === userId;

  if (!canDisconnect) {
    throw new ServiceError("Forbidden", 403);
  }

  await prisma.collegeRecruiterConnection.update({
    where: { id: connection.id },
    data: {
      status: ConnectionStatus.DISCONNECTED,
      respondedByUserId: userId,
      respondedAt: new Date()
    }
  });

  await logActivity({
    actorUserId: userId,
    tenantId: connection.tenantId,
    action: "connection.disconnected",
    entityType: "CollegeRecruiterConnection",
    entityId: connection.id
  });
};

export const getConnectionStatus = async (
  recruiterId: string,
  collegeId: string,
  tenantId?: string
): Promise<ConnectionStatus | null> => {
  const college = await prisma.collegeProfile.findUnique({
    where: { id: collegeId },
    select: { id: true, tenantId: true }
  });

  if (!college) {
    return null;
  }

  const scopedTenantId = tenantId ?? college.tenantId;
  if (tenantId && college.tenantId !== tenantId) {
    return null;
  }

  const recruiterProfile = await getRecruiterProfileByUser(recruiterId, scopedTenantId);

  const connection = await prisma.collegeRecruiterConnection.findFirst({
    where: {
      collegeProfileId: college.id,
      recruiterProfileId: recruiterProfile.id
    },
    select: {
      status: true
    }
  });

  return connection?.status ?? null;
};

export interface BrowseCollegeItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  openForPlacement: boolean;
  connectionStatus: ConnectionStatus | null;
}

export const browseCollegesForRecruiter = async (
  recruiterId: string,
  query: BrowseCollegeQueryDto,
  tenantId?: string
): Promise<PaginatedResponse<BrowseCollegeItem[]>> => {
  const scopedTenantId = tenantId ?? (await getUserTenantId(recruiterId));
  const recruiterProfile = await getRecruiterProfileByUser(recruiterId, scopedTenantId);

  const where = {
    tenantId: scopedTenantId,
    openForPlacement: true,
    ...(query.search
      ? {
          name: {
            contains: query.search,
            mode: "insensitive" as const
          }
        }
      : {})
  };

  const [total, colleges] = await prisma.$transaction([
    prisma.collegeProfile.count({ where }),
    prisma.collegeProfile.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        openForPlacement: true
      },
      orderBy: {
        name: "asc"
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  const collegeIds = colleges.map((college) => college.id);
  const connections = collegeIds.length
    ? await prisma.collegeRecruiterConnection.findMany({
        where: {
          recruiterProfileId: recruiterProfile.id,
          collegeProfileId: {
            in: collegeIds
          }
        },
        select: {
          collegeProfileId: true,
          status: true
        }
      })
    : [];

  const connectionByCollegeId = new Map(
    connections.map((connection) => [connection.collegeProfileId, connection.status])
  );

  const items: BrowseCollegeItem[] = colleges.map((college) => ({
    ...college,
    connectionStatus: connectionByCollegeId.get(college.id) ?? null
  }));

  return {
    success: true,
    data: items,
    error: null,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit))
    }
  };
};

export const getCollegeIdForAdmin = async (adminUserId: string, tenantId?: string): Promise<string> => {
  const scopedTenantId = tenantId ?? (await getUserTenantId(adminUserId));
  const college = await getCollegeAdminCollege(adminUserId, scopedTenantId);
  return college.id;
};
