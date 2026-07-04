"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApplicationStatus, JobStatus } from "@campushire/types";
import { getStatusColor } from "@campushire/utils";
import { Briefcase } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { getATSStats, type ATSStats } from "@/lib/api/ats.api";
import { listJobs, type JobCard } from "@/lib/api/jobs.api";
import { ROUTES } from "@/lib/utils/routes";

type FilterTab = "ALL" | "ACTIVE" | "CLOSED";

const PIPELINE_STAGES: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW_R1,
  ApplicationStatus.OFFERED,
  ApplicationStatus.HIRED
];

export default function ATSOverviewPage() {
  const [tab, setTab] = useState<FilterTab>("ALL");
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [jobStats, setJobStats] = useState<Record<string, ATSStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status =
        tab === "ACTIVE" ? JobStatus.ACTIVE : tab === "CLOSED" ? JobStatus.CLOSED : undefined;
      const jobsResult = await listJobs({
        page: 1,
        limit: 30,
        myJobsOnly: true,
        status
      });
      const list = jobsResult.data ?? [];
      setJobs(list);

      const statsEntries = await Promise.all(
        list.map(async (job) => {
          const stats = await getATSStats(job.id);
          return [job.id, stats] as const;
        })
      );
      setJobStats(Object.fromEntries(statsEntries));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load ATS overview.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const overall = useMemo(() => {
    return jobs.reduce(
      (acc, job) => {
        const stats = jobStats[job.id];
        if (!stats) return acc;
        acc.total += stats.totalApplications;
        acc.hired += stats.byStage.HIRED;
        return acc;
      },
      { total: 0, hired: 0 }
    );
  }, [jobStats, jobs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ATS Dashboard"
        subtitle={`Track pipeline health across all jobs. Hired: ${overall.hired} / ${overall.total}`}
      />

      <div className="flex flex-wrap gap-2">
        {(["ALL", "ACTIVE", "CLOSED"] as FilterTab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              tab === value ? "border-accent bg-accent text-white" : "border-slate-300 text-slate-700"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {loading ? <LoadingSkeleton variant="table" count={6} /> : null}
      {error && !loading ? <ErrorState message={error} onRetry={() => void loadData()} /> : null}

      {!loading && !error && jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description="Create or activate jobs to start using ATS."
          action={{ label: "Post New Job", href: ROUTES.jobs.new }}
        />
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {jobs.map((job) => {
            const stats = jobStats[job.id];
            const total = stats?.totalApplications ?? 0;
            return (
              <Card key={job.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{job.title}</p>
                      <p className="text-sm text-slate-600">{job.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(job.status)}>{job.status.replaceAll("_", " ")}</Badge>
                      <Badge variant="info">{total} applications</Badge>
                      <Link href={ROUTES.ats.board(job.id)}>
                        <Button size="sm">Open Kanban</Button>
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="grid grid-cols-6 gap-1">
                      {PIPELINE_STAGES.map((stage) => {
                        const count = stats?.byStage[stage] ?? 0;
                        const width = total > 0 ? Math.max(8, Math.round((count / total) * 100)) : 0;
                        return (
                          <div key={stage} className="rounded bg-slate-200">
                            <div className="h-2 rounded bg-accent" style={{ width: `${width}%` }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-6 gap-1 text-[11px] text-slate-500">
                      {PIPELINE_STAGES.map((stage) => (
                        <span key={stage} className="truncate">
                          {stage.replace("INTERVIEW_", "INT ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
