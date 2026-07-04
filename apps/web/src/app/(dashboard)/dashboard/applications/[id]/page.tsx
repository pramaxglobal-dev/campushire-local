"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarClock, Download, FileText, MessageSquare } from "lucide-react";
import { ChatContextType, UserRole } from "@campushire/types";
import { formatDate, getStatusColor } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Textarea } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  addCandidateNote,
  addRecruiterNote,
  getApplicationDetail,
  type ApplicationDetail
} from "@/lib/api/applications.api";
import { getOrCreateThread } from "@/lib/api/chat.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { ROUTES } from "@/lib/utils/routes";
import { asRecord } from "@/lib/utils/dashboard";
import { toast } from "sonner";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApplicationDetail(params.id);
      setDetail(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load application detail.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const screeningAnswers = useMemo(() => {
    if (!detail?.screeningAnswers || typeof detail.screeningAnswers !== "object" || Array.isArray(detail.screeningAnswers)) {
      return {};
    }
    return detail.screeningAnswers as Record<string, unknown>;
  }, [detail?.screeningAnswers]);

  const saveNote = async () => {
    if (!detail || !note.trim()) return;
    setSavingNote(true);
    try {
      if (user?.role === UserRole.CORPORATE_RECRUITER) {
        await addRecruiterNote(detail.id, note.trim());
      } else {
        await addCandidateNote(detail.id, note.trim());
      }
      toast.success("Note added");
      setNote("");
      await loadDetail();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="profile" count={1} />;
  if (error || !detail) return <ErrorState message={error ?? "Unable to load application."} onRetry={() => void loadDetail()} />;

  const job = asRecord(detail.job);
  const candidate = asRecord(detail.candidate);
  const recruiterProfile = asRecord(job.recruiterProfile);
  const candidateName = `${typeof candidate.firstName === "string" ? candidate.firstName : ""} ${
    typeof candidate.lastName === "string" ? candidate.lastName : ""
  }`.trim();

  const openChatThread = async (): Promise<void> => {
    if (!user) return;
    const candidateId = typeof candidate.id === "string" ? candidate.id : null;
    const recruiterId =
      typeof recruiterProfile.userId === "string"
        ? recruiterProfile.userId
        : typeof job.createdByUserId === "string"
          ? job.createdByUserId
          : null;

    const otherUserId =
      user.role === UserRole.CORPORATE_RECRUITER ? candidateId : recruiterId;

    if (!otherUserId) {
      toast.error("Unable to identify chat participant for this application.");
      return;
    }

    try {
      const thread = await getOrCreateThread({
        userId: otherUserId,
        contextType: ChatContextType.APPLICATION,
        contextId: detail.id
      });
      router.push(`${ROUTES.chat}?threadId=${thread.id}`);
    } catch (chatError) {
      toast.error(chatError instanceof Error ? chatError.message : "Unable to start chat.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={typeof job.title === "string" ? job.title : "Application Detail"}
        subtitle={candidateName || "Candidate profile"}
        breadcrumb={<Link href={ROUTES.applications.list}>Back to Applications</Link>}
        actions={(
          <Button variant="outline" onClick={() => void openChatThread()}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Message
          </Button>
        )}
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-slate-500">Current Status</p>
            <Badge className={getStatusColor(detail.status)}>{detail.status.replaceAll("_", " ")}</Badge>
            <p className="mt-2 text-sm text-slate-600">
              This stage reflects the latest decision in your hiring pipeline.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Applied on {formatDate(new Date(detail.appliedAt))}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Status History Timeline</h2>
          {detail.statusHistory.length === 0 ? (
            <p className="text-sm text-slate-600">No history entries found.</p>
          ) : (
            <div className="space-y-3">
              {detail.statusHistory.map((entry, index) => {
                const row = asRecord(entry);
                return (
                  <div key={`${row.id ?? index}`} className="relative rounded-lg border border-slate-200 p-4">
                    <div className="mb-1 text-sm font-medium text-slate-900">
                      {(typeof row.fromStatus === "string" ? row.fromStatus : "START").replaceAll("_", " ")} to{" "}
                      {(typeof row.toStatus === "string" ? row.toStatus : "UNKNOWN").replaceAll("_", " ")}
                    </div>
                    <p className="text-xs text-slate-500">
                      Changed by {typeof row.changedByUserId === "string" ? row.changedByUserId : "system"} on{" "}
                      {row.createdAt ? formatDate(new Date(String(row.createdAt)), "dd MMM yyyy, hh:mm a") : "N/A"}
                    </p>
                    {typeof row.note === "string" && row.note.trim().length > 0 ? (
                      <p className="mt-2 text-sm text-slate-700">{row.note}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Interview Slots</h2>
          {detail.interviewSlots.length === 0 ? (
            <p className="text-sm text-slate-600">No interview slots scheduled yet.</p>
          ) : (
            <div className="space-y-3">
              {detail.interviewSlots.map((slot) => (
                <div key={slot.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{slot.round}</Badge>
                    <Badge variant="info">{slot.mode.replaceAll("_", " ")}</Badge>
                    <Badge className={getStatusColor(slot.status)}>{slot.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600">
                    <CalendarClock className="h-4 w-4" />
                    {formatDate(new Date(slot.scheduledStartAt), "dd MMM yyyy, hh:mm a")} -{" "}
                    {formatDate(new Date(slot.scheduledEndAt), "hh:mm a")}
                  </p>
                  {slot.meetingLink ? (
                    <a className="mt-2 inline-block text-sm text-accent hover:underline" href={slot.meetingLink} target="_blank" rel="noreferrer">
                      Join meeting link
                    </a>
                  ) : null}
                  {slot.location ? <p className="mt-1 text-sm text-slate-600">Venue: {slot.location}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {detail.resumeSnapshotUrl ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Resume Snapshot</h2>
              <p className="text-sm text-slate-600">Download the submitted resume snapshot.</p>
            </div>
            <a href={detail.resumeSnapshotUrl} target="_blank" rel="noreferrer">
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MessageSquare className="h-5 w-5" />
            Candidate Notes
          </h2>

          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            helperText="Add a note to this application"
          />

          <div className="flex justify-end">
            <Button onClick={() => void saveNote()} disabled={savingNote || note.trim().length === 0}>
              {savingNote ? "Saving..." : "Add Note"}
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 p-4">
            {typeof screeningAnswers.candidateNote === "string" ? (
              <p className="text-sm text-slate-700">
                <span className="font-medium">Candidate note:</span> {screeningAnswers.candidateNote}
              </p>
            ) : null}
            {typeof screeningAnswers.recruiterNote === "string" ? (
              <p className="text-sm text-slate-700">
                <span className="font-medium">Recruiter note:</span> {screeningAnswers.recruiterNote}
              </p>
            ) : null}
            {typeof screeningAnswers.candidateNote !== "string" &&
            typeof screeningAnswers.recruiterNote !== "string" ? (
              <p className="inline-flex items-center gap-1 text-sm text-slate-500">
                <FileText className="h-4 w-4" />
                No notes added yet.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
