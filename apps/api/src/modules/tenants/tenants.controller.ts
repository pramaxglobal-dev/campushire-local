import type { NextFunction, Request, Response } from "express";
import {
  CreateTenantSchema,
  TenantListQuerySchema,
  TenantParamsSchema,
  UpdateTenantSchema
} from "./tenants.schema";
import {
  createTenant,
  getTenant,
  getTenantStats,
  listTenants,
  toggleTenantActive,
  updateTenant
} from "./tenants.service";

export const listTenantsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = TenantListQuerySchema.parse(req.query);
    const result = await listTenants(query.page, query.limit, query.search);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createTenantController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = CreateTenantSchema.parse(req.body);
    const tenant = await createTenant(dto);

    res.status(201).json({
      success: true,
      data: tenant,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = TenantParamsSchema.parse(req.params);
    const tenant = await getTenant(params.id);

    res.status(200).json({
      success: true,
      data: tenant,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenantController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = TenantParamsSchema.parse(req.params);
    const dto = UpdateTenantSchema.parse(req.body);
    const tenant = await updateTenant(params.id, dto);

    res.status(200).json({
      success: true,
      data: tenant,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const toggleTenantActiveController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = TenantParamsSchema.parse(req.params);
    const tenant = await toggleTenantActive(params.id);

    res.status(200).json({
      success: true,
      data: tenant,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = TenantParamsSchema.parse(req.params);
    const stats = await getTenantStats(params.id);

    res.status(200).json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    next(error);
  }
};