import { Prisma } from "@prisma/client";
import type { PaginatedResponse, Tenant } from "@campushire/types";
import { generateSlug, sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import type { CreateTenantDto, UpdateTenantDto } from "./tenants.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

export interface TenantStats {
  userCount: number;
  jobCount: number;
  applicationCount: number;
}

const uniqueSlug = async (base: string): Promise<string> => {
  const seed = generateSlug(base) || "tenant";
  let slug = seed;
  let attempt = 1;

  for (;;) {
    const exists = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) {
      return slug;
    }

    slug = `${seed}-${attempt}`;
    attempt += 1;
  }
};

export const listTenants = async (
  page: number,
  limit: number,
  search?: string
): Promise<PaginatedResponse<Tenant[]>> => {
  const where: Prisma.TenantWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { primaryDomain: { contains: search, mode: "insensitive" } }
        ]
      }
    : {};

  const [total, tenants] = await prisma.$transaction([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
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
    data: tenants,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};

export const createTenant = async (dto: CreateTenantDto): Promise<Tenant> => {
  const slug = dto.slug ? generateSlug(dto.slug) : await uniqueSlug(dto.name);
  const settings = dto.settings ? (dto.settings as Prisma.InputJsonValue) : Prisma.JsonNull;

  const tenant = await prisma.tenant.create({
    data: {
      name: sanitizeInput(dto.name),
      slug,
      plan: dto.plan,
      isWhiteLabel: dto.isWhiteLabel,
      primaryDomain: dto.primaryDomain?.trim() || null,
      supportEmail: dto.supportEmail?.trim() || null,
      supportPhone: dto.supportPhone?.trim() || null,
      timezone: dto.timezone,
      country: dto.country,
      settings,
      isActive: true
    }
  });

  return tenant;
};

export const getTenant = async (id: string): Promise<Tenant> => {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new ServiceError("Tenant not found.", 404);
  }

  return tenant;
};

export const updateTenant = async (id: string, dto: UpdateTenantDto): Promise<Tenant> => {
  const existing = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new ServiceError("Tenant not found.", 404);
  }

  const settings = dto.settings ? (dto.settings as Prisma.InputJsonValue) : undefined;

  const data: Prisma.TenantUpdateInput = {
    name: dto.name ? sanitizeInput(dto.name) : undefined,
    slug: dto.slug ? generateSlug(dto.slug) : undefined,
    plan: dto.plan,
    isWhiteLabel: dto.isWhiteLabel,
    primaryDomain: dto.primaryDomain?.trim() || undefined,
    supportEmail: dto.supportEmail?.trim() || undefined,
    supportPhone: dto.supportPhone?.trim() || undefined,
    timezone: dto.timezone,
    country: dto.country,
    settings
  };

  return prisma.tenant.update({
    where: { id },
    data
  });
};

export const toggleTenantActive = async (id: string): Promise<Tenant> => {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new ServiceError("Tenant not found.", 404);
  }

  return prisma.tenant.update({
    where: { id },
    data: {
      isActive: !tenant.isActive
    }
  });
};

export const getTenantStats = async (id: string): Promise<TenantStats> => {
  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
  if (!tenant) {
    throw new ServiceError("Tenant not found.", 404);
  }

  const [userCount, jobCount, applicationCount] = await prisma.$transaction([
    prisma.user.count({ where: { tenantId: id } }),
    prisma.job.count({ where: { tenantId: id } }),
    prisma.application.count({ where: { tenantId: id } })
  ]);

  return {
    userCount,
    jobCount,
    applicationCount
  };
};
