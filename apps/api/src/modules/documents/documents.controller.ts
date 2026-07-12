import type { NextFunction, Request, Response } from "express";
import {
  CandidateUserParamSchema,
  DocumentIdParamSchema,
  RequestVerificationSchema,
  ToggleShareSchema,
  UploadDocumentSchema
} from "./documents.schema";
import {
  deleteDocument,
  getMyDocuments,
  getMyDocumentVerifications,
  getSharedDocuments,
  requestVerification,
  toggleShareWithRecruiters,
  uploadDocument
} from "./documents.service";

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

export const getMyDocumentVerificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rows = await getMyDocumentVerifications(requireUserId(req));
    res.status(200).json({ success: true, data: rows, error: null });
  } catch (error) {
    next(error);
  }
};

export const uploadDocumentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    if (!req.file) {
      throw new ControllerError("Document file is required.", 400);
    }
    const dto = UploadDocumentSchema.parse(req.body);
    const document = await uploadDocument(userId, req.file, dto);
    res.status(201).json({
      success: true,
      data: document,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getMyDocumentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const documents = await getMyDocuments(userId);
    res.status(200).json({
      success: true,
      data: documents,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocumentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = DocumentIdParamSchema.parse(req.params);
    await deleteDocument(params.id, userId);
    res.status(200).json({
      success: true,
      data: { deleted: true },
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const toggleShareWithRecruitersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = DocumentIdParamSchema.parse(req.params);
    const body = ToggleShareSchema.parse(req.body);
    const document = await toggleShareWithRecruiters(params.id, userId, body.share);
    res.status(200).json({
      success: true,
      data: document,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const requestVerificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = requireUserId(req);
    const params = DocumentIdParamSchema.parse(req.params);
    const body = RequestVerificationSchema.parse(req.body);
    const document = await requestVerification(params.id, userId, body.vendorId);
    res.status(200).json({
      success: true,
      data: document,
      error: null
    });
  } catch (error) {
    next(error);
  }
};

export const getSharedDocumentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recruiterUserId = requireUserId(req);
    const params = CandidateUserParamSchema.parse(req.params);
    const documents = await getSharedDocuments(params.userId, recruiterUserId);
    res.status(200).json({
      success: true,
      data: documents,
      error: null
    });
  } catch (error) {
    next(error);
  }
};
