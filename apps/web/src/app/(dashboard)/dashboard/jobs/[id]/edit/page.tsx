"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { JobEditorForm } from "@/components/common/JobEditorForm";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getJob,
  submitJobForApproval,
  updateJob,
  type CreateJobDto,
  type JobDetail
} from "@/lib/api/jobs.api";
import { ROUTES } from "@/lib/utils/routes";

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJob(params.id);
      setJob(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load job.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  const initialValues = useMemo<Partial<CreateJobDto> | undefined>(() => {
    if (!job) return undefined;
    return {
      title: job.title,
      description: job.description,
      jobType: job.jobType,
      workMode: job.workMode,
      locationCity: job.locationCity ?? undefined,
      locationState: job.locationState ?? undefined,
      openings: job.openings,
      applicationDeadline:
        job.applicationDeadline instanceof Date
          ? job.applicationDeadline.toISOString()
          : job.applicationDeadline ?? undefined,
      salaryMin: job.minCtc ?? undefined,
      salaryMax: job.maxCtc ?? undefined,
      experienceMin: job.experienceMinMonths ?? undefined,
      experienceMax: job.experienceMaxMonths ?? undefined,
      skillsRequired: job.skills.map((skill) => ({ name: skill, isMandatory: false })),
      screeningQuestions: job.screeningQuestions,
      targetCollegeIds: job.collegeProfileId ? [job.collegeProfileId] : [],
      commissionPct: job.referralCommissionValue ?? undefined,
      commissionType: job.referralCommissionType ?? undefined,
      commissionTrigger: job.referralCommissionTrigger ?? undefined
    };
  }, [job]);

  const saveDraft = async (dto: CreateJobDto) => {
    setSaving(true);
    try {
      await updateJob(params.id, { ...dto, status: "DRAFT" });
      toast.success("Draft updated");
      await loadJob();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to update draft.");
    } finally {
      setSaving(false);
    }
  };

  const saveAndSubmit = async (dto: CreateJobDto) => {
    setSaving(true);
    try {
      await updateJob(params.id, { ...dto, status: "DRAFT" });
      await submitJobForApproval(params.id);
      toast.success("Job submitted for approval");
      router.push(ROUTES.ats.board(params.id));
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to submit job.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="profile" count={1} />;
  if (error || !job) return <ErrorState message={error ?? "Unable to load job."} onRetry={() => void loadJob()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Job - ${job.title}`}
        subtitle="Update the job configuration and submit when ready."
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
