import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@campushire/types";
import {
  CompleteServiceRequestSchema,
  CreateServiceRequestSchema,
  RateVendorSchema,
  RespondServiceRequestSchema,
  ServiceRequestIdParamSchema,
  ServiceRequestQuerySchema,
  UpdateServiceRequestSchema,
  VendorFiltersSchema,
  VendorIdParamSchema
} from "./vendors.schema";
import {
  completeServiceRequest,
  createServiceRequest,
  getMyServiceRequests,
  getVendorDetail,
  getVendorStats,
  listVendors,
  rateVendor,
  respondToServiceRequest,
  updateServiceRequest
} from "./vendors.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireUser = (req: Request): { userId: string; role: UserRole } => {
  if (!req.user?.userId) {
    throw new ControllerError("Unauthorized", 401);
  }
  return {
    userId: req.user.userId,
    role: req.user.role
  };
};

export const listVendorsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = VendorFiltersSchema.parse(req.query);
    const result = await listVendors(filters, filters.page, filters.limit, req.tenant?.tenantId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getVendorDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = VendorIdParamSchema.parse(req.params);
    const vendor = await getVendorDetail(params.id, req.tenant?.tenantId);
    res.status(200).json({
      success: true,
      data: vendor,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const stats = await getVendorStats(actor.userId);
    res.status(200).json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const createServiceRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const dto = CreateServiceRequestSchema.parse(req.body);
    const request = await createServiceRequest(actor.userId, dto);
    res.status(201).json({
      success: true,
      data: request,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getMyServiceRequestsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const query = ServiceRequestQuerySchema.parse(req.query);
    const result = await getMyServiceRequests(
      actor.userId,
      actor.role,
      query.page,
      query.limit,
      query.status
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateServiceRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ServiceRequestIdParamSchema.parse(req.params);
    const dto = UpdateServiceRequestSchema.parse(req.body);
    const request = await updateServiceRequest(params.id, actor.userId, dto);
    res.status(200).json({
      success: true,
      data: request,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const respondToServiceRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ServiceRequestIdParamSchema.parse(req.params);
    const body = RespondServiceRequestSchema.parse(req.body);
    const request = await respondToServiceRequest(params.id, actor.userId, body.action, body.note);
    res.status(200).json({
      success: true,
      data: request,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const completeServiceRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ServiceRequestIdParamSchema.parse(req.params);
    const body = CompleteServiceRequestSchema.parse(req.body);
    const request = await completeServiceRequest(params.id, actor.userId, body.note);
    res.status(200).json({
      success: true,
      data: request,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const rateVendorController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actor = requireUser(req);
    const params = ServiceRequestIdParamSchema.parse(req.params);
    const body = RateVendorSchema.parse(req.body);
    const request = await rateVendor(params.id, actor.userId, body.rating, body.review);
    res.status(200).json({
      success: true,
      data: request,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
