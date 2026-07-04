import type { Invite } from "@campushire/types";
import { apiClient, publicApiClient, unwrapResponse } from "@/lib/api/client";

export interface InviteValidation {
  valid: boolean;
  reason?: string;
  invite?: Invite;
}

export interface InviteUsage {
  id: string;
  usedByUserId: string;
  usedAt: string | Date;
  usedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface InviteWithUsages extends Invite {
  usages: InviteUsage[];
}

export interface InviteStats {
  totalInvites: number;
  totalUses: number;
  activeInvites: number;
  studentsRegistered: number;
}

export const validateInviteCode = async (code: string): Promise<InviteValidation> => {
  const response = await publicApiClient.get(`/api/invites/validate/${encodeURIComponent(code)}`);
  return unwrapResponse(response);
};

export const createInvite = async (payload: {
  maxUses?: number;
  expiresAt?: string;
}): Promise<Invite> => {
  const response = await apiClient.post("/api/invites", payload);
  return unwrapResponse(response);
};

export const listInvites = async (): Promise<InviteWithUsages[]> => {
  const response = await apiClient.get("/api/invites");
  return unwrapResponse(response);
};

export const deactivateInvite = async (id: string): Promise<Invite> => {
  const response = await apiClient.delete(`/api/invites/${id}`);
  return unwrapResponse(response);
};

export const getInviteStats = async (): Promise<InviteStats> => {
  const response = await apiClient.get("/api/invites/stats");
  return unwrapResponse(response);
};
