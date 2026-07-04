"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, ExternalLink } from "lucide-react";
import { InterviewOutcome, UserRole, type InterviewSlot } from "@campushire/types";
import { formatDate, getStatusColor } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Modal, Textarea } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  confirmInterview,
  getInterviews,
  recordOutcome
} from "@/lib/api/interviews.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { asRecord, toDate } from "@/lib/utils/dashboard";
import { toast } from "sonner";

type InterviewTab = "UPCOMING" | "TODAY" | "PAST" | "ALL";

export default function InterviewsPage() {
  const user = useAuthStore((state) => state.user);

  const [tab, setTab] = useState<InterviewTab>("UPCOMING");
  const [interviews, setInterviews] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewSlot | null>(null);
  const [outcome, setOutcome] = useState<InterviewOutcome>(InterviewOutcome.PASSED);
  const [outcomeNote, setOutcomeNote] = useState("");

  const isRecruiter = user?.role === UserRole.CORPORATE_RECRUITER;

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInterviews();
      setInterviews(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load interviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInterviews();
  }, [loadInterviews]);

  const filtered = useMemo(() => {
    const now = new Date();
    return interviews.filter((slot) => {
      const start = toDate(slot.scheduledStartAt);
      if (!start) return tab === "ALL";
      if (tab === "ALL") return true;
      if (tab === "TODAY") return start.toDateString() === now.toDateString();
      if (tab === "PAST") return start.getTime() < now.getTime();
      return start.getTime() >= now.getTime();
    });
  }, [interviews, tab]);

  const confirmAttendance = async (slot: InterviewSlot) => {
    try {
      await confirmInterview(slot.id);
      toast.success("Interview attendance confirmed");
      await loadInterviews();
    } catch (confirmError) {
      toast.error(confirmError instanceof Error ? confirmError.message : "Unable to confirm attendance.");
    }
  };

  const submitOutcome = async () => {
    if (!selectedInterview) return;
    try {
      await recordOutcome(selectedInterview.id, outcome, outcomeNote || undefined);
      toast.success("Interview outcome recorded");
      setOutcomeOpen(false);
      setOutcomeNote("");
      await loadInterviews();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Unable to save outcome.");
    }
  };

  if (loading) return <LoadingSkeleton variant="list" count={6} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadInterviews()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        subtitle={isRecruiter ? "Track scheduled interviews and outcomes." : "Prepare and confirm upcoming interviews."}
      />

      <div className="flex flex-wrap gap-2">
        {(["UPCOMING", "TODAY", "PAST", "ALL"] as InterviewTab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              tab === value ? "border-accent bg-accent text-white" : "border-slate-300 text-slate-700"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No interviews" description="Interview schedules will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((slot) => {
            const application = asRecord((slot as unknown as Record<string, unknown>).application);
            const job = asRecord(application.job);
            const company = asRecord(job.recruiterProfile);
            const start = toDate(slot.scheduledStartAt);
            const countdownHours = start ? Math.floor((start.getTime() - Date.now()) / 3_600_000) : null;

            return (
              <Card key={slot.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {typeof job.title === "string" ? job.title : `Interview ${slot.round}`}
                      </p>
                      <p className="text-sm text-slate-600">
                        {typeof company.companyName === "string" ? company.companyName : "CampusHire Partner"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{slot.round}</Badge>
                      <Badge variant="info">{slot.mode.replaceAll("_", " ")}</Badge>
                      <Badge className={getStatusColor(slot.status)}>{slot.status.replaceAll("_", " ")}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {start ? formatDate(start, "dd MMM yyyy, hh:mm a") : "Schedule unavailable"}
                    </span>
                    {countdownHours !== null && countdownHours > 0 && countdownHours <= 24 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
                        Interview in {countdownHours} hour{countdownHours > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {slot.meetingLink ? (
                      <a href={slot.meetingLink} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="mr-1 h-4 w-4" />
                          Meeting Link
                        </Button>
                      </a>
                    ) : null}

                    {!isRecruiter && !slot.candidateConfirmed ? (
                      <Button size="sm" onClick={() => void confirmAttendance(slot)}>
                        Confirm Attendance
                      </Button>
                    ) : null}

                    {isRecruiter && start && start.getTime() < Date.now() ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedInterview(slot);
                          setOutcomeOpen(true);
                        }}
                      >
                        Record Outcome
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={outcomeOpen} onOpenChange={setOutcomeOpen} title="Record Interview Outcome">
        <div className="space-y-4">
          <div className="flex gap-2">
            {([InterviewOutcome.PASSED, InterviewOutcome.FAILED, InterviewOutcome.ON_HOLD] as InterviewOutcome[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setOutcome(item)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  outcome === item ? "border-accent bg-accent text-white" : "border-slate-300 text-slate-700"
                }`}
              >
                {item.replaceAll("_", " ")}
              </button>
            ))}
          </div>

          <Textarea
            label="Notes"
            value={outcomeNote}
            onChange={(event) => setOutcomeNote(event.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOutcomeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitOutcome()}>Save Outcome</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
