"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bookmark, Building2, Copy, MapPin, Share2 } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { formatSalaryRange, getStatusColor, truncateText } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Modal, Textarea } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { applyToJob, getMyApplications, type AppFilters } from "@/lib/api/applications.api";
import { getJob, saveJob, unsaveJob, type JobDetail } from "@/lib/api/jobs.api";
import { ROUTES } from "@/lib/utils/routes";
import { asRecord, toDate, toTimeAgo } from "@/lib/utils/dashboard";
import { toast } from "sonner";

interface ScreeningAnswerMap {
  [key: string]: string;
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "requirements" | "company" | "screening">("description");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [answers, setAnswers] = useState<ScreeningAnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  const jobId = params.id;

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getJob(jobId);
      setJob(detail);
      if (detail.hasApplied) {
        const filters: AppFilters = { page: 1, limit: 100 };
        const result = await getMyApplications(filters);
        const current = result.data?.find((item) => item.jobId === detail.id);
        setApplicationStatus(current?.status ?? null);
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load job details.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  const recruiterProfile = useMemo(() => asRecord(job?.recruiterProfile), [job?.recruiterProfile]);
  const recruiterUser = useMemo(() => asRecord(recruiterProfile.user), [recruiterProfile.user]);
  const deadline = toDate(job?.applicationDeadline);
  const deadlineDaysLeft = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const toggleSave = async () => {
    if (!job) return;
    const nextSaved = !job.hasSaved;
    setJob({ ...job, hasSaved: nextSaved });
    try {
      if (nextSaved) {
        await saveJob(job.id);
        toast.success("Job saved");
      } else {
        await unsaveJob(job.id);
        toast.success("Removed from saved jobs");
      }
    } catch (saveError) {
      setJob({ ...job, hasSaved: !nextSaved });
      toast.error(saveError instanceof Error ? saveError.message : "Unable to update bookmark.");
    }
  };

  const submitApplication = async () => {
    if (!job) return;
    const missingRequired = job.screeningQuestions
      .filter((question) => question.isRequired)
      .filter((question) => !answers[question.question]?.trim());
    if (missingRequired.length > 0) {
      toast.error(`Answer all required screening questions (${missingRequired.length} remaining).`);
      return;
    }
    setSubmitting(true);
    try {
      await applyToJob(job.id, {
        coverNote: coverNote || undefined,
        screeningAnswers: answers
      });
      setApplyOpen(false);
      setConfetti(true);
      toast.success("Application submitted successfully");
      setTimeout(() => {
        setConfetti(false);
        router.push(ROUTES.applications.list);
      }, 1200);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="profile" count={1} />;
  if (error || !job) return <ErrorState message={error ?? "Unable to load job."} onRetry={() => void loadJob()} />;

  return (
    <div className="relative space-y-6">
      {confetti ? (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 32 }).map((_, index) => (
            <span
              key={index}
              className="absolute h-2 w-2 animate-fade-in rounded-full"
              style={{
                left: `${(index * 3) % 100}%`,
                top: `${(index * 7) % 100}%`,
                backgroundColor: index % 2 === 0 ? "#0EA5E9" : "#10B981",
                transform: `translateY(${index * 2}px)`,
                animationDuration: "0.8s"
              }}
            />
          ))}
        </div>
      ) : null}

      <PageHeader
        title={job.title}
        subtitle={`${job.company} • Posted ${toTimeAgo(job.postedAt)}`}
        breadcrumb={<Link href={ROUTES.jobs.list}>Back to Job Feed</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                    {job.logo ? (
                      <img src={job.logo} alt={job.company} className="h-12 w-12 rounded-md object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span>{job.company}</span>
                      <Badge variant="success">Verified</Badge>
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(job.status)}>{job.status.replaceAll("_", " ")}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location || "Flexible"}
                </span>
                <span className="text-slate-300">|</span>
                <span>{job.workMode.replaceAll("_", " ")}</span>
                <span className="text-slate-300">|</span>
                <span>{job.jobType.replaceAll("_", " ")}</span>
                <span className="text-slate-300">|</span>
                <span>{job.salaryRange || (job.minCtc && job.maxCtc ? formatSalaryRange(job.minCtc, job.maxCtc) : "Compensation shared on request")}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                {(["description", "requirements", "company", "screening"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition ${
                      activeTab === tab
                        ? "border-accent bg-accent text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "description" ? (
                <div className="space-y-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.description}</p>
                  {job.skills.length > 0 ? (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-900">Skills Required</p>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill) => (
                          <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "requirements" ? (
                <div className="space-y-3 text-sm text-slate-700">
                  <p>Experience: {job.experienceMinMonths ?? 0} - {job.experienceMaxMonths ?? 0} months</p>
                  <p>Openings: {job.openings}</p>
                  <p>Target colleges: {job.collegeProfileId ? "Restricted to selected colleges" : "Open to all"}</p>
                </div>
              ) : null}

              {activeTab === "company" ? (
                <div className="space-y-3 text-sm text-slate-700">
                  <p>
                    About: {getStringOrFallback(recruiterProfile.about, "Company details are provided during screening.")}
                  </p>
                  <p>Industry: {getStringOrFallback(recruiterProfile.industry, "Not specified")}</p>
                  <p>Size: {getStringOrFallback(recruiterProfile.companySize, "Not specified")}</p>
                  <p>
                    Website:{" "}
                    {typeof recruiterProfile.website === "string" ? (
                      <a href={recruiterProfile.website} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {truncateText(recruiterProfile.website, 40)}
                      </a>
                    ) : (
                      "Not specified"
                    )}
                  </p>
                  <p>
                    Recruiter: {getStringOrFallback(recruiterUser.firstName, "")} {getStringOrFallback(recruiterUser.lastName, "")}
                  </p>
                </div>
              ) : null}

              {activeTab === "screening" ? (
                <div className="space-y-3">
                  {job.screeningQuestions.length === 0 ? (
                    <p className="text-sm text-slate-600">No screening questions for this role.</p>
                  ) : (
                    job.screeningQuestions.map((question, index) => (
                      <div key={`${question.question}-${index}`} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-sm font-medium text-slate-800">{question.question}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Type: {question.type} {question.isRequired ? "• Required" : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs text-slate-500">Compensation</p>
                <p className="text-xl font-bold text-slate-900">
                  {job.salaryRange || (job.minCtc && job.maxCtc ? formatSalaryRange(job.minCtc, job.maxCtc) : "Shared on process")}
                </p>
              </div>

              <div className="space-y-1 text-sm text-slate-700">
                <p>Openings remaining: {job.openings}</p>
                <p>
                  Deadline: {deadline ? deadline.toLocaleDateString("en-IN") : "Open"}
                  {deadlineDaysLeft !== null && deadlineDaysLeft <= 7 ? (
                    <span className="ml-2 font-medium text-rose-600">{Math.max(0, deadlineDaysLeft)} days left</span>
                  ) : null}
                </p>
              </div>

              {job.hasApplied ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Applied successfully{applicationStatus ? ` • ${applicationStatus.replaceAll("_", " ")}` : ""}
                </div>
              ) : (
                <Button className="w-full" onClick={() => setApplyOpen(true)}>
                  Apply Now
                </Button>
              )}

              <Button variant="outline" className="w-full" onClick={() => void toggleSave()}>
                <Bookmark className={`mr-2 h-4 w-4 ${job.hasSaved ? "fill-current" : ""}`} />
                {job.hasSaved ? "Saved" : "Save Job"}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("Job link copied");
                  } catch {
                    toast.error("Unable to copy link.");
                  }
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={applyOpen} onOpenChange={setApplyOpen} title="Submit Application">
        <div className="space-y-4">
          <Textarea
            label="Cover Note (Optional)"
            value={coverNote}
            onChange={(event) => setCoverNote(event.target.value)}
            helperText="Introduce yourself and explain why you are a strong fit."
          />

          {job.screeningQuestions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Screening Questions</p>
              {job.screeningQuestions.map((question, index) => (
                <div key={`${question.question}-${index}`} className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    {question.question} {question.isRequired ? "*" : ""}
                  </label>
                  {question.type === "yes-no" ? (
                    <div className="flex gap-2">
                      {["Yes", "No"].map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [question.question]: choice }))}
                          className={`rounded-lg border px-3 py-1 text-sm ${
                            answers[question.question] === choice
                              ? "border-accent bg-accent text-white"
                              : "border-slate-300 text-slate-700"
                          }`}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  ) : question.type === "select" && Array.isArray(question.options) ? (
                    <select
                      value={answers[question.question] ?? ""}
                      onChange={(event) =>
                        setAnswers((prev) => ({ ...prev, [question.question]: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    >
                      <option value="">Select one</option>
                      {question.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Textarea
                      value={answers[question.question] ?? ""}
                      onChange={(event) =>
                        setAnswers((prev) => ({ ...prev, [question.question]: event.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitApplication()} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="hidden items-center gap-2">
        <Copy />
      </div>
    </div>
  );
}

const getStringOrFallback = (value: unknown, fallback: string): string => {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
};
