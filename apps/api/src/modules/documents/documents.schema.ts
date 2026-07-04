import { z } from "zod";
import { DocumentType } from "@campushire/types";

export const UploadDocumentSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  isSharedWithRecruiters: z.coerce.boolean().default(false)
});

export const DocumentIdParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const ToggleShareSchema = z.object({
  share: z.boolean()
});

export const RequestVerificationSchema = z.object({
  vendorId: z.string().trim().min(1)
});

export const CandidateUserParamSchema = z.object({
  userId: z.string().trim().min(1)
});

export type UploadDocumentDto = z.infer<typeof UploadDocumentSchema>;
