import type { Tenant, WhiteLabelConfig } from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

export interface WhiteLabelConfigDto {
  tenantId?: string;
  brandName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily?: string;
  customDomain?: string;
  senderName?: string;
  senderEmail?: string;
  showPoweredBy: boolean;
  customCss?: string;
}

export const getConfig = async (): Promise<WhiteLabelConfig & { tenant: Tenant }> => {
  const response = await apiClient.get("/api/whitelabel/config");
  return unwrapResponse(response);
};

export const upsertConfig = async (dto: WhiteLabelConfigDto): Promise<WhiteLabelConfig> => {
  const response = await apiClient.post("/api/whitelabel/config", dto);
  return unwrapResponse(response);
};

export const publishConfig = async (): Promise<WhiteLabelConfig> => {
  const response = await apiClient.post("/api/whitelabel/publish");
  return unwrapResponse(response);
};

export const unpublishConfig = async (): Promise<WhiteLabelConfig> => {
  const response = await apiClient.post("/api/whitelabel/unpublish");
  return unwrapResponse(response);
};

export const uploadLogo = async (file: File): Promise<{ url: string }> => {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post("/api/whitelabel/logo", form, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  const data = unwrapResponse<{ logoUrl: string }>(response);
  return { url: data.logoUrl };
};

export const uploadFavicon = async (file: File): Promise<{ url: string }> => {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post("/api/whitelabel/favicon", form, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  const data = unwrapResponse<{ faviconUrl: string }>(response);
  return { url: data.faviconUrl };
};
