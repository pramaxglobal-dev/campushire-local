import type { FreelanceReferral, Invoice, PaginatedResponse, ReferralStatus } from "@campushire/types";
import { apiClient, unwrapPaginatedResponse, unwrapResponse } from "@/lib/api/client";

export interface CreateReferralDto {
  jobId: string;
  candidateUserId?: string;
  candidateEmail?: string;
  candidateName?: string;
  candidatePhone?: string;
}

export interface ReferralFilters {
  status?: ReferralStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReferralDetail extends FreelanceReferral {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  job: {
    id: string;
    title: string;
    recruiterCompany: string;
    minCtc: number | null;
    maxCtc: number | null;
  };
  applicationStatus: string | null;
  commissionAmount: number | null;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  triggeredCount: number;
  totalEarnings: number;
  pendingAmount: number;
  paidAmount: number;
}

export const createReferral = async (dto: CreateReferralDto): Promise<FreelanceReferral> => {
  const response = await apiClient.post("/api/freelance/referrals", dto);
  return unwrapResponse(response);
};

export const getReferrals = async (
  filters: ReferralFilters
): Promise<PaginatedResponse<ReferralDetail[]>> => {
  const response = await apiClient.get("/api/freelance/referrals", { params: filters });
  return unwrapPaginatedResponse(response);
};

export const getReferralStats = async (): Promise<ReferralStats> => {
  const response = await apiClient.get("/api/freelance/referrals/stats");
  return unwrapResponse(response);
};

export const generateReferralLink = async (
  jobId: string
): Promise<{ link: string; code: string }> => {
  const response = await apiClient.post("/api/freelance/referral-link", { jobId });
  return unwrapResponse(response);
};

export const getInvoices = async (page: number): Promise<PaginatedResponse<Invoice[]>> => {
  const response = await apiClient.get("/api/freelance/invoices", {
    params: { page, limit: 20 }
  });
  return unwrapPaginatedResponse(response);
};

export const getInvoiceDetail = async (id: string): Promise<Invoice> => {
  const response = await apiClient.get(`/api/freelance/invoices/${id}`);
  return unwrapResponse(response);
};

export const markInvoicePaid = async (id: string): Promise<Invoice> => {
  const response = await apiClient.patch(`/api/freelance/invoices/${id}/mark-paid`);
  return unwrapResponse(response);
};
