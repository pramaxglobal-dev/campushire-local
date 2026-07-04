"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectionStatus, EventType, type CollegeAnalytics, type PlacementEvent } from "@campushire/types";
import { formatDate, getStatusColor } from "@campushire/utils";
import { Copy, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal, Select, Table, TableBody, TableCell, TableHeader, TableRow, Textarea } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { listConnections, respondConnection, type RecruiterConnection } from "@/lib/api/connections.api";
import { createEvent, getMyEvents } from "@/lib/api/events.api";
import { getCollegeAnalytics } from "@/lib/api/analytics.api";
import {
  createInvite,
  deactivateInvite,
  getInviteStats,
  listInvites,
  type InviteStats,
  type InviteWithUsages
} from "@/lib/api/invites.api";
import { toast } from "sonner";

interface EventFormState {
  title: string;
  description: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  venue: string;
}

const EMPTY_INVITE_STATS: InviteStats = {
  totalInvites: 0,
  totalUses: 0,
  activeInvites: 0,
  studentsRegistered: 0
};

const EMPTY_COLLEGE_ANALYTICS: CollegeAnalytics = {
  totalStudents: 0,
  studentsWithProfile: 0,
  studentsApplied: 0,
  studentsHired: 0,
  placementRate: 0,
  topRecruiterConnections: [],
  applicationsByBranch: [],
  avgCareerScore: 0,
  upcomingEvents: 0,
  inviteCodeUsage: []
};

export default function CollegeDashboardPage() {
  const [invites, setInvites] = useState<InviteWithUsages[]>([]);
  const [connections, setConnections] = useState<RecruiterConnection[]>([]);
  const [events, setEvents] = useState<PlacementEvent[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [analytics, setAnalytics] = useState<CollegeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [maxUses, setMaxUses] = useState(50);
  const [expiryDate, setExpiryDate] = useState("");
  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>({
    title: "",
    description: "",
    eventType: EventType.PLACEMENT_DRIVE,
    startAt: "",
    endAt: "",
    venue: ""
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inviteRows, inviteStats, connectionRows, myEvents, analyticsData] =
        await Promise.allSettled([
          listInvites(),
          getInviteStats(),
          listConnections(),
          getMyEvents(),
          getCollegeAnalytics()
        ]);

      const hasAnySuccess = [inviteRows, inviteStats, connectionRows, myEvents, analyticsData].some(
        (result) => result.status === "fulfilled"
      );
      if (!hasAnySuccess) {
        setError("Unable to load college dashboard.");
      }

      setInvites(inviteRows.status === "fulfilled" ? inviteRows.value : []);
      setStats(inviteStats.status === "fulfilled" ? inviteStats.value : EMPTY_INVITE_STATS);
      setConnections(connectionRows.status === "fulfilled" ? connectionRows.value : []);
      setEvents(myEvents.status === "fulfilled" ? myEvents.value : []);
      setAnalytics(
        analyticsData.status === "fulfilled" ? analyticsData.value : EMPTY_COLLEGE_ANALYTICS
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load college dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const approvedConnections = useMemo(
    () => connections.filter((row) => row.status === ConnectionStatus.APPROVED),
    [connections]
  );
  const pendingConnections = useMemo(
    () => connections.filter((row) => row.status === ConnectionStatus.PENDING),
    [connections]
  );
  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.startAt).getTime() >= Date.now()),
    [events]
  );

  const createInviteCode = async () => {
    try {
      await createInvite({
        maxUses,
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined
      });
      toast.success("Invite code generated");
      setInviteOpen(false);
      await loadDashboard();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Unable to create invite.");
    }
  };

  const handleDeactivateInvite = async (id: string) => {
    try {
      await deactivateInvite(id);
      toast.success("Invite deactivated");
      await loadDashboard();
    } catch (deactivateError) {
      toast.error(deactivateError instanceof Error ? deactivateError.message : "Unable to deactivate invite.");
    }
  };

  const respondToConnection = async (id: string, action: "approve" | "reject") => {
    try {
      await respondConnection(id, action);
      toast.success(`Connection ${action === "approve" ? "approved" : "rejected"}`);
      await loadDashboard();
    } catch (responseError) {
      toast.error(responseError instanceof Error ? responseError.message : "Unable to update request.");
    }
  };

  const submitEvent = async () => {
    try {
      await createEvent({
        title: eventForm.title,
        description: eventForm.description || undefined,
        eventType: eventForm.eventType,
        startAt: new Date(eventForm.startAt).toISOString(),
        endAt: new Date(eventForm.endAt).toISOString(),
        venue: eventForm.venue || undefined
      });
      toast.success("Event created");
      setEventOpen(false);
      await loadDashboard();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Unable to create event.");
    }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error || !stats || !analytics) {
    return <ErrorState message={error ?? "Unable to load dashboard."} onRetry={() => void loadDashboard()} />;
  }

  const branchTotal = analytics.applicationsByBranch.reduce((sum, item) => sum + item.count, 0);
  const branchSegments = analytics.applicationsByBranch
    .slice(0, 5)
    .map((item, index) => {
      const palette = ["#1B3A6B", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];
      return {
        ...item,
        color: palette[index] ?? "#94A3B8"
      };
    });
  const pieStops = branchSegments.reduce(
    (acc, segment) => {
      const ratio = branchTotal === 0 ? 0 : (segment.count / branchTotal) * 100;
      const start = acc.position;
      const end = start + ratio;
      acc.position = end;
      acc.stops.push(`${segment.color} ${start}% ${end}%`);
      return acc;
    },
    { position: 0, stops: [] as string[] }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Admin Dashboard"
        subtitle="Manage invites, recruiter connections, and campus placement events."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Students Registered" value={stats.studentsRegistered} />
        <StatCard title="Active Invite Codes" value={stats.activeInvites} />
        <StatCard title="Connected Recruiters" value={approvedConnections.length} />
        <StatCard title="Upcoming Events" value={upcomingEvents.length} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Placement Analytics</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Placement Rate</p>
              <div className="mt-3 flex items-center gap-4">
                <div
                  className="relative h-24 w-24 rounded-full"
                  style={{
                    background: `conic-gradient(#10B981 ${analytics.placementRate}%, #E2E8F0 ${analytics.placementRate}% 100%)`
                  }}
                >
                  <div className="absolute inset-3 flex items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-800">
                    {analytics.placementRate}%
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <p>Hired: {analytics.studentsHired}</p>
                  <p>Applied: {analytics.studentsApplied}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Applications by Branch</p>
              <div className="mt-3 flex items-center gap-4">
                <div
                  className="h-24 w-24 rounded-full"
                  style={{
                    background:
                      pieStops.stops.length > 0
                        ? `conic-gradient(${pieStops.stops.join(", ")})`
                        : "#E2E8F0"
                  }}
                />
                <div className="space-y-1 text-xs text-slate-600">
                  {branchSegments.map((segment) => (
                    <p key={segment.branch} className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                      {segment.branch}: {segment.count}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Top Recruiter Connections</p>
              <div className="mt-3 space-y-2">
                {analytics.topRecruiterConnections.slice(0, 5).map((row) => (
                  <div key={row.company} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-700">{row.company}</span>
                    <span className="font-semibold text-slate-900">{row.hires}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Invite Codes</h2>
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Generate New Code
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Max Uses</TableCell>
                <TableCell>Used</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.code}</TableCell>
                  <TableCell>{invite.maxUses}</TableCell>
                  <TableCell>{invite.usedCount}</TableCell>
                  <TableCell>{invite.expiresAt ? formatDate(new Date(invite.expiresAt)) : "Never"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invite.isActive ? "ACTIVE" : "CANCELLED")}>
                      {invite.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(invite.code);
                          toast.success("Code copied");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {invite.isActive ? (
                        <Button size="sm" variant="destructive" onClick={() => void handleDeactivateInvite(invite.id)}>
                          Deactivate
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Connected Recruiters</h2>
            {approvedConnections.length === 0 ? (
              <p className="text-sm text-slate-600">No approved recruiter connections yet.</p>
            ) : (
              approvedConnections.map((connection) => (
                <div key={connection.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">{connection.recruiterProfile?.companyName ?? "Recruiter"}</p>
                  <p className="text-sm text-slate-600">{connection.recruiterProfile?.industry ?? "Industry not specified"}</p>
                  <p className="text-xs text-slate-500">Connected {formatDate(new Date(connection.createdAt), "dd MMM yyyy")}</p>
                </div>
              ))
            )}

            {pendingConnections.length > 0 ? (
              <div className="space-y-2">
                <h3 className="pt-2 text-sm font-semibold text-slate-900">Pending Requests</h3>
                {pendingConnections.map((connection) => (
                  <div key={connection.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="font-medium text-slate-900">{connection.recruiterProfile?.companyName ?? "Recruiter"}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => void respondToConnection(connection.id, "approve")}>
                        Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void respondToConnection(connection.id, "reject")}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
              <Button size="sm" onClick={() => setEventOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Create Event
              </Button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-600">No upcoming events.</p>
            ) : (
              upcomingEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">{event.title}</p>
                  <p className="text-sm text-slate-600">{event.eventType.replaceAll("_", " ")}</p>
                  <p className="text-xs text-slate-500">{formatDate(new Date(event.startAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Recent Student Activity</h2>
          {invites.flatMap((invite) => invite.usages).length === 0 ? (
            <p className="text-sm text-slate-600">No recent student registrations.</p>
          ) : (
            invites
              .flatMap((invite) => invite.usages)
              .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
              .slice(0, 5)
              .map((usage) => (
                <div key={usage.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">
                    {usage.usedBy.firstName} {usage.usedBy.lastName}
                  </p>
                  <p className="text-sm text-slate-600">{usage.usedBy.role}</p>
                  <p className="text-xs text-slate-500">{formatDate(new Date(usage.usedAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Modal open={inviteOpen} onOpenChange={setInviteOpen} title="Generate Invite Code">
        <div className="space-y-4">
          <Input
            label="Max Uses"
            type="number"
            value={maxUses}
            onChange={(event) => setMaxUses(Number.parseInt(event.target.value, 10) || 50)}
          />
          <Input
            label="Expiry Date (Optional)"
            type="date"
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createInviteCode()}>Generate</Button>
          </div>
        </div>
      </Modal>

      <Modal open={eventOpen} onOpenChange={setEventOpen} title="Create Event">
        <div className="space-y-3">
          <Input
            label="Title"
            value={eventForm.title}
            onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Textarea
            label="Description"
            value={eventForm.description}
            onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <Select
            label="Event Type"
            value={eventForm.eventType}
            options={Object.values(EventType).map((type) => ({
              label: type.replaceAll("_", " "),
              value: type
            }))}
            onChange={(event) => setEventForm((prev) => ({ ...prev, eventType: event.target.value as EventType }))}
          />
          <Input
            label="Start"
            type="datetime-local"
            value={eventForm.startAt}
            onChange={(event) => setEventForm((prev) => ({ ...prev, startAt: event.target.value }))}
          />
          <Input
            label="End"
            type="datetime-local"
            value={eventForm.endAt}
            onChange={(event) => setEventForm((prev) => ({ ...prev, endAt: event.target.value }))}
          />
          <Input
            label="Venue"
            value={eventForm.venue}
            onChange={(event) => setEventForm((prev) => ({ ...prev, venue: event.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEventOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitEvent()}>Create Event</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const StatCard = ({ title, value }: { title: string; value: number }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </CardContent>
  </Card>
);
