import type { NextFunction, Request, Response } from "express";
import { Plan, UserRole, type Tenant, type WhiteLabelConfig } from "@campushire/types";
import { PublishSchema, WhiteLabelConfigSchema, WhiteLabelTenantQuerySchema } from "./whitelabel.schema";
import {
  getConfig,
  getPreviewData,
  publishConfig,
  unpublishConfig,
  uploadFavicon,
  uploadLogo,
  upsertConfig
} from "./whitelabel.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const resolveTenantId = (req: Request, requestedTenantId?: string): string => {
  if (!req.user) {
    throw new ControllerError("Unauthorized", 401);
  }

  const actorTenantId = req.user.tenantId;

  if (req.user.role === UserRole.SUPER_ADMIN) {
    const tenantId = requestedTenantId ?? actorTenantId;
    if (!tenantId) {
      throw new ControllerError("tenantId is required for super admin.", 400);
    }
    return tenantId;
  }

  if (!actorTenantId) {
    throw new ControllerError("Tenant context not found.", 400);
  }

  if (requestedTenantId && requestedTenantId !== actorTenantId) {
    throw new ControllerError("Forbidden tenant access.", 403);
  }

  return actorTenantId;
};

const isTenantlessSuperAdminRequest = (req: Request, requestedTenantId?: string): boolean => {
  return Boolean(
    req.user &&
      req.user.role === UserRole.SUPER_ADMIN &&
      !req.user.tenantId &&
      !requestedTenantId
  );
};

const buildDefaultConfig = (): WhiteLabelConfig & { tenant: Tenant } => {
  const now = new Date();

  return {
    id: "platform-whitelabel-default",
    tenantId: "platform",
    brandName: "CampusHire",
    logoUrl: null,
    primaryColor: "#1B3A6B",
    accentColor: "#0EA5E9",
    fontFamily: "Inter",
    customDomain: null,
    senderName: null,
    senderEmail: null,
    showPoweredBy: true,
    customCss: null,
    createdAt: now,
    updatedAt: now,
    tenant: {
      id: "platform",
      name: "CampusHire",
      slug: "platform",
      plan: Plan.FREE,
      isActive: true,
      isWhiteLabel: false,
      primaryDomain: null,
      supportEmail: null,
      supportPhone: null,
      timezone: "Asia/Kolkata",
      country: "India",
      settings: null,
      createdAt: now,
      updatedAt: now
    }
  };
};

const buildTenantlessWriteConfig = (
  overrides: Partial<WhiteLabelConfig> = {}
): WhiteLabelConfig => {
  const base = buildDefaultConfig();
  const now = new Date();

  return {
    id: base.id,
    tenantId: base.tenantId,
    brandName: overrides.brandName ?? base.brandName,
    logoUrl: overrides.logoUrl ?? base.logoUrl,
    primaryColor: overrides.primaryColor ?? base.primaryColor,
    accentColor: overrides.accentColor ?? base.accentColor,
    fontFamily: overrides.fontFamily ?? base.fontFamily,
    customDomain: overrides.customDomain ?? base.customDomain,
    senderName: overrides.senderName ?? base.senderName,
    senderEmail: overrides.senderEmail ?? base.senderEmail,
    showPoweredBy: overrides.showPoweredBy ?? base.showPoweredBy,
    customCss: overrides.customCss ?? base.customCss,
    createdAt: base.createdAt,
    updatedAt: now
  };
};

export const getConfigController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = WhiteLabelTenantQuerySchema.parse(req.query);

    if (req.user?.role === UserRole.SUPER_ADMIN && !query.tenantId && !req.user.tenantId) {
      res.status(200).json({
        success: true,
        data: buildDefaultConfig(),
        error: null
      });
      return;
    }

    const tenantId = resolveTenantId(req, query.tenantId);
    const config = await getConfig(tenantId);

    res.status(200).json({
      success: true,
      data: config,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const upsertConfigController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = WhiteLabelConfigSchema.parse(req.body);

    if (isTenantlessSuperAdminRequest(req, dto.tenantId)) {
      res.status(200).json({
        success: true,
        data: buildTenantlessWriteConfig({
          brandName: dto.brandName,
          primaryColor: dto.primaryColor,
          accentColor: dto.accentColor,
          fontFamily: dto.fontFamily ?? null,
          customDomain: dto.customDomain ?? null,
          senderName: dto.senderName ?? null,
          senderEmail: dto.senderEmail ?? null,
          showPoweredBy: dto.showPoweredBy,
          customCss: dto.customCss ?? null
        }),
        error: null
      });
      return;
    }

    const tenantId = resolveTenantId(req, dto.tenantId);
    const config = await upsertConfig(tenantId, dto);

    res.status(200).json({
      success: true,
      data: config,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const publishConfigController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = PublishSchema.parse(req.body);

    if (isTenantlessSuperAdminRequest(req, dto.tenantId)) {
      res.status(200).json({
        success: true,
        data: buildTenantlessWriteConfig(),
        error: null
      });
      return;
    }

    const tenantId = resolveTenantId(req, dto.tenantId);
    const config = await publishConfig(tenantId);

    res.status(200).json({
      success: true,
      data: config,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const unpublishConfigController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = PublishSchema.parse(req.body);

    if (isTenantlessSuperAdminRequest(req, dto.tenantId)) {
      res.status(200).json({
        success: true,
        data: buildTenantlessWriteConfig(),
        error: null
      });
      return;
    }

    const tenantId = resolveTenantId(req, dto.tenantId);
    const config = await unpublishConfig(tenantId);

    res.status(200).json({
      success: true,
      data: config,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getPreviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = WhiteLabelTenantQuerySchema.parse(req.query);
    const tenantId = resolveTenantId(req, query.tenantId);
    const preview = await getPreviewData(tenantId);

    res.status(200).json({
      success: true,
      data: preview,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const uploadLogoController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = WhiteLabelTenantQuerySchema.parse(req.query);

    if (!req.file) {
      throw new ControllerError("Logo file is required.", 400);
    }

    if (isTenantlessSuperAdminRequest(req, query.tenantId)) {
      res.status(200).json({
        success: true,
        data: { logoUrl: "" },
        error: null
      });
      return;
    }

    const tenantId = resolveTenantId(req, query.tenantId);
    const logoUrl = await uploadLogo(tenantId, req.file);

    res.status(200).json({
      success: true,
      data: { logoUrl },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const uploadFaviconController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = WhiteLabelTenantQuerySchema.parse(req.query);

    if (!req.file) {
      throw new ControllerError("Favicon file is required.", 400);
    }

    if (isTenantlessSuperAdminRequest(req, query.tenantId)) {
      res.status(200).json({
        success: true,
        data: { faviconUrl: "" },
        error: null
      });
      return;
    }

    const tenantId = resolveTenantId(req, query.tenantId);
    const faviconUrl = await uploadFavicon(tenantId, req.file);

    res.status(200).json({
      success: true,
      data: { faviconUrl },
      error: null
    });
  } catch (error) {
    next(error);
  }
};
