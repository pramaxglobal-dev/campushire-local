import type { NextFunction, Request, Response } from "express";
import type { Tenant, TenantContext } from "@campushire/types";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

interface CachedTenant {
  id: string;
  name: string;
  slug: string;
  plan: Tenant["plan"];
  isActive: boolean;
  isWhiteLabel: boolean;
  primaryDomain: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  timezone: string;
  country: string;
  settings: Tenant["settings"];
  createdAt: string;
  updatedAt: string;
}

const buildTenantContext = (tenant: Tenant): TenantContext => {
  return {
    tenant,
    tenantId: tenant.id,
    slug: tenant.slug,
    plan: tenant.plan,
    isWhitelabel: tenant.isWhiteLabel
  };
};

const parseHost = (request: Request): string | null => {
  const forwardedHost = request.headers["x-forwarded-host"];
  const rawHost =
    typeof forwardedHost === "string"
      ? forwardedHost
      : Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : request.headers.host;

  if (!rawHost) {
    return null;
  }

  const hostOnly = rawHost.split(":")[0];
  return hostOnly ? hostOnly.toLowerCase() : null;
};

const isLocalHost = (host: string): boolean => {
  return host.includes("localhost") || host.startsWith("127.0.0.1");
};

const getSubdomain = (host: string): string | null => {
  if (!host.endsWith("campushire.in")) {
    return null;
  }
  const parts = host.split(".");
  if (parts.length < 3) {
    return null;
  }
  const subdomain = parts[0];
  return subdomain ?? null;
};

const fromCached = (cached: CachedTenant): Tenant => {
  return {
    ...cached,
    createdAt: new Date(cached.createdAt),
    updatedAt: new Date(cached.updatedAt)
  };
};

export const tenantResolver = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const host = parseHost(req);
    if (!host || isLocalHost(host)) {
      return next();
    }

    const subdomain = getSubdomain(host);
    const cacheKey = `tenant:${subdomain ?? host}`;

    const cachedRaw = await redis.get(cacheKey);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as CachedTenant;
      if (cached.isActive) {
        req.tenant = buildTenantContext(fromCached(cached));
        return next();
      }
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        ...(subdomain ? { slug: subdomain } : { primaryDomain: host })
      }
    });

    if (!tenant) {
      return next();
    }

    const payload: CachedTenant = {
      ...tenant,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString()
    };

    await redis.set(cacheKey, JSON.stringify(payload), "EX", 300);
    req.tenant = buildTenantContext(tenant);
    return next();
  } catch (error) {
    logger.error({ error }, "Tenant resolver failed");
    return next();
  }
};
