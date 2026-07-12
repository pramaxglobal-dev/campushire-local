"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, CalendarClock, FileText } from "lucide-react";
import { ApplicationStatus } from "@campushire/types";
import { formatDate, getStatusColor } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Modal } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getMyApplications,
  withdrawApplication,
  type ApplicationCard
} from "@/lib/api/applications.api";
import { ROUTES } from "@/lib/utils/routes";
import { toast } from "sonner";

const STATUS_TABS: Array<{ label: string; value: ApplicationStatus | "INTERVIEW" | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Applied", value: ApplicationStatus.APPLIED },
  { label: "Screening", value: ApplicationStatus.SCREENING },
  { label: "Shortlisted", value: ApplicationStatus.SHORTLISTED },
  { label: "Interview", value: "INTERVIEW" },
  { label: "Offered", value: ApplicationStatus.OFFERED },
  { label: "Rejected", value: ApplicationStatus.REJECTED },
  { label: "Withdrawn", value: ApplicationStatus.WITHDRAWN }
];

const PIPELINE: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW_R1,
  ApplicationStatus.OFFERED,
  ApplicationStatus.HIRED
];

const INTERVIEW_STAGES: ApplicationStatus[] = [
  ApplicationStatus.INTERVIEW_R1,
  ApplicationStatus.INTERVIEW_R2,
  ApplicationStatus.INTERVIEW_R3
];

const includesInterviewStage = (status: ApplicationStatus): boolean => {
  return INTERVIEW_STAGES.includes(status);
};

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]["value"]>("ALL");
  const [applications, setApplications] = useState<ApplicationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status =
        activeTab === "ALL" || activeTab === "INTERVIEW" ? undefined : activeTab;
      const result = await getMyApplications({
        page: 1,
        limit: 100,
        status
      });

      const data = result.data ?? [];
      setApplications(
        activeTab === "INTERVIEW" ? data.filter((item) => includesInterviewStage(item.status)) : data
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const withdraw = async (id: string) => {
    setWithdrawingId(id);
    setConfirmWithdrawId(null);
    try {
      await withdrawApplication(id);
      toast.success("Application withdrawn");
      await loadApplications();
    } catch (withdrawError) {
      toast.error(withdrawError instanceof Error ? withdrawError.message : "Unable to withdraw.");
    } finally {
      setWithdrawingId(null);
    }
  };

  const emptyDescription = useMemo(() => {
    const tab = STATUS_TABS.find((item) => item.value === activeTab);
    return `No ${tab?.label.toLowerCase() ?? "applications"} found right now.`;
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Applications"
        subtitle="Track your application stages and take timely actions."
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              activeTab === tab.value
                ? "border-accent bg-accent text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSkeleton variant="list" count={6} /> : null}
      {error && !loading ? <ErrorState message={error} onRetry={() => void loadApplications()} /> : null}

      {!loading && !error && applications.length === 0 ? (
        <EmptyState icon={FileText} title="No applications found" description={emptyDescription} />
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4">
          {applications.map((application) => {
            const currentIndex =
              application.status === ApplicationStatus.INTERVIEW_R2 ||
              application.status === ApplicationStatus.INTERVIEW_R3
                ? 3
                : PIPELINE.indexOf(application.status);

            return (
              <Card key={application.id} className="transition hover:shadow-card-hover">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Link
                        href={ROUTES.applications.detail(application.id)}
                        className="text-lg font-semibold text-slate-900 hover:text-accent"
                      >
                        {application.jobTitle}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">{application.company}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <CalendarClock className="h-4 w-4" />
                        Applied on {formatDate(new Date(application.appliedAt))}
                      </p>
                    </div>

                    <Badge className={getStatusColor(application.status)}>{application.status.replaceAll("_", " ")}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Pipeline</span>
                      <span>Current stage: {application.status.replaceAll("_", " ")}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {PIPELINE.map((step, index) => (
                        <div
                          key={step}
                          className={`h-2 rounded-full ${
                            currentIndex >= index ? "bg-accent" : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={ROUTES.applications.detail(application.id)}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>

                    {(application.status === ApplicationStatus.APPLIED ||
                      application.status === ApplicationStatus.SCREENING) ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmWithdrawId(application.id)}
                        disabled={withdrawingId === application.id}
                      >
                        {withdrawingId === application.id ? "Withdrawing..." : "Withdraw"}
                      </Button>
                    ) : null}

                    {includesInterviewStage(application.status) ? (
                      <Link href={ROUTES.interviews}>
                        <Button size="sm" variant="outline">View Interview Details</Button>
                      </Link>
                    ) : null}

                    {application.status === ApplicationStatus.OFFERED ? (
                      <Link href={ROUTES.applications.detail(application.id)}>
                        <Button size="sm">View Offer</Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={confirmWithdrawId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmWithdrawId(null);
        }}
        title="Withdraw Application"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to withdraw this application? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmWithdrawId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmWithdrawId && void withdraw(confirmWithdrawId)}
              disabled={withdrawingId !== null}
            >
              {withdrawingId ? "Withdrawing..." : "Confirm Withdraw"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
