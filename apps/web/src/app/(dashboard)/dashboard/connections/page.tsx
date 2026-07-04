"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Link2, Send } from "lucide-react";
import { ConnectionStatus, UserRole } from "@campushire/types";
import { formatDate } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Input, Modal, Table, TableBody, TableCell, TableHeader, TableRow, Textarea } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  browseColleges,
  disconnectConnection,
  listConnections,
  requestConnection,
  respondConnection,
  type BrowseCollegeItem,
  type RecruiterConnection
} from "@/lib/api/connections.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { toast } from "sonner";

type RecruiterTab = "connected" | "pending" | "browse";
type CollegeTab = "connected" | "pending" | "sent";

export default function ConnectionsPage() {
  const user = useAuthStore((state) => state.user);
  const [connections, setConnections] = useState<RecruiterConnection[]>([]);
  const [colleges, setColleges] = useState<BrowseCollegeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [recruiterTab, setRecruiterTab] = useState<RecruiterTab>("connected");
  const [collegeTab, setCollegeTab] = useState<CollegeTab>("connected");
  const [requestModal, setRequestModal] = useState<{ open: boolean; collegeId: string; message: string }>({
    open: false,
    collegeId: "",
    message: ""
  });

  const isRecruiter = user?.role === UserRole.CORPORATE_RECRUITER;
  const isCollegeAdmin = user?.role === UserRole.COLLEGE_ADMIN;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const connectionRows = await listConnections();
      setConnections(connectionRows);
      if (isRecruiter) {
        const browse = await browseColleges({ page: 1, limit: 30, search: search || undefined });
        setColleges(browse.data ?? []);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load connections.");
    } finally {
      setLoading(false);
    }
  }, [isRecruiter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSendRequest = async (): Promise<void> => {
    if (!requestModal.collegeId || !requestModal.message.trim()) {
      toast.error("Please add a short message before sending request.");
      return;
    }

    try {
      await requestConnection({
        collegeId: requestModal.collegeId,
        message: requestModal.message
      });
      toast.success("Connection request sent.");
      setRequestModal({ open: false, collegeId: "", message: "" });
      await load();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Unable to send request.");
    }
  };

  const onRespond = async (id: string, action: "approve" | "reject"): Promise<void> => {
    try {
      await respondConnection(id, action);
      toast.success(action === "approve" ? "Connection approved." : "Connection rejected.");
      await load();
    } catch (responseError) {
      toast.error(responseError instanceof Error ? responseError.message : "Unable to update request.");
    }
  };

  const onDisconnect = async (id: string): Promise<void> => {
    try {
      await disconnectConnection(id);
      toast.success("Connection disconnected.");
      await load();
    } catch (disconnectError) {
      toast.error(disconnectError instanceof Error ? disconnectError.message : "Unable to disconnect.");
    }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  if (!isRecruiter && !isCollegeAdmin) {
    return <ErrorState message="Connections are available for recruiter and college admin roles only." />;
  }

  const connected = connections.filter((row) => row.status === ConnectionStatus.APPROVED);
  const pending = connections.filter((row) => row.status === ConnectionStatus.PENDING);
  const sent = connections.filter((row) => row.status === ConnectionStatus.REJECTED);

  return (
    <div className="space-y-6">
      <PageHeader title="Connections" subtitle="Manage college-recruiter relationships and collaboration requests." />

      {isRecruiter ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Connected", value: "connected" as RecruiterTab },
              { label: "Pending", value: "pending" as RecruiterTab },
              { label: "Browse Colleges", value: "browse" as RecruiterTab }
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  recruiterTab === tab.value
                    ? "border-accent bg-accent text-white"
                    : "border-slate-300 text-slate-700"
                }`}
                onClick={() => setRecruiterTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {recruiterTab !== "browse" ? (
            <Card>
              <CardContent className="space-y-3 p-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>College</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Requested On</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(recruiterTab === "connected" ? connected : pending).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.collegeProfile?.name ?? "College"}</TableCell>
                        <TableCell>
                          <Badge>{row.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(new Date(row.createdAt), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" onClick={() => void onDisconnect(row.id)}>
                            Disconnect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <Input
                    label="Search colleges"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </CardContent>
              </Card>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {colleges.length === 0 ? (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState icon={Building2} title="No colleges found" description="Try another search term." />
                  </div>
                ) : (
                  colleges.map((college) => (
                    <Card key={college.id}>
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900">{college.name}</h3>
                          <Badge>{college.connectionStatus ?? "NOT_CONNECTED"}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {college.city ?? "City N/A"}, {college.state ?? "State N/A"}
                        </p>
                        <Button
                          className="w-full"
                          disabled={college.connectionStatus === ConnectionStatus.PENDING || college.connectionStatus === ConnectionStatus.APPROVED}
                          onClick={() =>
                            setRequestModal({ open: true, collegeId: college.id, message: "We would like to collaborate for campus hiring opportunities." })
                          }
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Connect
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {isCollegeAdmin ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Connected", value: "connected" as CollegeTab },
              { label: "Pending Requests", value: "pending" as CollegeTab },
              { label: "Sent", value: "sent" as CollegeTab }
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  collegeTab === tab.value
                    ? "border-accent bg-accent text-white"
                    : "border-slate-300 text-slate-700"
                }`}
                onClick={() => setCollegeTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="space-y-3 p-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Recruiter</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Requested On</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(collegeTab === "connected" ? connected : collegeTab === "pending" ? pending : sent).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.recruiterProfile?.companyName ?? "Recruiter"}</TableCell>
                      <TableCell>
                        <Badge>{row.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(new Date(row.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        {collegeTab === "pending" ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => void onRespond(row.id, "approve")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => void onRespond(row.id, "reject")}>
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={() => void onDisconnect(row.id)}>
                            Disconnect
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Modal
        open={requestModal.open}
        onOpenChange={(open) =>
          setRequestModal((prev) => ({ ...prev, open }))
        }
        title="Send Connection Request"
      >
        <div className="space-y-3">
          <Textarea
            label="Message"
            value={requestModal.message}
            onChange={(event) =>
              setRequestModal((prev) => ({ ...prev, message: event.target.value }))
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRequestModal({ open: false, collegeId: "", message: "" })}>
              Cancel
            </Button>
            <Button onClick={() => void onSendRequest()}>
              Send Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
