"use client";

import { useCallback, useEffect, useState } from "react";
import { ConnectionStatus } from "@campushire/types";
import { formatDate } from "@campushire/utils";
import { Building2, Check, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { listConnections, respondConnection, type RecruiterConnection } from "@/lib/api/connections.api";
import { toast } from "sonner";

export default function CollegeRecruitersPage() {
  const [connections, setConnections] = useState<RecruiterConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listConnections();
      setConnections(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load recruiter connections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const handleRespond = async (connectionId: string, action: "approve" | "reject") => {
    setActionId(connectionId);
    try {
      await respondConnection(connectionId, action);
      toast.success(`Connection request ${action}d!`);
      await loadConnections();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} connection.`);
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton count={3} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadConnections()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connected Recruiters & Companies"
        subtitle="View corporate recruiters and hiring partners connected with your institution."
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Recruiter / Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested On</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    No recruiter connections or pending requests found.
                  </TableCell>
                </TableRow>
              ) : (
                connections.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-slate-900">
                      {row.recruiterProfile?.companyName || "Corporate Partner"}
                    </TableCell>
                    <TableCell>
                      {row.status === ConnectionStatus.APPROVED ? (
                        <Badge variant="success">Connected</Badge>
                      ) : row.status === ConnectionStatus.PENDING ? (
                        <Badge variant="warning">Pending Request</Badge>
                      ) : (
                        <Badge variant="danger">{row.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {formatDate(new Date(row.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {row.status === ConnectionStatus.PENDING ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={actionId === row.id}
                            onClick={() => void handleRespond(row.id, "approve")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionId === row.id}
                            onClick={() => void handleRespond(row.id, "reject")}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Active</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
