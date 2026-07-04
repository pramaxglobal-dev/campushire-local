import { useCallback, useEffect, useState } from "react";
import { applyToJob } from "@/lib/api/applications.api";
import { getJobFeed, listJobs, type JobCard } from "@/lib/api/jobs.api";

interface UseJobsOptions {
  personalized?: boolean;
  search?: string;
}

export const useJobs = (options: UseJobsOptions = {}) => {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(
    async (nextPage = 1, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const response = options.personalized
          ? await getJobFeed(nextPage, 20)
          : await listJobs({
              page: nextPage,
              limit: 20,
              search: options.search
            });
        setTotalPages(response.meta.totalPages);
        setPage(nextPage);
        setJobs((prev) => (append ? [...prev, ...response.data] : response.data));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load jobs.");
      } finally {
        setLoading(false);
      }
    },
    [options.personalized, options.search]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadJobs(1, false);
    setRefreshing(false);
  }, [loadJobs]);

  const loadMore = useCallback(async () => {
    if (loading || page >= totalPages) {
      return;
    }
    await loadJobs(page + 1, true);
  }, [loadJobs, loading, page, totalPages]);

  const apply = useCallback(async (jobId: string, coverNote?: string) => {
    await applyToJob(jobId, coverNote ? { coverNote } : {});
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void loadJobs(1, false);
  }, [loadJobs]);

  return {
    jobs,
    loading,
    refreshing,
    error,
    page,
    totalPages,
    refresh,
    loadMore,
    apply
  };
};
