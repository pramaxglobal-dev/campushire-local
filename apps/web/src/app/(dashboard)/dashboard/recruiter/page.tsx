"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { JobStatus, type InterviewSlot, type RecruiterAnalytics } from "@campushire/types";
import { formatDate, getStatusColor } from "@campushire/utils";
import { Briefcase } from "lucide-react";
import { Badge, Button, Card, CardContent, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { getApplicationsForJob, getATSStats, type ATSApplicationDetail } from "@/lib/api/ats.api";
import { getInterviews } from "@/lib/api/interviews.api";
import { getRecruiterAnalytics } from "@/lib/api/analytics.api";
import {
  getRecruiterJobStats,
  listJobs,
  updateJob,
  type JobCard
} from "@/lib/api/jobs.api";
import { ROUTES } from "@/lib/utils/routes";
import { toast } from "sonner";

type JobFilter = "ALL" | "ACTIVE" | "DRAFT" | "PAUSED" | "CLOSED";

interface RecruiterDashboardData {
  jobs: JobCard[];
  interviews: InterviewSlot[];
  recentApplications: Array<ATSApplicationDetail & { jobTitle: string }>;
  totalApplications: number;
  hiresThisMonth: number;
  analytics: RecruiterAnalytics;
}

const EMPTY_RECRUITER_ANALYTICS: RecruiterAnalytics = {
  totalJobsPosted: 0,
  activeJobs: 0,
  totalApplicationsReceived: 0,
  applicationsByStage: {} as RecruiterAnalytics["applicationsByStage"],
  applicationsByJob: [],
  timeToHire: 0,
  offerAcceptanceRate: 0,
  topSourceColleges: [],
  interviewsScheduled: 0,
  hiresByMonth: [],
  conversionFunnel: []
};

export default function RecruiterDashboardPage() {
  const [filter, setFilter] = useState<JobFilter>("ALL");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<RecruiterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingJobId, setTogglingJobId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = filter === "ALL" ? undefined : (filter as JobStatus);
      const to = new Date();
      const from = new Date(to);
      if (dateRange === "7d") {
        from.setDate(to.getDate() - 7);
      } else if (dateRange === "90d") {
        from.setDate(to.getDate() - 90);
      } else {
        from.setDate(to.getDate() - 30);
      }
      const fromIso = from.toISOString().slice(0, 10);
      const toIso = to.toISOString().slice(0, 10);

      const [jobStats, atsStats, jobsResult, interviews, analytics] = await Promise.allSettled([
        getRecruiterJobStats(),
        getATSStats(),
        listJobs({ page: 1, limit: 20, myJobsOnly: true, status }),
        getInterviews(),
        getRecruiterAnalytics(fromIso, toIso)
      ]);

      const hasAnySuccess = [jobStats, atsStats, jobsResult, interviews, analytics].some(
        (result) => result.status === "fulfilled"
      );
      if (!hasAnySuccess) {
        setError("Unable to load recruiter dashboard.");
      }

      const jobs = jobsResult.status === "fulfilled" ? (jobsResult.value.data ?? []) : [];
      const appCollections = await Promise.allSettled(
        jobs.slice(0, 10).map(async (job) => {
          const result = await getApplicationsForJob(job.id, { page: 1, limit: 10 });
          return {
            jobTitle: job.title,
            applications: result.data ?? []
          };
        })
      );

      const recentApplications = appCollections
        .filter(
          (
            collection
          ): collection is PromiseFulfilledResult<{ jobTitle: string; applications: ATSApplicationDetail[] }> =>
            collection.status === "fulfilled"
        )
        .flatMap((collection) =>
          collection.value.applications.map((application) => ({
            ...application,
            jobTitle: collection.value.jobTitle
          }))
        )
        .sort(
          (a, b) =>
            new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
        )
        .slice(0, 10);

      setData({
        jobs,
        interviews:
          interviews.status === "fulfilled"
            ? interviews.value
          .filter((slot) => new Date(slot.scheduledStartAt).getTime() > Date.now())
              .slice(0, 5)
            : [],
        recentApplications,
        totalApplications: jobStats.status === "fulfilled" ? jobStats.value.totalApplications : 0,
        hiresThisMonth:
          atsStats.status === "fulfilled" ? (atsStats.value.byStage.HIRED ?? 0) : 0,
        analytics: analytics.status === "fulfilled" ? analytics.value : EMPTY_RECRUITER_ANALYTICS
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load recruiter dashboard.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, filter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const jobs = data?.jobs ?? [];
    return {
      activeJobs: jobs.filter((job) => job.status === JobStatus.ACTIVE).length,
      totalApplications: data?.totalApplications ?? 0,
      interviewsScheduled: data?.interviews.length ?? 0,
      hiresThisMonth: data?.hiresThisMonth ?? 0
    };
  }, [data]);

  const toggleJobStatus = async (job: JobCard) => {
    const nextStatus = job.status === JobStatus.ACTIVE ? JobStatus.PAUSED : JobStatus.ACTIVE;
    setTogglingJobId(job.id);
    try {
      await updateJob(job.id, { status: nextStatus });
      toast.success(`Job ${nextStatus === JobStatus.ACTIVE ? "activated" : "paused"}`);
      await loadDashboard();
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : "Unable to update job status.");
    } finally {
      setTogglingJobId(null);
    }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error || !data) return <ErrorState message={error ?? "Unable to load dashboard."} onRetry={() => void loadDashboard()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruiter Dashboard"
        subtitle="Manage your jobs, pipeline, and upcoming interviews."
        actions={
          <Link href={ROUTES.jobs.new}>
            <Button>Post New Job</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Active Jobs" value={stats.activeJobs} />
        <StatCard title="Total Applications" value={stats.totalApplications} />
        <StatCard title="Interviews Scheduled" value={stats.interviewsScheduled} />
        <StatCard title="Hires This Month" value={stats.hiresThisMonth} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Recruiter Analytics</h2>
            <div className="flex gap-2">
              {(["7d", "30d", "90d"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateRange(range)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    dateRange === range
                      ? "border-accent bg-accent text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  Last {range}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Conversion Funnel</p>
              <div className="mt-2 space-y-2">
                {data.analytics.conversionFunnel.map((stage) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{stage.stage}</span>
                      <span>{stage.count} ({stage.rate}%)</span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${Math.min(100, Math.max(2, stage.rate))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Hires By Month</p>
              <div className="mt-2 flex items-end gap-2">
                {data.analytics.hiresByMonth.map((item) => (
                  <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-accent"
                      style={{ height: `${Math.max(8, item.count * 18)}px` }}
                    />
                    <span className="text-[10px] text-slate-500">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Time to Hire</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{data.analytics.timeToHire} days</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Offer Acceptance Rate</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{data.analytics.offerAcceptanceRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Jobs Summary</h2>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "ACTIVE", "DRAFT", "PAUSED", "CLOSED"] as JobFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    filter === value
                      ? "border-accent bg-accent text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {data.jobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No jobs found" description="Create your first job post to start hiring." action={{ label: "Create Job", href: ROUTES.jobs.new }} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Job Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Applications</TableCell>
                  <TableCell>Posted Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.jobs.map((job) => {
                  const totalForJob = data.recentApplications.filter((entry) => entry.jobId === job.id).length;
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{job.title}</p>
                          <p className="text-xs text-slate-500">{job.company}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(job.status)}>{job.status.replaceAll("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>{totalForJob}</TableCell>
                      <TableCell>{formatDate(new Date(job.createdAt))}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Link href={ROUTES.ats.board(job.id)}>
                            <Button variant="outline" size="sm">View ATS</Button>
                          </Link>
                          <Link href={ROUTES.jobs.edit(job.id)}>
                            <Button variant="outline" size="sm">Edit</Button>
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => void toggleJobStatus(job)}
                            disabled={togglingJobId === job.id}
                          >
                            {togglingJobId === job.id
                              ? "Updating..."
                              : job.status === JobStatus.ACTIVE
                              ? "Pause"
                              : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Recent Applications</h2>
            {data.recentApplications.length === 0 ? (
              <p className="text-sm text-slate-600">No recent applications.</p>
            ) : (
              data.recentApplications.map((application) => (
                <Link key={application.id} href={ROUTES.ats.board(application.jobId)} className="block">
                  <div className="rounded-lg border border-slate-200 p-3 transition hover:shadow-card">
                    <p className="font-medium text-slate-900">
                      {application.candidate.firstName as string} {application.candidate.lastName as string}
                    </p>
                    <p className="text-sm text-slate-600">{application.jobTitle}</p>
                    <p className="text-xs text-slate-500">
                      {application.status.replaceAll("_", " ")} • {formatDate(new Date(application.appliedAt), "dd MMM, hh:mm a")}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Interviews</h2>
            {data.interviews.length === 0 ? (
              <p className="text-sm text-slate-600">No upcoming interviews scheduled.</p>
            ) : (
              data.interviews.map((slot) => (
                <div key={slot.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{slot.round}</Badge>
                    <Badge variant="info">{slot.mode.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    {formatDate(new Date(slot.scheduledStartAt), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const StatCard = ({ title, value }: { title: string; value: number }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </CardContent>
  </Card>
);
