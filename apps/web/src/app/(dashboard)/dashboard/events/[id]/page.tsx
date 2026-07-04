"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarClock, MapPin } from "lucide-react";
import { ParticipantStatus, UserRole, type EventParticipant } from "@campushire/types";
import { formatDate } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  cancelEventRegistration,
  getEvent,
  markAttendance,
  registerForEvent,
  type EventDetail
} from "@/lib/api/events.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { ROUTES } from "@/lib/utils/routes";
import { toast } from "sonner";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCollegeAdmin = user?.role === UserRole.COLLEGE_ADMIN;
  const participantMap = useMemo(
    () => new Map(event?.participants.map((participant) => [participant.userId, participant]) ?? []),
    [event?.participants]
  );
  const myParticipation = user ? participantMap.get(user.id) : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const details = await getEvent(id);
      setEvent(details);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load event details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRegister = async (): Promise<void> => {
    try {
      await registerForEvent(id);
      toast.success("Registered for event.");
      await load();
    } catch (registerError) {
      toast.error(registerError instanceof Error ? registerError.message : "Unable to register.");
    }
  };

  const onCancelRegistration = async (): Promise<void> => {
    try {
      await cancelEventRegistration(id);
      toast.success("Registration cancelled.");
      await load();
    } catch (registerError) {
      toast.error(registerError instanceof Error ? registerError.message : "Unable to cancel registration.");
    }
  };

  const onMarkAttendance = async (participant: EventParticipant, attended: boolean): Promise<void> => {
    try {
      await markAttendance(id, participant.userId, attended);
      toast.success("Attendance updated.");
      await load();
    } catch (attendanceError) {
      toast.error(attendanceError instanceof Error ? attendanceError.message : "Unable to update attendance.");
    }
  };

  if (loading) return <LoadingSkeleton variant="profile" count={1} />;
  if (error || !event) return <ErrorState message={error ?? "Unable to load event."} onRetry={() => void load()} />;

  const spotsRemaining =
    event.maxParticipants === null
      ? null
      : Math.max(0, event.maxParticipants - (event.participants?.length ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        subtitle={event.eventType.replaceAll("_", " ")}
        actions={
          <Link href={ROUTES.events.list}>
            <Button variant="outline">Back to Events</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              <Badge>{event.status}</Badge>
              <Badge variant="info">{event.eventType.replaceAll("_", " ")}</Badge>
            </div>
            <p className="text-slate-700">{event.description ?? "No description available."}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <CalendarClock className="h-4 w-4" />
                  {formatDate(new Date(event.startAt), "dd MMM yyyy, hh:mm a")} -{" "}
                  {formatDate(new Date(event.endAt), "hh:mm a")}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="h-4 w-4" />
                  {event.venue || "Online / TBA"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Registration</h2>
            <p className="text-sm text-slate-600">
              {spotsRemaining === null ? "No participant limit." : `${spotsRemaining} spots remaining.`}
            </p>
            {myParticipation ? (
              <Button variant="outline" className="w-full" onClick={() => void onCancelRegistration()}>
                Cancel Registration
              </Button>
            ) : (
              <Button className="w-full" onClick={() => void onRegister()}>
                Register
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {isCollegeAdmin ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Participants</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>User ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Registered At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(event.participants ?? []).map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>{participant.userId}</TableCell>
                    <TableCell>{participant.status}</TableCell>
                    <TableCell>{formatDate(new Date(participant.createdAt), "dd MMM yyyy, hh:mm a")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void onMarkAttendance(participant, true)}
                          disabled={participant.status === ParticipantStatus.ATTENDED}
                        >
                          Mark Present
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void onMarkAttendance(participant, false)}
                          disabled={participant.status === ParticipantStatus.ABSENT}
                        >
                          Mark Absent
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
