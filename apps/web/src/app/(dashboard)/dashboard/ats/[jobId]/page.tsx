"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChatContextType,
  ApplicationStatus,
  InterviewMode,
  InterviewRound
} from "@campushire/types";
import { formatDate, getStatusColor } from "@campushire/utils";
import { ArrowRight, Download, UserRound, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal, Select, Textarea } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  bulkMoveApplications,
  downloadResume,
  getApplicationsForJob,
  getKanbanBoard,
  moveApplication,
  rejectApplication,
  type ATSApplicationDetail,
  type ATSCandidateCard,
  type KanbanBoard
} from "@/lib/api/ats.api";
import { getOrCreateThread } from "@/lib/api/chat.api";
import { addRecruiterNote } from "@/lib/api/applications.api";
import { getJob } from "@/lib/api/jobs.api";
import { scheduleInterview } from "@/lib/api/interviews.api";
import { ROUTES } from "@/lib/utils/routes";
import { toast } from "sonner";

const STAGE_ORDER: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW_R1,
  ApplicationStatus.INTERVIEW_R2,
  ApplicationStatus.INTERVIEW_R3,
  ApplicationStatus.OFFERED,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.HIRED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.ON_HOLD
];

const ALWAYS_VISIBLE = new Set<ApplicationStatus>([
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW_R1,
  ApplicationStatus.INTERVIEW_R2
]);

interface ScheduleState {
  applicationId: string;
  round: InterviewRound;
  interviewDate: string;
  startTime: string;
  endTime: string;
  mode: InterviewMode;
  meetingLink: string;
  venue: string;
}

const createEmptyBoard = (): KanbanBoard => ({
  APPLIED: [],
  SCREENING: [],
  SHORTLISTED: [],
  INTERVIEW_R1: [],
  INTERVIEW_R2: [],
  INTERVIEW_R3: [],
  OFFERED: [],
  ACCEPTED: [],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
  ON_HOLD: []
});

export default function ATSKanbanPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const jobId = params.jobId;

  const [jobTitle, setJobTitle] = useState("ATS Board");
  const [board, setBoard] = useState<KanbanBoard>(createEmptyBoard());
  const [detailMap, setDetailMap] = useState<Record<string, ATSApplicationDetail>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>(ApplicationStatus.SCREENING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleState, setScheduleState] = useState<ScheduleState>({
    applicationId: "",
    round: InterviewRound.R1,
    interviewDate: "",
    startTime: "",
    endTime: "",
    mode: InterviewMode.VIDEO,
    meetingLink: "",
    venue: ""
  });
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [job, boardData, details] = await Promise.all([
        getJob(jobId),
        getKanbanBoard(jobId),
        getApplicationsForJob(jobId, { page: 1, limit: 100 })
      ]);

      setJobTitle(job.title);
      setBoard(boardData);
      const mapped = (details.data ?? []).reduce<Record<string, ATSApplicationDetail>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
      setDetailMap(mapped);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load ATS board.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleColumns = useMemo(() => {
    return STAGE_ORDER.filter((stage) => ALWAYS_VISIBLE.has(stage) || board[stage].length > 0);
  }, [board]);

  const selectedCard = useMemo(() => {
    if (!selectedId) return null;
    for (const stage of STAGE_ORDER) {
      const card = board[stage].find((item) => item.id === selectedId);
      if (card) return card;
    }
    return null;
  }, [board, selectedId]);

  const selectedDetail = selectedId ? detailMap[selectedId] : null;

  const counts = useMemo(() => {
    const total = Object.values(board).reduce((sum, list) => sum + list.length, 0);
    return {
      total,
      shortlisted: board.SHORTLISTED.length,
      interviewed: board.INTERVIEW_R1.length + board.INTERVIEW_R2.length + board.INTERVIEW_R3.length,
      offered: board.OFFERED.length,
      hired: board.HIRED.length
    };
  }, [board]);

  const refresh = async () => {
    await loadData();
    setSelectedIds([]);
  };

  const handleMove = async (applicationId: string, toStatus: ApplicationStatus, message?: string) => {
    try {
      await moveApplication(applicationId, { toStatus, note: message });
      toast.success("Application moved");
      await refresh();
    } catch (moveError) {
      toast.error(moveError instanceof Error ? moveError.message : "Unable to move application.");
    }
  };

  const handleBulkMove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkMoveApplications(selectedIds, bulkStatus);
      toast.success("Bulk status update successful");
      await refresh();
    } catch (bulkError) {
      toast.error(bulkError instanceof Error ? bulkError.message : "Bulk move failed.");
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide rejection reason.");
      return;
    }
    try {
      await rejectApplication(applicationId, rejectReason.trim());
      toast.success("Application rejected");
      setRejectReason("");
      await refresh();
    } catch (rejectError) {
      toast.error(rejectError instanceof Error ? rejectError.message : "Unable to reject application.");
    }
  };

  const handleSchedule = async () => {
    try {
      await scheduleInterview({
        applicationId: scheduleState.applicationId,
        round: scheduleState.round,
        interviewDate: scheduleState.interviewDate,
        startTime: scheduleState.startTime,
        endTime: scheduleState.endTime,
        mode: scheduleState.mode,
        meetingLink: scheduleState.mode === InterviewMode.VIDEO ? scheduleState.meetingLink || undefined : undefined,
        venue: scheduleState.mode === InterviewMode.IN_PERSON ? scheduleState.venue || undefined : undefined
      });
      toast.success("Interview scheduled");
      setScheduleOpen(false);
      await refresh();
    } catch (scheduleError) {
      toast.error(scheduleError instanceof Error ? scheduleError.message : "Unable to schedule interview.");
    }
  };

  const handleDownloadResume = async (applicationId: string) => {
    try {
      const { url } = await downloadResume(applicationId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : "Resume not available.");
    }
  };

  const handleOpenChat = async (): Promise<void> => {
    if (!selectedCard || !selectedDetail) return;
    const candidate = selectedDetail.candidate;
    const candidateId =
      candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? (candidate as Record<string, unknown>).id
        : null;
    if (typeof candidateId !== "string") {
      toast.error("Candidate details unavailable for chat.");
      return;
    }

    try {
      const thread = await getOrCreateThread({
        userId: candidateId,
        contextType: ChatContextType.APPLICATION,
        contextId: selectedCard.id
      });
      router.push(`${ROUTES.chat}?threadId=${thread.id}`);
    } catch (chatError) {
      toast.error(chatError instanceof Error ? chatError.message : "Unable to start chat.");
    }
  };

  const saveRecruiterNote = async (applicationId: string) => {
    if (!note.trim()) return;
    try {
      await addRecruiterNote(applicationId, note.trim());
      toast.success("Recruiter note added");
      setNote("");
      await refresh();
    } catch (noteError) {
      toast.error(noteError instanceof Error ? noteError.message : "Unable to add note.");
    }
  };

  if (loading) return <LoadingSkeleton variant="card" count={8} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadData()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={jobTitle}
        subtitle="ATS Kanban board"
        breadcrumb={<Link href={ROUTES.ats.root}>Back to ATS</Link>}
      />

      <div className="grid gap-2 sm:grid-cols-5">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Shortlisted" value={counts.shortlisted} />
        <StatCard label="Interviewed" value={counts.interviewed} />
        <StatCard label="Offered" value={counts.offered} />
        <StatCard label="Hired" value={counts.hired} />
      </div>

      {selectedIds.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">{selectedIds.length} candidates selected</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={bulkStatus}
                options={STAGE_ORDER.map((stage) => ({ label: stage.replaceAll("_", " "), value: stage }))}
                onChange={(event) => setBulkStatus(event.target.value as ApplicationStatus)}
              />
              <Button onClick={() => void handleBulkMove()}>Bulk Move</Button>
              <Button variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[1100px] gap-4">
          {visibleColumns.map((stage) => (
            <div key={stage} className="w-72 shrink-0 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <p className="text-sm font-semibold text-slate-900">{stage.replaceAll("_", " ")}</p>
                </div>
                <Badge variant="info">{board[stage].length}</Badge>
              </div>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
                {board[stage].map((card) => (
                  <CandidateCard
                    key={card.id}
                    card={card}
                    selected={selectedId === card.id}
                    bulkSelected={selectedIds.includes(card.id)}
                    onToggleBulk={() =>
                      setSelectedIds((prev) =>
                        prev.includes(card.id) ? prev.filter((id) => id !== card.id) : [...prev, card.id]
                      )
                    }
                    onClick={() => setSelectedId(card.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCard && selectedDetail ? (
        <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Candidate Detail</h2>
            <button type="button" onClick={() => setSelectedId(null)}>
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">{selectedCard.candidateName}</p>
              <p className="text-sm text-slate-600">TIN: {selectedCard.tin}</p>
              <p className="text-sm text-slate-600">{selectedCard.college ?? "College not provided"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(selectedCard.status)}>{selectedCard.status.replaceAll("_", " ")}</Badge>
              <Badge variant="info">{selectedCard.matchScore}% Match</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Move to stage</p>
              <div className="grid gap-2">
                {STAGE_ORDER.filter((stage) => stage !== selectedCard.status).slice(0, 4).map((stage) => (
                  <Button
                    key={stage}
                    variant="outline"
                    size="sm"
                    onClick={() => void handleMove(selectedCard.id, stage)}
                  >
                    {stage.replaceAll("_", " ")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Button variant="outline" onClick={() => void handleOpenChat()}>
                Message Candidate
              </Button>
              <Button
                onClick={() => {
                  setScheduleState((prev) => ({ ...prev, applicationId: selectedCard.id }));
                  setScheduleOpen(true);
                }}
              >
                Schedule Interview
              </Button>
              <Button variant="outline" onClick={() => void handleDownloadResume(selectedCard.id)}>
                <Download className="mr-2 h-4 w-4" />
                Download Resume
              </Button>
            </div>

            <div className="space-y-2">
              <Textarea
                label="Recruiter Note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <Button variant="outline" onClick={() => void saveRecruiterNote(selectedCard.id)}>
                Save Note
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border border-rose-200 p-3">
              <Textarea
                label="Reject Reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
              <Button variant="destructive" onClick={() => void handleReject(selectedCard.id)}>
                Reject Candidate
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Interview Slots</p>
              {selectedDetail.interviewSlots.length === 0 ? (
                <p className="text-sm text-slate-500">No interviews scheduled.</p>
              ) : (
                selectedDetail.interviewSlots.map((slot) => (
                  <div key={String((slot as Record<string, unknown>).id)} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">
                      {String((slot as Record<string, unknown>).round ?? "Interview")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(new Date(String((slot as Record<string, unknown>).scheduledStartAt)), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      ) : null}

      <Modal open={scheduleOpen} onOpenChange={setScheduleOpen} title="Schedule Interview">
        <div className="space-y-3">
          <Select
            label="Round"
            value={scheduleState.round}
            options={[
              { label: "R1", value: InterviewRound.R1 },
              { label: "R2", value: InterviewRound.R2 },
              { label: "R3", value: InterviewRound.R3 },
              { label: "Final", value: InterviewRound.FINAL },
              { label: "HR", value: InterviewRound.HR }
            ]}
            onChange={(event) =>
              setScheduleState((prev) => ({ ...prev, round: event.target.value as InterviewRound }))
            }
          />

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Date"
              type="date"
              value={scheduleState.interviewDate}
              onChange={(event) =>
                setScheduleState((prev) => ({ ...prev, interviewDate: event.target.value }))
              }
            />
            <Input
              label="Start"
              type="time"
              value={scheduleState.startTime}
              onChange={(event) =>
                setScheduleState((prev) => ({ ...prev, startTime: event.target.value }))
              }
            />
            <Input
              label="End"
              type="time"
              value={scheduleState.endTime}
              onChange={(event) =>
                setScheduleState((prev) => ({ ...prev, endTime: event.target.value }))
              }
            />
          </div>

          <Select
            label="Mode"
            value={scheduleState.mode}
            options={[
              { label: "Video", value: InterviewMode.VIDEO },
              { label: "Phone", value: InterviewMode.PHONE },
              { label: "In Person", value: InterviewMode.IN_PERSON }
            ]}
            onChange={(event) =>
              setScheduleState((prev) => ({ ...prev, mode: event.target.value as InterviewMode }))
            }
          />

          {scheduleState.mode === InterviewMode.VIDEO ? (
            <Input
              label="Meeting Link"
              value={scheduleState.meetingLink}
              onChange={(event) => setScheduleState((prev) => ({ ...prev, meetingLink: event.target.value }))}
            />
          ) : (
            <Input
              label="Venue"
              value={scheduleState.venue}
              onChange={(event) => setScheduleState((prev) => ({ ...prev, venue: event.target.value }))}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSchedule()}>Schedule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const CandidateCard = ({
  card,
  selected,
  bulkSelected,
  onToggleBulk,
  onClick
}: {
  card: ATSCandidateCard;
  selected: boolean;
  bulkSelected: boolean;
  onToggleBulk: () => void;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      className={`w-full rounded-lg border p-3 text-left transition ${
        selected ? "border-accent bg-accent-50" : "border-slate-200 bg-white hover:shadow-card"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={bulkSelected}
            onChange={(event) => {
              event.stopPropagation();
              onToggleBulk();
            }}
          />
          <div className="rounded-full bg-slate-100 p-2">
            <UserRound className="h-4 w-4 text-slate-700" />
          </div>
        </div>
        <Badge variant="info">{card.matchScore}%</Badge>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{card.candidateName}</p>
      <p className="text-xs text-slate-600">{card.tin}</p>
      <p className="text-xs text-slate-600">{card.college ?? "College unavailable"}</p>
      <p className="mt-2 text-xs text-slate-500">Applied {formatDate(new Date(card.appliedAt), "dd MMM")}</p>
      {card.skills.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.skills.slice(0, 3).map((skill) => (
            <span key={skill} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
              {skill}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </CardContent>
  </Card>
);
