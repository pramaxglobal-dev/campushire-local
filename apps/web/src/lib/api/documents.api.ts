import type { DocumentType, UserDocument } from "@campushire/types";
import { apiClient, unwrapResponse, unwrapVoidResponse } from "@/lib/api/client";

export interface UploadDocumentDto {
  documentType: DocumentType;
  isSharedWithRecruiters: boolean;
}

export const uploadDocument = async (
  file: File,
  dto: UploadDocumentDto
): Promise<UserDocument> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", dto.documentType);
  formData.append("isSharedWithRecruiters", String(dto.isSharedWithRecruiters));

  const response = await apiClient.post("/api/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return unwrapResponse(response);
};

export const getMyDocuments = async (): Promise<UserDocument[]> => {
  const response = await apiClient.get("/api/documents");
  return unwrapResponse(response);
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  const response = await apiClient.delete(`/api/documents/${documentId}`);
  unwrapVoidResponse(response);
};

export const toggleShareWithRecruiters = async (
  documentId: string,
  share: boolean
): Promise<UserDocument> => {
  const response = await apiClient.patch(`/api/documents/${documentId}/share`, { share });
  return unwrapResponse(response);
};

export const requestVerification = async (
  documentId: string,
  vendorId: string
): Promise<UserDocument> => {
  const response = await apiClient.post(`/api/documents/${documentId}/verify`, { vendorId });
  return unwrapResponse(response);
};

export const getSharedCandidateDocuments = async (candidateUserId: string): Promise<UserDocument[]> => {
  const response = await apiClient.get(`/api/documents/candidate/${candidateUserId}`);
  return unwrapResponse(response);
};

export interface DocumentVerificationView {
  id: string;
  status: string;
  comment: string | null;
  verifiedAt: string | null;
  createdAt: string;
  vendorProfile: { businessName: string };
  serviceRequest: { status: string; title: string; updatedAt: string };
  userDocument: { id: string; documentType: string; verificationStatus: string } | null;
}

export const getMyDocumentVerifications = async (): Promise<DocumentVerificationView[]> => {
  const response = await apiClient.get("/api/documents/verifications");
  return unwrapResponse(response);
};
