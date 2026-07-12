import type { Tenant, WhiteLabelConfig } from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

export interface WhiteLabelConfigDto {
  tenantId?: string;
  brandName: string;
  tagline?: string;
  subdomain?: string;
  primaryColor: string;
  accentColor: string;
  fontFamily?: string;
  customDomain?: string;
  senderName?: string;
  senderEmail?: string;
  showPoweredBy: boolean;
  customCss?: string;
}

export const getConfig = async (tenantId?: string): Promise<WhiteLabelConfig & { tenant: Tenant }> => {
  const response = await apiClient.get("/api/whitelabel/config", { params: { tenantId } });
  return unwrapResponse(response);
};

export const upsertConfig = async (dto: WhiteLabelConfigDto): Promise<WhiteLabelConfig> => {
  const response = await apiClient.post("/api/whitelabel/config", dto);
  return unwrapResponse(response);
};

export const publishConfig = async (tenantId?: string): Promise<WhiteLabelConfig> => {
  const response = await apiClient.post("/api/whitelabel/publish", { tenantId });
  return unwrapResponse(response);
};

export const unpublishConfig = async (tenantId?: string): Promise<WhiteLabelConfig> => {
  const response = await apiClient.post("/api/whitelabel/unpublish", { tenantId });
  return unwrapResponse(response);
};

export const uploadLogo = async (file: File, tenantId?: string): Promise<{ url: string }> => {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post("/api/whitelabel/logo", form, {
    params: { tenantId },
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  const data = unwrapResponse<{ logoUrl: string }>(response);
  return { url: data.logoUrl };
};

export const uploadFavicon = async (file: File, tenantId?: string): Promise<{ url: string }> => {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post("/api/whitelabel/favicon", form, {
    params: { tenantId },
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  const data = unwrapResponse<{ faviconUrl: string }>(response);
  return { url: data.faviconUrl };
};
