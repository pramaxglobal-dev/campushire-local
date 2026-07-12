"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { JobEditorForm } from "@/components/common/JobEditorForm";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getJob,
  updateJob,
  submitJobForApproval,
  type CreateJobDto,
  type JobDetail
} from "@/lib/api/jobs.api";
import { ROUTES } from "@/lib/utils/routes";

/**
 * Job Edit Page
 *
 * Reuses the existing JobEditorForm component — no duplication.
 * Loads the existing job via getJob, passes values as initialValues,
 * then calls updateJob (not createJob) on save.
 *
 * Route: /dashboard/jobs/[id]/edit
 */
export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getJob(jobId);
      setJob(detail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load job details.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  const saveDraft = async (dto: CreateJobDto) => {
    setSaving(true);
    try {
      await updateJob(jobId, { ...dto, status: "DRAFT" });
      toast.success("Job draft updated");
      // Stay on edit page — user may want to keep editing
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save job.");
    } finally {
      setSaving(false);
    }
  };

  const saveAndSubmit = async (dto: CreateJobDto) => {
    setSaving(true);
    try {
      await updateJob(jobId, dto);
      await submitJobForApproval(jobId);
      toast.success("Job updated and submitted for approval");
      router.push(ROUTES.ats.board(jobId));
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to submit job.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="card" count={4} />;
  if (error || !job) {
    return <ErrorState message={error ?? "Unable to load job."} onRetry={() => void loadJob()} />;
  }

  // Map JobDetail → CreateJobDto initial values for the form
  const initialValues: Partial<CreateJobDto> = {
    title: job.title,
    description: job.description,
    jobType: job.jobType,
    workMode: job.workMode,
    locationCity: job.locationCity ?? undefined,
    locationState: job.locationState ?? undefined,
    openings: job.openings,
    salaryMin: job.minCtc ?? undefined,
    salaryMax: job.maxCtc ?? undefined,
    experienceMin: job.experienceMinMonths ?? undefined,
    experienceMax: job.experienceMaxMonths ?? undefined,
    applicationDeadline: job.applicationDeadline
      ? new Date(job.applicationDeadline).toISOString().slice(0, 10)
      : undefined,
    screeningQuestions: Array.isArray(job.screeningQuestions) ? job.screeningQuestions : [],
    status: job.status
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Job"
        subtitle={`Updating: ${job.title}`}
        breadcrumb={
          <Link href={ROUTES.jobs.list} className="text-accent hover:underline">
            ← Back to Jobs
          </Link>
        }
      />

      <JobEditorForm
        initialValues={initialValues}
        saving={saving}
        onSaveDraft={saveDraft}
        onSaveAndSubmit={saveAndSubmit}
      />
    </div>
  );
}
