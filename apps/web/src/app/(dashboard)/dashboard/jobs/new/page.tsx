"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { JobEditorForm } from "@/components/common/JobEditorForm";
import { createJob, submitJobForApproval, type CreateJobDto } from "@/lib/api/jobs.api";
import { ROUTES } from "@/lib/utils/routes";

export default function NewJobPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const saveDraft = async (dto: CreateJobDto) => {
    setSaving(true);
    try {
      const created = await createJob({ ...dto, status: "DRAFT" });
      toast.success("Draft saved");
      router.push(ROUTES.jobs.edit(created.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save job draft.");
    } finally {
      setSaving(false);
    }
  };

  const saveAndSubmit = async (dto: CreateJobDto) => {
    setSaving(true);
    try {
      const created = await createJob({ ...dto, status: "DRAFT" });
      await submitJobForApproval(created.id);
      toast.success("Job submitted for approval");
      router.push(ROUTES.ats.board(created.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit job.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Job"
        subtitle="Set up role details, screening rules, and commission options."
      />

      <JobEditorForm saving={saving} onSaveDraft={saveDraft} onSaveAndSubmit={saveAndSubmit} />
    </div>
  );
}
