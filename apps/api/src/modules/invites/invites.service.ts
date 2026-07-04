import {
  UserRole,
  type Invite,
  type InviteUse,
  type User
} from "@campushire/types";
import { generateInviteCode } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { logActivity } from "../../lib/activity";
import type { CreateInviteDto } from "./invites.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

export interface InviteStats {
  totalInvites: number;
  totalUses: number;
  activeInvites: number;
  studentsRegistered: number;
}

export interface InviteWithUsages extends Invite {
  usages: Array<
    InviteUse & {
      usedBy: Pick<User, "id" | "firstName" | "lastName" | "email" | "role">;
    }
  >;
}

const getCollegeScope = async (collegeId: string): Promise<{ id: string; tenantId: string; adminUserId: string }> => {
  const college = await prisma.collegeProfile.findUnique({
    where: { id: collegeId },
    select: {
      id: true,
      tenantId: true,
      adminUserId: true
    }
  });

  if (!college) {
    throw new ServiceError("College profile not found.", 404);
  }

  return college;
};

const createUniqueInviteCode = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 8) {
    const code = generateInviteCode();
    const existing = await prisma.invite.findUnique({
      where: { code },
      select: { id: true }
    });
    if (!existing) {
      return code;
    }
    attempts += 1;
  }
  throw new ServiceError("Failed to generate unique invite code.", 500);
};

export const createInvite = async (
  collegeId: string,
  createdBy: string,
  dto: CreateInviteDto
): Promise<Invite> => {
  const college = await getCollegeScope(collegeId);
  if (college.adminUserId !== createdBy) {
    throw new ServiceError("Forbidden", 403);
  }

  const code = await createUniqueInviteCode();
  const invite = await prisma.invite.create({
    data: {
      tenantId: college.tenantId,
      collegeProfileId: college.id,
      code,
      maxUses: dto.maxUses ?? 50,
      expiresAt: dto.expiresAt ?? null,
      createdByUserId: createdBy,
      isActive: true
    }
  });

  await logActivity({
    actorUserId: createdBy,
    tenantId: college.tenantId,
    action: "invite.created",
    entityType: "Invite",
    entityId: invite.id,
    metadata: {
      collegeId: college.id,
      maxUses: invite.maxUses
    }
  });

  return invite;
};

export const listInvites = async (collegeId: string): Promise<InviteWithUsages[]> => {
  const college = await getCollegeScope(collegeId);

  const invites = await prisma.invite.findMany({
    where: {
      collegeProfileId: college.id,
      tenantId: college.tenantId
    },
    include: {
      uses: {
        orderBy: {
          usedAt: "desc"
        },
        take: 10,
        include: {
          usedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return invites.map((invite) => ({
    ...invite,
    usages: invite.uses
  }));
};

export const deactivateInvite = async (inviteId: string, collegeId: string): Promise<Invite> => {
  const college = await getCollegeScope(collegeId);

  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId,
      collegeProfileId: college.id,
      tenantId: college.tenantId
    }
  });

  if (!invite) {
    throw new ServiceError("Invite not found.", 404);
  }

  const updated = await prisma.invite.update({
    where: { id: invite.id },
    data: { isActive: false }
  });

  await logActivity({
    actorUserId: college.adminUserId,
    tenantId: college.tenantId,
    action: "invite.deactivated",
    entityType: "Invite",
    entityId: updated.id,
    metadata: {
      collegeId: college.id
    }
  });

  return updated;
};

export const validateInviteCode = async (
  code: string
): Promise<{ valid: boolean; invite?: Invite; reason?: string }> => {
  const invite = await prisma.invite.findUnique({
    where: { code: code.trim() }
  });

  if (!invite) {
    return { valid: false, reason: "Invite not found." };
  }

  if (!invite.isActive) {
    return { valid: false, reason: "Invite inactive." };
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "Invite expired." };
  }

  if (invite.usedCount >= invite.maxUses) {
    return { valid: false, reason: "Invite usage limit exceeded." };
  }

  return { valid: true, invite };
};

export const getInviteStats = async (collegeId: string): Promise<InviteStats> => {
  const college = await getCollegeScope(collegeId);

  const [totalInvites, activeInvites, inviteAgg, studentsRegistered] = await prisma.$transaction([
    prisma.invite.count({
      where: {
        tenantId: college.tenantId,
        collegeProfileId: college.id
      }
    }),
    prisma.invite.count({
      where: {
        tenantId: college.tenantId,
        collegeProfileId: college.id,
        isActive: true
      }
    }),
    prisma.invite.aggregate({
      where: {
        tenantId: college.tenantId,
        collegeProfileId: college.id
      },
      _sum: {
        usedCount: true
      }
    }),
    prisma.inviteUse.count({
      where: {
        invite: {
          tenantId: college.tenantId,
          collegeProfileId: college.id
        },
        usedBy: {
          role: UserRole.STUDENT
        }
      }
    })
  ]);

  return {
    totalInvites,
    totalUses: inviteAgg._sum.usedCount ?? 0,
    activeInvites,
    studentsRegistered
  };
};

export const getCollegeIdForAdmin = async (adminUserId: string, tenantId: string | null): Promise<string> => {
  const college = await prisma.collegeProfile.findFirst({
    where: {
      adminUserId,
      tenantId: tenantId ?? undefined
    },
    select: { id: true }
  });

  if (!college) {
    throw new ServiceError("College profile not found for this admin.", 404);
  }

  return college.id;
};
