"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReferralStatus, type FreelanceAnalytics, type Invoice } from "@campushire/types";
import { formatCurrency, formatDate, getStatusColor } from "@campushire/utils";
import { Copy, Link2, PlusCircle, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  createReferral,
  generateReferralLink,
  getInvoices,
  getReferrals,
  getReferralStats,
  type ReferralDetail,
  type ReferralStats
} from "@/lib/api/freelance.api";
import { listJobs, type JobCard } from "@/lib/api/jobs.api";
import { getFreelanceAnalytics } from "@/lib/api/analytics.api";
import { toast } from "sonner";

interface ReferralFormState {
  jobId: string;
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
}

const initialFormState: ReferralFormState = {
  jobId: "",
  candidateUserId: "",
  candidateName: "",
  candidateEmail: "",
  candidatePhone: ""
};

const EMPTY_REFERRAL_STATS: ReferralStats = {
  totalReferrals: 0,
  activeReferrals: 0,
  triggeredCount: 0,
  totalEarnings: 0,
  pendingAmount: 0,
  paidAmount: 0
};

const EMPTY_FREELANCE_ANALYTICS: FreelanceAnalytics = {
  totalReferrals: 0,
  referralsByStatus: {} as FreelanceAnalytics["referralsByStatus"],
  commissionsByMonth: [],
  topJobs: [],
  conversionRate: 0,
  pendingPayout: 0,
  totalEarned: 0
};

const getReferralBadgeClass = (status: ReferralStatus): string => {
  return getStatusColor(status);
};

export default function FreelanceDashboardPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralDetail[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [analytics, setAnalytics] = useState<FreelanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formState, setFormState] = useState<ReferralFormState>(initialFormState);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, referralData, invoiceData, jobsData, analyticsData] =
        await Promise.allSettled([
          getReferralStats(),
          getReferrals({ page: 1, limit: 25 }),
          getInvoices(1),
          listJobs({
            page: 1,
            limit: 100,
            hasCommission: true
          }),
          getFreelanceAnalytics()
        ]);

      const hasAnySuccess = [statsData, referralData, invoiceData, jobsData, analyticsData].some(
        (result) => result.status === "fulfilled"
      );
      if (!hasAnySuccess) {
        setError("Unable to load referral dashboard.");
      }

      setStats(statsData.status === "fulfilled" ? statsData.value : EMPTY_REFERRAL_STATS);
      setReferrals(referralData.status === "fulfilled" ? (referralData.value.data ?? []) : []);
      setInvoices(invoiceData.status === "fulfilled" ? (invoiceData.value.data ?? []) : []);
      setJobs(
        jobsData.status === "fulfilled"
          ? (jobsData.value.data ?? []).filter((job) => job.status !== "CLOSED")
          : []
      );
      setAnalytics(
        analyticsData.status === "fulfilled" ? analyticsData.value : EMPTY_FREELANCE_ANALYTICS
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load referral dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const hasExternalCandidate = useMemo(() => formState.candidateUserId.trim().length === 0, [formState.candidateUserId]);

  const commissionChart = useMemo(() => {
    const total = (stats?.paidAmount ?? 0) + (stats?.pendingAmount ?? 0);
    if (total <= 0) {
      return { paidPct: 0, pendingPct: 100 };
    }
    const paidPct = Math.round(((stats?.paidAmount ?? 0) / total) * 100);
    return { paidPct, pendingPct: 100 - paidPct };
  }, [stats?.paidAmount, stats?.pendingAmount]);

  const resetForm = (): void => {
    setFormState(initialFormState);
  };

  const handleCreateReferral = async (): Promise<void> => {
    if (!formState.jobId) {
      toast.error("Select a job to continue.");
      return;
    }
    if (hasExternalCandidate) {
      if (!formState.candidateName || !formState.candidateEmail || !formState.candidatePhone) {
        toast.error("Enter candidate name, email and phone.");
        return;
      }
    }

    setCreating(true);
    try {
      await createReferral({
        jobId: formState.jobId,
        candidateUserId: formState.candidateUserId || undefined,
        candidateName: hasExternalCandidate ? formState.candidateName : undefined,
        candidateEmail: hasExternalCandidate ? formState.candidateEmail : undefined,
        candidatePhone: hasExternalCandidate ? formState.candidatePhone : undefined
      });
      toast.success("Referral submitted successfully.");
      setModalOpen(false);
      resetForm();
      await loadDashboard();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Unable to create referral.");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateLink = async (jobId: string): Promise<void> => {
    try {
      const response = await generateReferralLink(jobId);
      await navigator.clipboard.writeText(response.link);
      toast.success(`Referral link copied: ${response.code}`);
    } catch (linkError) {
      toast.error(linkError instanceof Error ? linkError.message : "Unable to generate referral link.");
    }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error || !stats || !analytics) {
    return <ErrorState message={error ?? "Unable to load dashboard."} onRetry={() => void loadDashboard()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Freelance Referral Dashboard"
        subtitle="Track referred candidates, triggered commissions, and invoices in one place."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Refer a Candidate
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Referrals" value={stats.totalReferrals} />
        <StatCard title="Triggered" value={stats.triggeredCount} />
        <StatCard title="Total Earnings" value={formatCurrency(stats.totalEarnings)} />
        <StatCard title="Pending" value={formatCurrency(stats.pendingAmount)} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Referral Analytics</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Commission by Month</p>
              <div className="mt-3 flex items-end gap-2">
                {analytics.commissionsByMonth.map((row) => (
                  <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary"
                      style={{ height: `${Math.max(8, Math.round(row.amount / 5000))}px` }}
                    />
                    <span className="text-[10px] text-slate-500">{row.month}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Conversion Rate</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">{analytics.conversionRate}%</p>
              <p className="mt-1 text-sm text-slate-600">Triggered referrals over total referrals.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Status Breakdown</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                {Object.entries(analytics.referralsByStatus).map(([status, count]) => (
                  <p key={status} className="flex items-center justify-between">
                    <span>{status.replaceAll("_", " ")}</span>
                    <span className="font-semibold">{count}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Active Referrals</h2>
            {referrals.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No referrals yet"
                description="Refer candidates for commission-enabled jobs to start earning."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Candidate</TableCell>
                    <TableCell>Job</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Commission</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <p className="font-medium text-slate-900">
                          {referral.candidate.firstName} {referral.candidate.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{referral.candidate.email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{referral.job.title}</p>
                        <p className="text-xs text-slate-500">{referral.job.recruiterCompany}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={getReferralBadgeClass(referral.status)}>
                          {referral.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {referral.commissionAmount !== null
                          ? formatCurrency(referral.commissionAmount)
                          : "--"}
                      </TableCell>
                      <TableCell>{formatDate(new Date(referral.createdAt), "dd MMM yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Commission Summary</h2>
            <div className="flex items-center gap-5">
              <div
                className="h-28 w-28 rounded-full"
                style={{
                  background: `conic-gradient(#10B981 0 ${commissionChart.paidPct}%, #F59E0B ${commissionChart.paidPct}% 100%)`
                }}
              />
              <div className="space-y-1 text-sm text-slate-700">
                <p>Paid: {commissionChart.paidPct}%</p>
                <p>Pending: {commissionChart.pendingPct}%</p>
                <p>Total Paid: {formatCurrency(stats.paidAmount)}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Active referrals: <span className="font-semibold">{stats.activeReferrals}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Commission Jobs</h2>
            {jobs.length === 0 ? (
              <EmptyState
                icon={Link2}
                title="No jobs available"
                description="No commission-enabled jobs are currently open."
              />
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 8).map((job) => (
                  <div key={job.id} className="flex items-start justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-900">{job.title}</p>
                      <p className="text-sm text-slate-600">{job.company}</p>
                      <p className="text-xs text-slate-500">
                        {job.referralCommissionType ?? "Commission"} {job.referralCommissionValue ?? 0}
                        {job.referralCommissionType === "PCT_OF_CTC" ? "%" : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleGenerateLink(job.id)}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Get Link
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-slate-600">No invoices generated yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Due Date</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.slice(0, 8).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate ? formatDate(new Date(invoice.dueDate), "dd MMM yyyy") : "--"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Refer a Candidate">
        <div className="space-y-3">
          <Select
            label="Job"
            value={formState.jobId}
            options={[
              { label: "Select a commission job", value: "" },
              ...jobs.map((job) => ({
                label: `${job.title} - ${job.company}`,
                value: job.id
              }))
            ]}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, jobId: event.target.value }))
            }
          />

          <Input
            label="Existing Candidate User ID (optional)"
            value={formState.candidateUserId}
            helperText="Provide this if the candidate already has a CampusHire account."
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, candidateUserId: event.target.value }))
            }
          />

          <Input
            label="Candidate Name"
            value={formState.candidateName}
            disabled={!hasExternalCandidate}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, candidateName: event.target.value }))
            }
          />
          <Input
            label="Candidate Email"
            type="email"
            value={formState.candidateEmail}
            disabled={!hasExternalCandidate}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, candidateEmail: event.target.value }))
            }
          />
          <Input
            label="Candidate Phone"
            value={formState.candidatePhone}
            disabled={!hasExternalCandidate}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, candidatePhone: event.target.value }))
            }
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateReferral()} disabled={creating}>
              {creating ? "Submitting..." : "Submit Referral"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </CardContent>
  </Card>
);
