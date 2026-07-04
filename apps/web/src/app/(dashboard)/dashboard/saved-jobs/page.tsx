"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkMinus, Briefcase } from "lucide-react";
import { formatSalaryRange } from "@campushire/utils";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { getSavedJobs, unsaveJob, type JobCard } from "@/lib/api/jobs.api";
import { ROUTES } from "@/lib/utils/routes";
import { toast } from "sonner";

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadJobs = useCallback(async (nextPage: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getSavedJobs(nextPage);
      const data = result.data ?? [];
      setJobs((prev) => (append ? [...prev, ...data] : data));
      setPage(nextPage);
      setTotalPages(result.meta.totalPages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load saved jobs.");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs(1);
  }, [loadJobs]);

  const removeSaved = async (id: string) => {
    const previous = jobs;
    setJobs((prev) => prev.filter((item) => item.id !== id));
    try {
      await unsaveJob(id);
      toast.success("Removed from saved jobs");
    } catch (removeError) {
      setJobs(previous);
      toast.error(removeError instanceof Error ? removeError.message : "Unable to remove saved job.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Saved Jobs" subtitle="Your bookmarked opportunities for quick access." />

      {loading ? <LoadingSkeleton variant="feed" count={6} /> : null}
      {error && !loading ? <ErrorState message={error} onRetry={() => void loadJobs(1)} /> : null}

      {!loading && !error && jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No saved jobs yet"
          description="Browse jobs and bookmark the ones you like."
          action={{ label: "Browse Jobs", href: ROUTES.jobs.list }}
        />
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="transition hover:shadow-card-hover">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={ROUTES.jobs.detail(job.id)} className="text-lg font-semibold text-slate-900 hover:text-accent">
                    {job.title}
                  </Link>
                  <p className="text-sm text-slate-600">{job.company}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {job.salaryRange || (job.minCtc && job.maxCtc ? formatSalaryRange(job.minCtc, job.maxCtc) : "Compensation on request")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{job.jobType.replaceAll("_", " ")}</Badge>
                    <Badge variant="info">{job.workMode.replaceAll("_", " ")}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={ROUTES.jobs.detail(job.id)}>
                    <Button variant="outline">View Job</Button>
                  </Link>
                  <Button variant="destructive" onClick={() => void removeSaved(job.id)}>
                    <BookmarkMinus className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {page < totalPages ? (
            <div className="flex justify-center">
              <Button variant="outline" disabled={loadingMore} onClick={() => void loadJobs(page + 1, true)}>
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
