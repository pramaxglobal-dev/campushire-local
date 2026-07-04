import path from "path";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import type { Tenant, WhiteLabelConfig } from "@campushire/types";
import { sanitizeInput } from "@campushire/utils";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { generateFileKey, getPresignedUrl, uploadFile } from "../../lib/s3";
import type { WhiteLabelConfigDto } from "./whitelabel.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

export interface ThemePreviewData {
  tenantId: string;
  tenantName: string;
  slug: string;
  isWhiteLabel: boolean;
  primaryDomain: string | null;
  brandName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  showPoweredBy: boolean;
}

const imageMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon"
]);

const invalidateTenantCache = async (tenant: Pick<Tenant, "slug" | "primaryDomain">): Promise<void> => {
  const keys = [`tenant:${tenant.slug}`];
  if (tenant.primaryDomain) {
    keys.push(`tenant:${tenant.primaryDomain}`);
  }

  if (keys.length > 0) {
    await redis.del(...keys);
  }
};

const getTenantOrThrow = async (tenantId: string): Promise<Tenant> => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new ServiceError("Tenant not found.", 404);
  }

  return tenant;
};

const getFaviconFromSettings = (settings: Prisma.JsonValue | null): string | null => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null;
  }

  const faviconUrl = (settings as Record<string, unknown>).faviconUrl;
  return typeof faviconUrl === "string" ? faviconUrl : null;
};

const upsertLogoUrl = async (tenantId: string, logoUrl: string): Promise<void> => {
  await prisma.whiteLabelConfig.upsert({
    where: { tenantId },
    update: {
      logoUrl
    },
    create: {
      tenantId,
      brandName: "CampusHire",
      logoUrl
    }
  });
};

const ensureImageFile = (file: Express.Multer.File): void => {
  if (!imageMimeTypes.has(file.mimetype)) {
    throw new ServiceError("Unsupported image type.", 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new ServiceError("File exceeds max size of 5MB.", 400);
  }
};

export const getConfig = async (
  tenantId: string
): Promise<WhiteLabelConfig & { tenant: Tenant }> => {
  const tenant = await getTenantOrThrow(tenantId);

  const config = await prisma.whiteLabelConfig.findUnique({
    where: {
      tenantId
    }
  });

  if (config) {
    return {
      ...config,
      tenant
    };
  }

  const created = await prisma.whiteLabelConfig.create({
    data: {
      tenantId,
      brandName: tenant.name,
      primaryColor: "#1B3A6B",
      accentColor: "#0EA5E9"
    }
  });

  return {
    ...created,
    tenant
  };
};

export const upsertConfig = async (
  tenantId: string,
  dto: WhiteLabelConfigDto
): Promise<WhiteLabelConfig> => {
  const tenant = await getTenantOrThrow(tenantId);

  const updated = await prisma.whiteLabelConfig.upsert({
    where: {
      tenantId
    },
    update: {
      brandName: sanitizeInput(dto.brandName),
      primaryColor: dto.primaryColor,
      accentColor: dto.accentColor,
      fontFamily: dto.fontFamily ? sanitizeInput(dto.fontFamily) : null,
      customDomain: dto.customDomain?.trim() || null,
      senderName: dto.senderName ? sanitizeInput(dto.senderName) : null,
      senderEmail: dto.senderEmail?.trim() || null,
      showPoweredBy: dto.showPoweredBy,
      customCss: dto.customCss ? dto.customCss.trim() : null
    },
    create: {
      tenantId,
      brandName: sanitizeInput(dto.brandName),
      primaryColor: dto.primaryColor,
      accentColor: dto.accentColor,
      fontFamily: dto.fontFamily ? sanitizeInput(dto.fontFamily) : null,
      customDomain: dto.customDomain?.trim() || null,
      senderName: dto.senderName ? sanitizeInput(dto.senderName) : null,
      senderEmail: dto.senderEmail?.trim() || null,
      showPoweredBy: dto.showPoweredBy,
      customCss: dto.customCss ? dto.customCss.trim() : null
    }
  });

  await invalidateTenantCache(tenant);
  return updated;
};

export const publishConfig = async (tenantId: string): Promise<WhiteLabelConfig> => {
  const tenant = await getTenantOrThrow(tenantId);

  const config = await prisma.whiteLabelConfig.upsert({
    where: {
      tenantId
    },
    update: {},
    create: {
      tenantId,
      brandName: tenant.name,
      primaryColor: "#1B3A6B",
      accentColor: "#0EA5E9"
    }
  });

  await prisma.tenant.update({
    where: {
      id: tenantId
    },
    data: {
      isWhiteLabel: true
    }
  });

  await invalidateTenantCache(tenant);
  return config;
};

export const unpublishConfig = async (tenantId: string): Promise<WhiteLabelConfig> => {
  const tenant = await getTenantOrThrow(tenantId);

  const config = await prisma.whiteLabelConfig.findUnique({ where: { tenantId } });
  if (!config) {
    throw new ServiceError("White label config not found.", 404);
  }

  await prisma.tenant.update({
    where: {
      id: tenantId
    },
    data: {
      isWhiteLabel: false
    }
  });

  await invalidateTenantCache(tenant);
  return config;
};

export const getPreviewData = async (tenantId: string): Promise<ThemePreviewData> => {
  const tenant = await getTenantOrThrow(tenantId);
  const config = await prisma.whiteLabelConfig.findUnique({ where: { tenantId } });

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    slug: tenant.slug,
    isWhiteLabel: tenant.isWhiteLabel,
    primaryDomain: tenant.primaryDomain,
    brandName: config?.brandName ?? tenant.name,
    primaryColor: config?.primaryColor ?? "#1B3A6B",
    accentColor: config?.accentColor ?? "#0EA5E9",
    fontFamily: config?.fontFamily ?? null,
    logoUrl: config?.logoUrl ?? null,
    faviconUrl: getFaviconFromSettings(tenant.settings),
    showPoweredBy: config?.showPoweredBy ?? true
  };
};

export const uploadLogo = async (tenantId: string, file: Express.Multer.File): Promise<string> => {
  const tenant = await getTenantOrThrow(tenantId);
  ensureImageFile(file);

  const ext = path.extname(file.originalname) || ".png";
  const key = generateFileKey(`whitelabel/${tenantId}/logo`, `${nanoid(10)}${ext}`);

  await uploadFile(key, file.buffer, file.mimetype);
  const url = await getPresignedUrl(key, 7 * 24 * 60 * 60);
  await upsertLogoUrl(tenantId, url);
  await invalidateTenantCache(tenant);

  return url;
};

export const uploadFavicon = async (tenantId: string, file: Express.Multer.File): Promise<string> => {
  const tenant = await getTenantOrThrow(tenantId);
  ensureImageFile(file);

  const ext = path.extname(file.originalname) || ".ico";
  const key = generateFileKey(`whitelabel/${tenantId}/favicon`, `${nanoid(10)}${ext}`);

  await uploadFile(key, file.buffer, file.mimetype);
  const url = await getPresignedUrl(key, 7 * 24 * 60 * 60);

  const settings =
    tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings)
      ? (tenant.settings as Record<string, unknown>)
      : {};

  settings.faviconUrl = url;

  await prisma.tenant.update({
    where: {
      id: tenantId
    },
    data: {
      settings: settings as Prisma.InputJsonValue
    }
  });

  await invalidateTenantCache(tenant);
  return url;
};