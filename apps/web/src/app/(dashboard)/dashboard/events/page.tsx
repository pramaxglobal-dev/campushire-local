"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import { EventType, UserRole, type PlacementEvent } from "@campushire/types";
import { formatDate } from "@campushire/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  Textarea
} from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  cancelEvent,
  createEvent,
  getMyEvents,
  listEvents,
  registerForEvent,
  type CreateEventDto,
  type EventFilters
} from "@/lib/api/events.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { ROUTES } from "@/lib/utils/routes";
import { toast } from "sonner";

interface EventFormState {
  title: string;
  description: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  venue: string;
  maxParticipants: string;
  isOpenToAll: boolean;
}

const initialForm: EventFormState = {
  title: "",
  description: "",
  eventType: EventType.PLACEMENT_DRIVE,
  startAt: "",
  endAt: "",
  venue: "",
  maxParticipants: "",
  isOpenToAll: false
};

export default function EventsPage() {
  const user = useAuthStore((state) => state.user);
  const [events, setEvents] = useState<PlacementEvent[]>([]);
  const [myEvents, setMyEvents] = useState<PlacementEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(initialForm);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const isCollegeAdmin = user?.role === UserRole.COLLEGE_ADMIN;
  const registeredEventIds = useMemo(
    () => new Set(myEvents.map((event) => event.id)),
    [myEvents]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: EventFilters = {
        page: 1,
        limit: 50,
        eventType: eventTypeFilter ? (eventTypeFilter as EventType) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      };
      const [eventRows, myRows] = await Promise.all([listEvents(filters), getMyEvents()]);
      setEvents(eventRows.data ?? []);
      setMyEvents(myRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load events.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, eventTypeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async (): Promise<void> => {
    if (!form.title || !form.startAt || !form.endAt) {
      toast.error("Title, start date and end date are required.");
      return;
    }

    const payload: CreateEventDto = {
      title: form.title,
      description: form.description || undefined,
      eventType: form.eventType,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      venue: form.venue || undefined,
      maxParticipants: form.maxParticipants ? Number.parseInt(form.maxParticipants, 10) : undefined,
      isOpenToAll: form.isOpenToAll
    };

    try {
      await createEvent(payload);
      toast.success("Event created.");
      setCreateOpen(false);
      setForm(initialForm);
      await load();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Unable to create event.");
    }
  };

  const onRegister = async (eventId: string): Promise<void> => {
    try {
      await registerForEvent(eventId);
      toast.success("Registered successfully.");
      await load();
    } catch (registerError) {
      toast.error(registerError instanceof Error ? registerError.message : "Unable to register.");
    }
  };

  const onCancelEvent = async (eventId: string): Promise<void> => {
    try {
      await cancelEvent(eventId);
      toast.success("Event cancelled.");
      await load();
    } catch (cancelError) {
      toast.error(cancelError instanceof Error ? cancelError.message : "Unable to cancel event.");
    }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Events"
        subtitle="Discover, manage, and register for campus events."
        actions={
          isCollegeAdmin ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Select
            label="Event Type"
            value={eventTypeFilter}
            options={[
              { label: "All", value: "" },
              ...Object.values(EventType).map((type) => ({
                label: type.replaceAll("_", " "),
                value: type
              }))
            ]}
            onChange={(event) => setEventTypeFilter(event.target.value)}
          />
          <Input label="From Date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input label="To Date" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <div className="flex items-end gap-2">
            <Button className="w-full" onClick={() => void load()}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {isCollegeAdmin ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-semibold text-slate-900">My Events</h2>
            {myEvents.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No events created yet" description="Create your first placement event." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.title}</TableCell>
                      <TableCell>{event.eventType.replaceAll("_", " ")}</TableCell>
                      <TableCell>{formatDate(new Date(event.startAt), "dd MMM yyyy, hh:mm a")}</TableCell>
                      <TableCell>
                        <Badge>{event.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={ROUTES.events.detail(event.id)}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          {event.status !== "CANCELLED" ? (
                            <Button size="sm" variant="destructive" onClick={() => void onCancelEvent(event.id)}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState icon={CalendarClock} title="No events found" description="Try adjusting your filters." />
          </div>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <Badge>{event.eventType.replaceAll("_", " ")}</Badge>
                  {registeredEventIds.has(event.id) ? (
                    <Badge variant="success">Registered</Badge>
                  ) : null}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{event.title}</h3>
                <p className="text-sm text-slate-600">
                  {formatDate(new Date(event.startAt), "dd MMM yyyy, hh:mm a")}
                </p>
                <p className="text-sm text-slate-600">{event.venue || "Online / TBA"}</p>
                <div className="flex items-center gap-2">
                  <Link href={ROUTES.events.detail(event.id)}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  {!isCollegeAdmin && !registeredEventIds.has(event.id) ? (
                    <Button size="sm" onClick={() => void onRegister(event.id)}>
                      Register
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create Event">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <Select
            label="Event Type"
            value={form.eventType}
            options={Object.values(EventType).map((type) => ({ label: type.replaceAll("_", " "), value: type }))}
            onChange={(event) => setForm((prev) => ({ ...prev, eventType: event.target.value as EventType }))}
          />
          <Input label="Start" type="datetime-local" value={form.startAt} onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))} />
          <Input label="End" type="datetime-local" value={form.endAt} onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))} />
          <Input label="Venue / Meeting Link" value={form.venue} onChange={(event) => setForm((prev) => ({ ...prev, venue: event.target.value }))} />
          <Input
            label="Max Participants (optional)"
            type="number"
            value={form.maxParticipants}
            onChange={(event) => setForm((prev) => ({ ...prev, maxParticipants: event.target.value }))}
          />
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <p className="text-sm text-slate-700">Open to all students</p>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold ${form.isOpenToAll ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
              onClick={() => setForm((prev) => ({ ...prev, isOpenToAll: !prev.isOpenToAll }))}
            >
              {form.isOpenToAll ? "Yes" : "No"}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreate()}>Create Event</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
