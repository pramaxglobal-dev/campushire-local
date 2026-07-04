import { Prisma } from "@prisma/client";
import { UserRole } from "@campushire/types";
import { generateTIN, sanitizeInput } from "@campushire/utils";
import { logActivity } from "./activity";
import { prisma } from "./prisma";

interface CreateExternalCandidateInput {
  tenantId: string;
  email: string;
  phone: string;
  fullName: string;
  createdByUserId: string;
  jobId: string;
}

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const clean = sanitizeInput(fullName.trim());
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "External", lastName: "Candidate" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "External", lastName: "Candidate" };
  }
  return {
    firstName: parts[0] ?? "External",
    lastName: parts.slice(1).join(" ") || "Candidate"
  };
};

const toInputJson = (value: Record<string, unknown>): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export const findOrCreateExternalCandidateUser = async (
  input: CreateExternalCandidateInput
): Promise<{ userId: string; created: boolean }> => {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findFirst({
    where: {
      tenantId: input.tenantId,
      email
    },
    select: { id: true }
  });

  if (existing) {
    return { userId: existing.id, created: false };
  }

  const name = splitFullName(input.fullName);
  const phone = input.phone.trim();
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId: input.tenantId,
        tin: generateTIN(UserRole.JOB_SEEKER),
        email,
        phone,
        firstName: name.firstName,
        lastName: name.lastName,
        role: UserRole.JOB_SEEKER,
        isApproved: true,
        isEmailVerified: false,
        isActive: true,
        metadata: toInputJson({
          source: "FREELANCE_REFERRAL",
          externalCandidate: true,
          lifecycle: "REFERRED_EXTERNAL_CANDIDATE",
          createdByUserId: input.createdByUserId,
          referralJobId: input.jobId
        })
      },
      select: { id: true }
    });

    await tx.jobSeekerProfile.create({
      data: {
        userId: user.id,
        careerScore: 0,
        isProfileComplete: false
      }
    });

    return user;
  });

  await logActivity({
    actorUserId: input.createdByUserId,
    tenantId: input.tenantId,
    action: "user.external_candidate_created",
    entityType: "User",
    entityId: created.id,
    metadata: {
      source: "FREELANCE_REFERRAL",
      jobId: input.jobId,
      email
    }
  });

  return { userId: created.id, created: true };
};
