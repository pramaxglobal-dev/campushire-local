"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Building2, CheckCircle2, Filter, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { JobType, WorkMode } from "@campushire/types";
import { formatSalaryRange, getInitials } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Input, Select } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  listJobs,
  saveJob,
  unsaveJob,
  type JobCard,
  type JobFilters
} from "@/lib/api/jobs.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { ROUTES } from "@/lib/utils/routes";
import { toTimeAgo } from "@/lib/utils/dashboard";
import { toast } from "sonner";

const JOB_TYPES: JobType[] = [
  JobType.INTERNSHIP,
  JobType.FULL_TIME,
  JobType.PART_TIME,
  JobType.CONTRACT,
  JobType.APPRENTICESHIP
];

const WORK_MODES: WorkMode[] = [WorkMode.REMOTE, WorkMode.HYBRID, WorkMode.ONSITE];

interface LocalFilters {
  search: string;
  jobTypes: JobType[];
  workMode: WorkMode | "";
  locationCity: string;
  salaryMin: number;
  salaryMax: number;
  experience: number;
  sortBy: "newest" | "salary" | "relevance";
}

const parseJobTypeParam = (value: string | null): JobType[] => {
  if (!value) return [];
  return value
    .split(",")
    .filter((item): item is JobType => Object.values(JobType).includes(item as JobType));
};

const createInitialFilters = (searchParams: URLSearchParams): LocalFilters => {
  const sortBy = searchParams.get("sortBy");
  return {
    search: searchParams.get("search") ?? "",
    jobTypes: parseJobTypeParam(searchParams.get("jobType")),
    workMode:
      searchParams.get("workMode") && Object.values(WorkMode).includes(searchParams.get("workMode") as WorkMode)
        ? (searchParams.get("workMode") as WorkMode)
        : "",
    locationCity: searchParams.get("locationCity") ?? "",
    salaryMin: Number.parseInt(searchParams.get("salaryMin") ?? "0", 10) || 0,
    salaryMax: Number.parseInt(searchParams.get("salaryMax") ?? "5000000", 10) || 5000000,
    experience: Number.parseInt(searchParams.get("experience") ?? "0", 10) || 0,
    sortBy: sortBy === "salary" || sortBy === "relevance" ? sortBy : "newest"
  };
};

const getJobTypeLabel = (jobType: JobType): string => {
  return jobType.replaceAll("_", " ");
};

const getWorkModeLabel = (workMode: WorkMode): string => {
  return workMode.replaceAll("_", " ");
};

export default function JobFeedPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [filters, setFilters] = useState<LocalFilters>(() => createInitialFilters(new URLSearchParams(searchParams)));
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search, 300);

  const buildApiFilters = useCallback(
    (nextPage: number): JobFilters => {
      return {
        page: nextPage,
        limit: 12,
        search: debouncedSearch || undefined,
        jobType: undefined,
        workMode: filters.workMode || undefined,
        locationCity: filters.locationCity || undefined,
        salaryMin: filters.salaryMin > 0 ? filters.salaryMin : undefined,
        salaryMax: filters.salaryMax < 5000000 ? filters.salaryMax : undefined,
        skills: undefined,
        sortBy: filters.sortBy,
        sortOrder: "desc"
      };
    },
    [debouncedSearch, filters.locationCity, filters.salaryMax, filters.salaryMin, filters.sortBy, filters.workMode]
  );

  const syncUrl = useCallback(
    (next: LocalFilters) => {
      const params = new URLSearchParams();
      if (next.search.trim()) params.set("search", next.search.trim());
      if (next.jobTypes.length > 0) params.set("jobType", next.jobTypes.join(","));
      if (next.workMode) params.set("workMode", next.workMode);
      if (next.locationCity.trim()) params.set("locationCity", next.locationCity.trim());
      if (next.salaryMin > 0) params.set("salaryMin", String(next.salaryMin));
      if (next.salaryMax < 5000000) params.set("salaryMax", String(next.salaryMax));
      if (next.experience > 0) params.set("experience", String(next.experience));
      if (next.sortBy !== "newest") params.set("sortBy", next.sortBy);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router]
  );

  const loadJobs = useCallback(
    async (nextPage: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const payload = buildApiFilters(nextPage);
        if (filters.jobTypes.length === 1) {
          payload.jobType = filters.jobTypes[0];
        }

        const result = await listJobs(payload);
        const data = result.data ?? [];
        const filteredData =
          filters.jobTypes.length > 1 ? data.filter((job) => filters.jobTypes.includes(job.jobType)) : data;

        setJobs((prev) => (append ? [...prev, ...filteredData] : filteredData));
        setPage(nextPage);
        setTotalPages(result.meta.totalPages);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load jobs.";
        setError(message);
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [buildApiFilters, filters.jobTypes]
  );

  useEffect(() => {
    void loadJobs(1);
  }, [loadJobs]);

  useEffect(() => {
    syncUrl(filters);
  }, [filters, syncUrl]);

  const toggleSave = async (job: JobCard) => {
    const nextSaved = !job.hasSaved;
    setJobs((prev) => prev.map((item) => (item.id === job.id ? { ...item, hasSaved: nextSaved } : item)));

    try {
      if (nextSaved) {
        await saveJob(job.id);
        toast.success("Job saved");
      } else {
        await unsaveJob(job.id);
        toast.success("Job removed from saved");
      }
    } catch (saveError) {
      setJobs((prev) => prev.map((item) => (item.id === job.id ? { ...item, hasSaved: !nextSaved } : item)));
      toast.error(saveError instanceof Error ? saveError.message : "Unable to update bookmark.");
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      jobTypes: [],
      workMode: "",
      locationCity: "",
      salaryMin: 0,
      salaryMax: 5000000,
      experience: 0,
      sortBy: "newest"
    });
  };

  const resultLabel = useMemo(() => {
    return `${jobs.length} jobs`;
  }, [jobs.length]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Feed"
        subtitle="Discover opportunities matched to your profile"
        actions={
          <Button variant="outline" onClick={clearFilters}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="space-y-5 p-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Search</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  className="pl-9"
                  helperText="Search title or company"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Job Type</p>
              <div className="grid gap-2">
                {JOB_TYPES.map((jobType) => (
                  <label key={jobType} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={filters.jobTypes.includes(jobType)}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          jobTypes: event.target.checked
                            ? [...prev.jobTypes, jobType]
                            : prev.jobTypes.filter((item) => item !== jobType)
                        }))
                      }
                    />
                    {getJobTypeLabel(jobType)}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Work Mode</p>
              <div className="flex flex-wrap gap-2">
                {WORK_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        workMode: prev.workMode === mode ? "" : mode
                      }))
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      filters.workMode === mode
                        ? "border-accent bg-accent text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {getWorkModeLabel(mode)}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Location"
              helperText="City"
              value={filters.locationCity}
              onChange={(event) => setFilters((prev) => ({ ...prev, locationCity: event.target.value }))}
            />

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Salary Range</p>
              <div className="grid gap-2">
                <Input
                  type="range"
                  min={0}
                  max={5000000}
                  step={50000}
                  value={filters.salaryMin}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      salaryMin: Number.parseInt(event.target.value, 10)
                    }))
                  }
                />
                <Input
                  type="range"
                  min={0}
                  max={5000000}
                  step={50000}
                  value={filters.salaryMax}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      salaryMax: Number.parseInt(event.target.value, 10)
                    }))
                  }
                />
                <p className="text-xs text-slate-600">
                  {formatSalaryRange(filters.salaryMin, filters.salaryMax)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Experience</p>
              <Input
                type="range"
                min={0}
                max={10}
                step={1}
                value={filters.experience}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, experience: Number.parseInt(event.target.value, 10) }))
                }
              />
              <p className="text-xs text-slate-600">{filters.experience} years+</p>
            </div>

            <Button
              className="w-full"
              onClick={() => void loadJobs(1)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">{resultLabel}</p>
            <div className="w-full sm:w-64">
              <Select
                value={filters.sortBy}
                options={[
                  { label: "Newest", value: "newest" },
                  { label: "Salary: High to Low", value: "salary" },
                  { label: "Best Match", value: "relevance" }
                ]}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: event.target.value as LocalFilters["sortBy"]
                  }))
                }
              />
            </div>
          </div>

          {loading ? <LoadingSkeleton variant="feed" count={6} /> : null}
          {error && !loading ? <ErrorState message={error} onRetry={() => void loadJobs(1)} /> : null}

          {!loading && !error && jobs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No jobs match your filters"
              description="Try broadening your search or clear filters to see more jobs."
              action={{ label: "Clear Filters", onClick: clearFilters }}
            />
          ) : null}

          {!loading && !error ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Card key={job.id} className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-hover">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                          {job.logo ? (
                            <img src={job.logo} alt={job.company} className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-slate-700">
                              {getInitials(job.company, job.company)}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={ROUTES.jobs.detail(job.id)} className="text-lg font-semibold text-slate-900 hover:text-accent">
                              {job.title}
                            </Link>
                            {job.isFeatured ? (
                              <Badge variant="warning">Featured</Badge>
                            ) : null}
                            {job.hasApplied ? (
                              <Badge variant="success">Applied</Badge>
                            ) : null}
                            {job.matchScore > 0 ? (
                              <Badge variant="info">{job.matchScore}% Match</Badge>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span>{job.company}</span>
                            <span className="text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location || "Flexible"}
                            </span>
                            <Badge>{getWorkModeLabel(job.workMode)}</Badge>
                            <Badge>{getJobTypeLabel(job.jobType)}</Badge>
                          </div>

                          <p className="text-sm font-medium text-slate-800">
                            {job.salaryRange || (job.minCtc && job.maxCtc ? formatSalaryRange(job.minCtc, job.maxCtc) : "Compensation disclosed on shortlisting")}
                          </p>

                          {job.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {job.skills.slice(0, 3).map((skill) => (
                                <span key={skill} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                  {skill}
                                </span>
                              ))}
                              {job.skills.length > 3 ? (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                  +{job.skills.length - 3} more
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          <p className="text-xs text-slate-500">Posted {toTimeAgo(job.postedAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => void toggleSave(job)}>
                          <Bookmark className={`mr-1 h-4 w-4 ${job.hasSaved ? "fill-current" : ""}`} />
                          {job.hasSaved ? "Saved" : "Save"}
                        </Button>
                        {job.hasApplied ? (
                          <Badge variant="success" className="h-9 px-3 text-sm">
                            <CheckCircle2 className="mr-1 h-4 w-4" /> Applied
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!isAuthenticated) {
                                router.push(ROUTES.login);
                                return;
                              }
                              router.push(ROUTES.jobs.detail(job.id));
                            }}
                          >
                            Apply Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {!loading && !error && page < totalPages ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => void loadJobs(page + 1, true)} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
