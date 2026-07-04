"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ServiceRequestStatus, type ServiceRequest } from "@campushire/types";
import { formatCurrency, formatDate, getStatusColor } from "@campushire/utils";
import { ClipboardCheck, Clock3, Star, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Modal,
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
  completeServiceRequest,
  getMyServiceRequests,
  getVendorStats,
  respondToServiceRequest,
  type VendorStats
} from "@/lib/api/vendors.api";
import { asRecord } from "@/lib/utils/dashboard";
import { toast } from "sonner";

interface ActionState {
  requestId: string;
  mode: "reject" | "complete" | null;
}

const incomingStatuses: ServiceRequestStatus[] = [
  ServiceRequestStatus.PENDING,
  ServiceRequestStatus.ACCEPTED,
  ServiceRequestStatus.IN_PROGRESS
];

export default function VendorDashboardPage() {
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({ requestId: "", mode: null });
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, requestData] = await Promise.all([
        getVendorStats(),
        getMyServiceRequests(1, 100)
      ]);
      setStats(statsData);
      setRequests(requestData.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load vendor dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingCount = useMemo(
    () =>
      requests.filter((request) => incomingStatuses.includes(request.status)).length,
    [requests]
  );

  const completedRequests = useMemo(
    () => requests.filter((request) => request.status === ServiceRequestStatus.COMPLETED),
    [requests]
  );

  const incomingRequests = useMemo(
    () => requests.filter((request) => incomingStatuses.includes(request.status)),
    [requests]
  );

  const handleAccept = async (requestId: string): Promise<void> => {
    try {
      await respondToServiceRequest(requestId, "accept");
      toast.success("Request accepted.");
      await loadData();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Unable to accept request.");
    }
  };

  const submitAction = async (): Promise<void> => {
    if (!actionState.mode || !actionState.requestId) return;
    if (!note.trim()) {
      toast.error("Please enter details.");
      return;
    }
    setProcessing(true);
    try {
      if (actionState.mode === "reject") {
        await respondToServiceRequest(actionState.requestId, "reject", note.trim());
        toast.success("Request rejected.");
      } else {
        await completeServiceRequest(actionState.requestId, note.trim());
        toast.success("Request marked completed.");
      }
      setActionState({ requestId: "", mode: null });
      setNote("");
      await loadData();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Unable to update request.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error || !stats) return <ErrorState message={error ?? "Unable to load vendor dashboard."} onRetry={() => void loadData()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Dashboard"
        subtitle="Manage incoming service requests, delivery progress, and ratings."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Requests" value={stats.totalRequests} icon={ClipboardCheck} />
        <StatCard title="Pending" value={pendingCount} icon={Clock3} />
        <StatCard title="Completed" value={stats.completedRequests} icon={ClipboardCheck} />
        <StatCard title="Avg Rating" value={stats.avgRating.toFixed(2)} icon={Star} />
        <StatCard title="Revenue" value={formatCurrency(stats.totalRevenue)} icon={Wallet} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Incoming Requests</h2>
          {incomingRequests.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No incoming requests"
              description="New service requests from recruiters and users will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Deadline</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <p className="font-medium text-slate-900">{request.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{request.description}</p>
                    </TableCell>
                    <TableCell>{request.type.replaceAll("_", " ")}</TableCell>
                    <TableCell>
                      {request.dueDate ? formatDate(new Date(request.dueDate), "dd MMM yyyy") : "--"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>{request.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {request.status === ServiceRequestStatus.PENDING ? (
                          <>
                            <Button size="sm" onClick={() => void handleAccept(request.id)}>
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setActionState({ requestId: request.id, mode: "reject" })}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setActionState({ requestId: request.id, mode: "complete" })}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Completed Requests & Ratings</h2>
          {completedRequests.length === 0 ? (
            <p className="text-sm text-slate-600">No completed requests yet.</p>
          ) : (
            <div className="space-y-3">
              {completedRequests.map((request) => {
                const payload = asRecord(request.payload);
                const rating = typeof payload.vendorRating === "number" ? payload.vendorRating : null;
                const review = typeof payload.vendorReview === "string" ? payload.vendorReview : "";
                return (
                  <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{request.title}</p>
                      <Badge className={getStatusColor(request.status)}>{request.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{request.type.replaceAll("_", " ")}</p>
                    {rating !== null ? (
                      <div className="mt-2 flex items-center gap-2 text-amber-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${index < Math.round(rating) ? "fill-amber-500" : ""}`}
                          />
                        ))}
                        <span className="text-sm text-slate-700">{rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">No rating received yet.</p>
                    )}
                    {review ? <p className="mt-2 text-sm text-slate-700">{review}</p> : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={actionState.mode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionState({ requestId: "", mode: null });
            setNote("");
          }
        }}
        title={actionState.mode === "reject" ? "Reject Service Request" : "Complete Service Request"}
      >
        <div className="space-y-4">
          <Textarea
            label={actionState.mode === "reject" ? "Reason" : "Completion Note"}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActionState({ requestId: "", mode: null })}>
              Cancel
            </Button>
            <Button onClick={() => void submitAction()} disabled={processing}>
              {processing ? "Saving..." : "Submit"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const StatCard = ({
  title,
  value,
  icon: Icon
}: {
  title: string;
  value: string | number;
  icon: typeof ClipboardCheck;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{title}</p>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </CardContent>
  </Card>
);
