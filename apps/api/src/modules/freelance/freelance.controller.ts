import type { NextFunction, Request, Response } from "express";
import {
  CreateReferralSchema,
  GenerateReferralLinkSchema,
  InvoiceIdParamSchema,
  PaginationQuerySchema,
  ReferralFiltersSchema
} from "./freelance.schema";
import {
  createReferral,
  generateReferralLink,
  getInvoiceDetail,
  getInvoices,
  getReferrals,
  getReferralStats,
  markInvoicePaid
} from "./freelance.service";

class ControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ControllerError";
    this.statusCode = statusCode;
  }
}

const requireUserId = (req: Request): string => {
  if (!req.user?.userId) {
    throw new ControllerError("Unauthorized", 401);
  }
  return req.user.userId;
};

export const createReferralController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const dto = CreateReferralSchema.parse(req.body);
    const referral = await createReferral(userId, dto);
    res.status(201).json({
      success: true,
      data: referral,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getReferralsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const filters = ReferralFiltersSchema.parse(req.query);
    const result = await getReferrals(userId, filters, filters.page, filters.limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getReferralStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const stats = await getReferralStats(userId);
    res.status(200).json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const generateReferralLinkController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const dto = GenerateReferralLinkSchema.parse(req.body);
    const data = await generateReferralLink(userId, dto.jobId);
    res.status(200).json({
      success: true,
      data,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoicesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const query = PaginationQuerySchema.parse(req.query);
    const result = await getInvoices(userId, query.page, query.limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getInvoiceDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = InvoiceIdParamSchema.parse(req.params);
    const invoice = await getInvoiceDetail(params.id, userId);
    res.status(200).json({
      success: true,
      data: invoice,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const markInvoicePaidController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = requireUserId(req);
    const params = InvoiceIdParamSchema.parse(req.params);
    const invoice = await markInvoicePaid(params.id, adminId);
    res.status(200).json({
      success: true,
      data: invoice,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
