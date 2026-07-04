import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import {
  ApplicationStatus,
  CommissionTrigger,
  CommissionType,
  InvoiceStatus,
  NotificationChannel,
  NotificationType,
  ReferralStatus,
  UserRole,
  type FreelanceReferral,
  type Invoice,
  type PaginatedResponse
} from "@campushire/types";
import { sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { logActivity } from "../../lib/activity";
import { sendNotification } from "../../lib/notification";
import { writeApplicationStatusHistory } from "../../lib/application-history";
import { resolveUserTenantProfile as getUserWithTenant } from "../../lib/tenant";
import { findOrCreateExternalCandidateUser } from "../../lib/external-candidate";
import type { CreateReferralDto, ReferralFilters } from "./freelance.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  triggeredCount: number;
  totalEarnings: number;
  pendingAmount: number;
  paidAmount: number;
}

interface ReferralDetail extends FreelanceReferral {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  job: {
    id: string;
    title: string;
    recruiterCompany: string;
    minCtc: number | null;
    maxCtc: number | null;
  };
  applicationStatus: ApplicationStatus | null;
  commissionAmount: number | null;
}

const PLATFORM_COMMISSION_KEY = "DEFAULT_REFERRAL_PLATFORM_COMMISSION_PCT";
const triggeredReferralStates: ReferralStatus[] = [
  ReferralStatus.TRIGGERED,
  ReferralStatus.INVOICED,
  ReferralStatus.PAID
];

const getFreelancerProfile = async (freelancerId: string, tenantId: string) => {
  const profile = await prisma.freelanceRecruiterProfile.findFirst({
    where: {
      userId: freelancerId,
      tenantId
    },
    select: {
      id: true,
      tenantId: true,
      userId: true
    }
  });

  if (!profile) {
    throw new ServiceError("Freelance recruiter profile not found.", 404);
  }

  return profile;
};

const getPlatformCommissionPct = async (): Promise<number> => {
  const setting = await prisma.platformSetting.findFirst({
    where: {
      tenantId: null,
      key: PLATFORM_COMMISSION_KEY
    },
    select: {
      value: true
    }
  });

  if (!setting) {
    return 10;
  }

  const raw = setting.value;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, raw);
  }

  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 10;
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const nested = (raw as Record<string, unknown>).pct;
    if (typeof nested === "number" && Number.isFinite(nested)) {
      return Math.max(0, nested);
    }
  }

  return 10;
};

const buildInvoiceNumber = (): string => {
  const date = new Date();
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `INV-REF-${y}${m}${d}-${nanoid(6).toUpperCase()}`;
};

const resolveCandidateUserId = async (
  tenantId: string,
  freelancerId: string,
  dto: CreateReferralDto
): Promise<string> => {
  if (dto.candidateUserId) {
    const candidate = await prisma.user.findFirst({
      where: {
        id: dto.candidateUserId,
        tenantId,
        role: {
          in: [UserRole.STUDENT, UserRole.JOB_SEEKER]
        }
      },
      select: { id: true }
    });

    if (!candidate) {
      throw new ServiceError("Candidate not found in tenant scope.", 404);
    }

    return candidate.id;
  }

  const email = dto.candidateEmail?.toLowerCase().trim();
  const name = dto.candidateName?.trim();
  const phone = dto.candidatePhone?.trim();

  if (!email || !name || !phone) {
    throw new ServiceError("External candidate details are required.", 400);
  }

  const candidate = await findOrCreateExternalCandidateUser({
    tenantId,
    email,
    phone,
    fullName: name,
    createdByUserId: freelancerId,
    jobId: dto.jobId
  });

  return candidate.userId;
};

const getReferralForApplication = async (applicationId: string) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        select: {
          id: true,
          tenantId: true,
          title: true,
          maxCtc: true,
          minCtc: true,
          referralCommissionTrigger: true
        }
      }
    }
  });

  if (!application) {
    throw new ServiceError("Application not found.", 404);
  }

  const referral = await prisma.freelanceReferral.findFirst({
    where: {
      tenantId: application.tenantId,
      jobId: application.jobId,
      candidateUserId: application.candidateUserId
    },
    include: {
      recruiterProfile: {
        select: {
          userId: true,
          companyName: true
        }
      },
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (!referral) {
    throw new ServiceError("Referral not found for application.", 404);
  }

  return { application, referral };
};

const computeCommissionAmount = (
  referral: Pick<FreelanceReferral, "commissionType" | "commissionValue">,
  salaryMin: number | null,
  salaryMax: number | null
): number => {
  if (referral.commissionType === CommissionType.FLAT) {
    return Math.round(referral.commissionValue);
  }

  const salaryBasis = salaryMax ?? salaryMin ?? 0;
  return Math.round((salaryBasis * referral.commissionValue) / 100);
};

export const createReferral = async (
  freelancerId: string,
  dto: CreateReferralDto
): Promise<FreelanceReferral> => {
  const actor = await getUserWithTenant(freelancerId);
  const freelanceProfile = await getFreelancerProfile(actor.id, actor.tenantId);

  const job = await prisma.job.findFirst({
    where: {
      id: dto.jobId,
      tenantId: actor.tenantId,
      isFreelanceReferralAllowed: true,
      referralCommissionType: { not: null },
      referralCommissionValue: { not: null },
      referralCommissionTrigger: { not: null }
    },
    include: {
      recruiterProfile: {
        select: {
          id: true,
          userId: true,
          companyName: true
        }
      }
    }
  });

  if (!job) {
    throw new ServiceError("Commission-enabled job not found.", 404);
  }

  const candidateUserId = await resolveCandidateUserId(actor.tenantId, freelancerId, dto);

  const existingApplication = await prisma.application.findFirst({
    where: {
      tenantId: actor.tenantId,
      jobId: job.id,
      candidateUserId
    },
    select: { id: true }
  });

  if (existingApplication) {
    throw new ServiceError("Candidate already applied to this job.", 409);
  }

  const existingReferral = await prisma.freelanceReferral.findFirst({
    where: {
      tenantId: actor.tenantId,
      jobId: job.id,
      candidateUserId,
      freelanceRecruiterProfileId: freelanceProfile.id
    },
    select: { id: true }
  });

  if (existingReferral) {
    throw new ServiceError("Referral already exists for this candidate and job.", 409);
  }

  const referral = await prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        tenantId: actor.tenantId,
        jobId: job.id,
        candidateUserId,
        status: ApplicationStatus.APPLIED,
        source: `FREELANCE_REFERRAL:${freelancerId}`,
        appliedAt: new Date()
      }
    });

    await writeApplicationStatusHistory(tx, {
      applicationId: application.id,
      fromStatus: null,
      toStatus: ApplicationStatus.APPLIED,
      note: "Created via freelance referral",
      changedByUserId: freelancerId
    });

    await tx.job.update({
      where: { id: job.id },
      data: {
        applyCount: {
          increment: 1
        }
      }
    });

    const created = await tx.freelanceReferral.create({
      data: {
        tenantId: actor.tenantId,
        jobId: job.id,
        recruiterProfileId: job.recruiterProfile.id,
        freelanceRecruiterProfileId: freelanceProfile.id,
        candidateUserId,
        referredByUserId: freelancerId,
        status: ReferralStatus.ACTIVE,
        commissionType: job.referralCommissionType as CommissionType,
        commissionValue: job.referralCommissionValue as number,
        commissionTrigger: job.referralCommissionTrigger as CommissionTrigger,
        note: dto.candidateUserId
          ? "Referred internal candidate"
          : `Referred external candidate ${sanitizeInput(dto.candidateName ?? "Candidate")}`
      }
    });

    await tx.freelanceRecruiterProfile.update({
      where: {
        id: freelanceProfile.id
      },
      data: {
        totalReferrals: {
          increment: 1
        }
      }
    });

    return created;
  });

  await sendNotification({
    userId: job.recruiterProfile.userId,
    type: NotificationType.APPLICATION_STATUS,
    title: "New Referred Candidate",
    body: `A freelance recruiter referred a candidate for ${job.title}.`,
    contextType: "REFERRAL",
    contextId: referral.id,
    actionUrl: `/dashboard/ats/${job.id}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
  });

  await logActivity({
    actorUserId: freelancerId,
    tenantId: actor.tenantId,
    action: "freelance.referral_created",
    entityType: "FreelanceReferral",
    entityId: referral.id,
    metadata: {
      jobId: job.id,
      candidateUserId
    }
  });

  return referral;
};

export const getReferrals = async (
  freelancerId: string,
  filters: ReferralFilters,
  page: number,
  limit: number
): Promise<PaginatedResponse<ReferralDetail[]>> => {
  const actor = await getUserWithTenant(freelancerId);
  const profile = await getFreelancerProfile(actor.id, actor.tenantId);

  const where: Prisma.FreelanceReferralWhereInput = {
    tenantId: actor.tenantId,
    freelanceRecruiterProfileId: profile.id,
    status: filters.status,
    ...(filters.search
      ? {
          OR: [
            { candidate: { firstName: { contains: filters.search, mode: "insensitive" } } },
            { candidate: { lastName: { contains: filters.search, mode: "insensitive" } } },
            { job: { title: { contains: filters.search, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [total, rows] = await prisma.$transaction([
    prisma.freelanceReferral.count({ where }),
    prisma.freelanceReferral.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        job: {
          include: {
            recruiterProfile: {
              select: {
                companyName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const items = await Promise.all(
    rows.map(async (row) => {
      const application = await prisma.application.findFirst({
        where: {
          tenantId: actor.tenantId,
          jobId: row.jobId,
          candidateUserId: row.candidateUserId
        },
        select: {
          status: true
        }
      });

      const commissionAmount =
        row.status === ReferralStatus.TRIGGERED ||
        row.status === ReferralStatus.INVOICED ||
        row.status === ReferralStatus.PAID
          ? computeCommissionAmount(row, row.job.minCtc, row.job.maxCtc)
          : null;

      const detail: ReferralDetail = {
        ...row,
        candidate: row.candidate,
        job: {
          id: row.job.id,
          title: row.job.title,
          recruiterCompany: row.job.recruiterProfile.companyName,
          minCtc: row.job.minCtc,
          maxCtc: row.job.maxCtc
        },
        applicationStatus: application?.status ?? null,
        commissionAmount
      };

      return detail;
    })
  );

  return {
    success: true,
    data: items,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const triggerCommission = async (applicationId: string): Promise<FreelanceReferral> => {
  const { application, referral } = await getReferralForApplication(applicationId);

  if (
    referral.status === ReferralStatus.TRIGGERED ||
    referral.status === ReferralStatus.INVOICED ||
    referral.status === ReferralStatus.PAID
  ) {
    return referral;
  }

  const shouldTrigger =
    (referral.commissionTrigger === CommissionTrigger.ON_OFFER &&
      application.status === ApplicationStatus.OFFERED) ||
    (referral.commissionTrigger === CommissionTrigger.ON_JOINING &&
      application.status === ApplicationStatus.HIRED);

  if (!shouldTrigger) {
    throw new ServiceError("Commission trigger stage not reached.", 400);
  }

  const grossAmount = computeCommissionAmount(
    referral,
    application.job.minCtc,
    application.job.maxCtc
  );
  const platformPct = await getPlatformCommissionPct();
  const platformCut = Math.round((grossAmount * platformPct) / 100);
  const netAmount = Math.max(0, grossAmount - platformCut);
  const now = new Date();

  const updatedReferral = await prisma.$transaction(async (tx) => {
    const updated = await tx.freelanceReferral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.TRIGGERED,
        triggeredAt: now,
        note: `Gross: ${grossAmount}, platformCutPct: ${platformPct}, platformCut: ${platformCut}, net: ${netAmount}`
      }
    });

    await tx.invoice.create({
      data: {
        tenantId: referral.tenantId,
        referralId: referral.id,
        invoiceNumber: buildInvoiceNumber(),
        issuerUserId: referral.referredByUserId,
        billedToUserId: referral.recruiterProfile.userId,
        subtotal: grossAmount,
        taxAmount: platformCut,
        totalAmount: netAmount,
        status: InvoiceStatus.SENT,
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        note: "Auto-generated on commission trigger"
      }
    });

    return updated;
  });

  await sendNotification({
    userId: referral.referredByUserId,
    type: NotificationType.COMMISSION_TRIGGERED,
    title: "Commission Triggered",
    body: `Your referral for ${application.job.title} has triggered commission.`,
    contextType: "REFERRAL",
    contextId: referral.id,
    actionUrl: "/dashboard/freelance",
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
  });

  await logActivity({
    actorUserId: referral.referredByUserId,
    tenantId: referral.tenantId,
    action: "freelance.commission_triggered",
    entityType: "FreelanceReferral",
    entityId: referral.id,
    metadata: {
      applicationId,
      grossAmount,
      platformCut,
      netAmount
    }
  });

  return updatedReferral;
};

export const generateReferralLink = async (
  freelancerId: string,
  jobId: string
): Promise<{ link: string; code: string }> => {
  const actor = await getUserWithTenant(freelancerId);
  await getFreelancerProfile(actor.id, actor.tenantId);

  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      tenantId: actor.tenantId,
      isFreelanceReferralAllowed: true
    },
    select: {
      id: true
    }
  });

  if (!job) {
    throw new ServiceError("Commission-enabled job not found.", 404);
  }

  const code = `REF-${freelancerId.slice(0, 6).toUpperCase()}-${job.id.slice(0, 6).toUpperCase()}-${nanoid(4).toUpperCase()}`;

  await redis.set(
    `ref:${code}`,
    JSON.stringify({
      freelancerId,
      jobId: job.id,
      tenantId: actor.tenantId
    }),
    "EX",
    30 * 24 * 60 * 60
  );

  const frontendBase = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(":4000", ":3000")
    : "http://localhost:3000";
  const link = `${frontendBase}/dashboard/jobs/${job.id}?ref=${code}`;

  await logActivity({
    actorUserId: freelancerId,
    tenantId: actor.tenantId,
    action: "freelance.referral_link_generated",
    entityType: "Job",
    entityId: job.id,
    metadata: {
      code
    }
  });

  return { link, code };
};

export const getReferralStats = async (freelancerId: string): Promise<ReferralStats> => {
  const actor = await getUserWithTenant(freelancerId);
  const profile = await getFreelancerProfile(actor.id, actor.tenantId);

  const referrals = await prisma.freelanceReferral.findMany({
    where: {
      tenantId: actor.tenantId,
      freelanceRecruiterProfileId: profile.id
    },
    include: {
      job: {
        select: {
          minCtc: true,
          maxCtc: true
        }
      }
    }
  });

  const referralIds = referrals.map((row) => row.id);
  const invoices = referralIds.length
    ? await prisma.invoice.findMany({
        where: {
          tenantId: actor.tenantId,
          referralId: { in: referralIds }
        },
        select: {
          totalAmount: true,
          status: true
        }
      })
    : [];

  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter((row) => row.status === ReferralStatus.ACTIVE).length;
  const triggeredCount = referrals.filter((row) => triggeredReferralStates.includes(row.status)).length;

  const totalEarnings = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const pendingAmount = invoices
    .filter((invoice) => invoice.status !== InvoiceStatus.PAID)
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const paidAmount = invoices
    .filter((invoice) => invoice.status === InvoiceStatus.PAID)
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  return {
    totalReferrals,
    activeReferrals,
    triggeredCount,
    totalEarnings,
    pendingAmount,
    paidAmount
  };
};

export const getInvoices = async (
  freelancerId: string,
  page: number,
  limit: number
): Promise<PaginatedResponse<Invoice[]>> => {
  const actor = await getUserWithTenant(freelancerId);
  const profile = await getFreelancerProfile(actor.id, actor.tenantId);

  const referralIds = await prisma.freelanceReferral.findMany({
    where: {
      tenantId: actor.tenantId,
      freelanceRecruiterProfileId: profile.id
    },
    select: { id: true }
  });

  const ids = referralIds.map((row) => row.id);
  if (ids.length === 0) {
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

  const where: Prisma.InvoiceWhereInput = {
    tenantId: actor.tenantId,
    referralId: {
      in: ids
    }
  };

  const [total, data] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
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

export const getInvoiceDetail = async (
  invoiceId: string,
  freelancerId: string
): Promise<Invoice> => {
  const actor = await getUserWithTenant(freelancerId);
  await getFreelancerProfile(actor.id, actor.tenantId);

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tenantId: actor.tenantId,
      referral: {
        freelanceRecruiterProfile: {
          userId: freelancerId,
          tenantId: actor.tenantId
        }
      }
    }
  });

  if (!invoice) {
    throw new ServiceError("Invoice not found.", 404);
  }

  return invoice;
};

export const markInvoicePaid = async (invoiceId: string, adminId: string): Promise<Invoice> => {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      role: true
    }
  });

  if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
    throw new ServiceError("Forbidden", 403);
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      referral: true
    }
  });

  if (!invoice) {
    throw new ServiceError("Invoice not found.", 404);
  }

  const paid = await prisma.$transaction(async (tx) => {
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date()
      }
    });

    if (invoice.referralId && invoice.referral) {
      await tx.freelanceReferral.update({
        where: { id: invoice.referralId },
        data: {
          status: ReferralStatus.PAID,
          paidAt: new Date()
        }
      });
    }

    return updatedInvoice;
  });

  if (invoice.referral) {
    await sendNotification({
      userId: invoice.referral.referredByUserId,
      type: NotificationType.SYSTEM,
      title: "Invoice Paid",
      body: `Invoice ${invoice.invoiceNumber} has been marked as paid.`,
      contextType: "REFERRAL",
      contextId: invoice.referral.id,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
    });
  }

  await logActivity({
    actorUserId: adminId,
    tenantId: invoice.tenantId,
    action: "freelance.invoice_marked_paid",
    entityType: "Invoice",
    entityId: paid.id
  });

  return paid;
};
