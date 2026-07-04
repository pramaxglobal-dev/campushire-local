"use client";

import { useMemo, useState } from "react";
import {
  CommissionTrigger,
  CommissionType,
  JobType,
  WorkMode,
  type JobStatus
} from "@campushire/types";
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from "lucide-react";
import { Button, Card, CardContent, Input, Select, Textarea } from "@/components/ui";
import type { CreateJobDto } from "@/lib/api/jobs.api";

interface SkillRequirement {
  name: string;
  isMandatory: boolean;
}

interface QuestionItem {
  question: string;
  type: "text" | "select" | "yes-no";
  isRequired: boolean;
}

interface JobEditorFormProps {
  initialValues?: Partial<CreateJobDto>;
  saving?: boolean;
  onSaveDraft: (dto: CreateJobDto) => Promise<void>;
  onSaveAndSubmit: (dto: CreateJobDto) => Promise<void>;
}

const JOB_TYPE_OPTIONS = [
  { label: "Internship", value: JobType.INTERNSHIP },
  { label: "Apprenticeship", value: JobType.APPRENTICESHIP },
  { label: "Full-Time", value: JobType.FULL_TIME },
  { label: "Part-Time", value: JobType.PART_TIME },
  { label: "Contract", value: JobType.CONTRACT }
];

const WORK_MODE_OPTIONS = [
  { label: "Remote", value: WorkMode.REMOTE },
  { label: "Hybrid", value: WorkMode.HYBRID },
  { label: "Onsite", value: WorkMode.ONSITE }
];

const asDateInput = (value: string | Date | undefined): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const JobEditorForm = ({
  initialValues,
  saving,
  onSaveDraft,
  onSaveAndSubmit
}: JobEditorFormProps) => {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [jobType, setJobType] = useState<JobType>(initialValues?.jobType ?? JobType.INTERNSHIP);
  const [workMode, setWorkMode] = useState<WorkMode>(initialValues?.workMode ?? WorkMode.REMOTE);
  const [locationCity, setLocationCity] = useState(initialValues?.locationCity ?? "");
  const [locationState, setLocationState] = useState(initialValues?.locationState ?? "");
  const [openings, setOpenings] = useState(initialValues?.openings ?? 1);
  const [applicationDeadline, setApplicationDeadline] = useState(asDateInput(initialValues?.applicationDeadline));
  const [salaryMin, setSalaryMin] = useState(initialValues?.salaryMin ?? 0);
  const [salaryMax, setSalaryMax] = useState(initialValues?.salaryMax ?? 0);
  const [experienceMin, setExperienceMin] = useState(initialValues?.experienceMin ?? 0);
  const [experienceMax, setExperienceMax] = useState(initialValues?.experienceMax ?? 0);
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [skillsRequired, setSkillsRequired] = useState<SkillRequirement[]>(
    initialValues?.skillsRequired?.map((skill) => ({
      name: skill.name,
      isMandatory: skill.isMandatory
    })) ?? []
  );
  const [newSkill, setNewSkill] = useState("");
  const [targetCollegeIds, setTargetCollegeIds] = useState(
    Array.isArray(initialValues?.targetCollegeIds) ? initialValues.targetCollegeIds.join(", ") : ""
  );
  const [screeningQuestions, setScreeningQuestions] = useState<QuestionItem[]>(
    initialValues?.screeningQuestions?.map((question) => ({
      question: question.question,
      type:
        question.type === "select" || question.type === "yes-no" || question.type === "text"
          ? question.type
          : "text",
      isRequired: question.isRequired
    })) ?? []
  );
  const [commissionEnabled, setCommissionEnabled] = useState(Boolean(initialValues?.commissionPct));
  const [commissionPct, setCommissionPct] = useState(initialValues?.commissionPct ?? 0);
  const [commissionType, setCommissionType] = useState<CommissionType>(
    initialValues?.commissionType ?? CommissionType.PCT_OF_CTC
  );
  const [commissionTrigger, setCommissionTrigger] = useState<CommissionTrigger>(
    initialValues?.commissionTrigger ?? CommissionTrigger.ON_JOINING
  );

  const [skillMandatory, setSkillMandatory] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && description.trim().length > 0;
  }, [description, title]);

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= screeningQuestions.length) return;
    const next = [...screeningQuestions];
    const current = next[index];
    const swap = next[target];
    if (!current || !swap) return;
    next[index] = swap;
    next[target] = current;
    setScreeningQuestions(next);
  };

  const createPayload = (status: JobStatus): CreateJobDto => {
    return {
      title: title.trim(),
      description: description.trim(),
      jobType,
      workMode,
      locationCity: locationCity.trim() || undefined,
      locationState: locationState.trim() || undefined,
      openings,
      applicationDeadline: applicationDeadline || undefined,
      salaryMin: salaryMin > 0 ? salaryMin : undefined,
      salaryMax: salaryMax > 0 ? salaryMax : undefined,
      experienceMin: experienceMin > 0 ? experienceMin : undefined,
      experienceMax: experienceMax > 0 ? experienceMax : undefined,
      skillsRequired: skillsRequired.filter((skill) => skill.name.trim().length > 0),
      targetCollegeIds: targetCollegeIds
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      screeningQuestions: screeningQuestions
        .filter((question) => question.question.trim().length > 0)
        .map((question) => ({
          question: question.question.trim(),
          type: question.type,
          isRequired: question.isRequired
        })),
      commissionPct: commissionEnabled && commissionPct > 0 ? commissionPct : undefined,
      commissionType: commissionEnabled ? commissionType : undefined,
      commissionTrigger: commissionEnabled ? commissionTrigger : undefined,
      status
    };
  };

  return (
    <div className="space-y-6 pb-36 md:pb-24">
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold text-slate-900">Section 1 - Basic Info</h2>
          <Input label="Job Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Select
            label="Job Type"
            value={jobType}
            options={JOB_TYPE_OPTIONS}
            onChange={(event) => setJobType(event.target.value as JobType)}
          />
          <Select
            label="Work Mode"
            value={workMode}
            options={WORK_MODE_OPTIONS}
            onChange={(event) => setWorkMode(event.target.value as WorkMode)}
          />
          <Input
            label="Application Deadline"
            type="date"
            value={applicationDeadline}
            onChange={(event) => setApplicationDeadline(event.target.value)}
          />
          <Input label="Location City" value={locationCity} onChange={(event) => setLocationCity(event.target.value)} />
          <Input label="Location State" value={locationState} onChange={(event) => setLocationState(event.target.value)} />
          <Input
            label="Openings"
            type="number"
            min={1}
            value={openings}
            onChange={(event) => setOpenings(Number.parseInt(event.target.value, 10) || 1)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold text-slate-900">Section 2 - Compensation</h2>
          <Input
            label="Salary Min (INR)"
            type="number"
            value={salaryMin}
            onChange={(event) => setSalaryMin(Number.parseInt(event.target.value, 10) || 0)}
          />
          <Input
            label="Salary Max (INR)"
            type="number"
            value={salaryMax}
            onChange={(event) => setSalaryMax(Number.parseInt(event.target.value, 10) || 0)}
          />
          <Input
            label="Experience Min (months)"
            type="number"
            value={experienceMin}
            onChange={(event) => setExperienceMin(Number.parseInt(event.target.value, 10) || 0)}
          />
          <Input
            label="Experience Max (months)"
            type="number"
            value={experienceMax}
            onChange={(event) => setExperienceMax(Number.parseInt(event.target.value, 10) || 0)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Section 3 - Job Description</h2>
          <Textarea
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            helperText="Add expectations, scope, benefits, and team details."
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Skills Required</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={newSkill} onChange={(event) => setNewSkill(event.target.value)} helperText="Add skill" />
              <button
                type="button"
                onClick={() => setSkillMandatory((prev) => !prev)}
                className={`rounded-lg border px-3 text-sm ${
                  skillMandatory ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 text-slate-600"
                }`}
              >
                <Star className={`inline-block h-4 w-4 ${skillMandatory ? "fill-current" : ""}`} /> Mandatory
              </button>
              <Button
                type="button"
                onClick={() => {
                  const normalized = newSkill.trim();
                  if (!normalized) return;
                  if (skillsRequired.some((item) => item.name.toLowerCase() === normalized.toLowerCase())) return;
                  setSkillsRequired((prev) => [...prev, { name: normalized, isMandatory: skillMandatory }]);
                  setNewSkill("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skillsRequired.map((skill) => (
                <button
                  key={skill.name}
                  type="button"
                  onClick={() =>
                    setSkillsRequired((prev) => prev.filter((item) => item.name !== skill.name))
                  }
                  className={`rounded-full px-3 py-1 text-xs ${
                    skill.isMandatory ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {skill.name} {skill.isMandatory ? "★" : ""}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Section 4 - Targeting (Optional)</h2>
          <Input
            label="Target College IDs"
            helperText="Comma separated college profile IDs"
            value={targetCollegeIds}
            onChange={(event) => setTargetCollegeIds(event.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Section 5 - Screening Questions</h2>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setScreeningQuestions((prev) => [
                  ...prev,
                  { question: "", type: "text", isRequired: true }
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {screeningQuestions.map((question, index) => (
            <div key={`question-${index}`} className="rounded-lg border border-slate-200 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_180px_140px_auto]">
                <Input
                  label="Question"
                  value={question.question}
                  onChange={(event) =>
                    setScreeningQuestions((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, question: event.target.value } : item
                      )
                    )
                  }
                />
                <Select
                  label="Type"
                  value={question.type}
                  options={[
                    { label: "Text", value: "text" },
                    { label: "Select", value: "select" },
                    { label: "Yes / No", value: "yes-no" }
                  ]}
                  onChange={(event) =>
                    setScreeningQuestions((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, type: event.target.value as QuestionItem["type"] }
                          : item
                      )
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setScreeningQuestions((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, isRequired: !item.isRequired } : item
                      )
                    )
                  }
                  className={`mt-7 rounded-lg border px-3 py-2 text-sm ${
                    question.isRequired ? "border-accent bg-accent text-white" : "border-slate-300 text-slate-700"
                  }`}
                >
                  Required
                </button>
                <div className="mt-7 flex gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => moveQuestion(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => moveQuestion(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setScreeningQuestions((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Section 6 - Commission (Optional)</h2>
          <button
            type="button"
            onClick={() => setCommissionEnabled((prev) => !prev)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              commissionEnabled ? "border-accent bg-accent text-white" : "border-slate-300 text-slate-700"
            }`}
          >
            {commissionEnabled ? "Commission Enabled" : "Enable Commission"}
          </button>

          {commissionEnabled ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Commission %"
                type="number"
                value={commissionPct}
                onChange={(event) => setCommissionPct(Number.parseInt(event.target.value, 10) || 0)}
              />
              <Select
                label="Commission Type"
                value={commissionType}
                options={[
                  { label: "% of CTC", value: CommissionType.PCT_OF_CTC },
                  { label: "Flat", value: CommissionType.FLAT }
                ]}
                onChange={(event) => setCommissionType(event.target.value as CommissionType)}
              />
              <Select
                label="Commission Trigger"
                value={commissionTrigger}
                options={[
                  { label: "On Offer", value: CommissionTrigger.ON_OFFER },
                  { label: "On Joining", value: CommissionTrigger.ON_JOINING }
                ]}
                onChange={(event) => setCommissionTrigger(event.target.value as CommissionTrigger)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:bottom-0 md:z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-2">
          <Button
            variant="outline"
            disabled={!canSubmit || saving}
            onClick={() => void onSaveDraft(createPayload("DRAFT"))}
          >
            Save as Draft
          </Button>
          <Button disabled={!canSubmit || saving} onClick={() => void onSaveAndSubmit(createPayload("DRAFT"))}>
            Save & Submit for Approval
          </Button>
        </div>
      </div>
    </div>
  );
};
