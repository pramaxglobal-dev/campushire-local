"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, UserCheck, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Select, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  approveUser,
  bulkApproveStudents,
  getCohortDashboard,
  rejectUser,
  type CohortStudentItem
} from "@/lib/api/admin.api";
import { toast } from "sonner";

export default function CollegeStudentsPage() {
  const [students, setStudents] = useState<CohortStudentItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placementFilter, setPlacementFilter] = useState<"ALL" | "PLACED" | "UNPLACED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCohortDashboard({
        placementStatus: placementFilter === "ALL" ? undefined : placementFilter,
        limit: 100
      });
      setStudents(res.students.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load students list.");
    } finally {
      setLoading(false);
    }
  }, [placementFilter]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(students.map((s) => s.userId));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectOne = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds((prev) => [...prev, userId]);
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleSingleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await approveUser(userId);
      toast.success("Student approved successfully!");
      await loadStudents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve student.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSingleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      await rejectUser(userId, "Account rejected by College TPO");
      toast.success("Student account rejected.");
      await loadStudents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject student.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedUserIds.length === 0) return;
    setActionLoading("bulk");
    try {
      const res = await bulkApproveStudents(selectedUserIds);
      toast.success(`Bulk approved ${res.approvedCount} student(s)!`);
      setSelectedUserIds([]);
      await loadStudents();
    } catch (err: any) {
      toast.error(err?.message || "Bulk approval failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${s.user.firstName} ${s.user.lastName}`.toLowerCase();
    const email = s.user.email.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  if (loading) {
    return <LoadingSkeleton count={4} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadStudents()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory & Approvals"
        subtitle="View all students linked to your college, review accounts, and perform individual or bulk approvals."
        actions={
          selectedUserIds.length > 0 ? (
            <Button
              onClick={() => void handleBulkApprove()}
              disabled={actionLoading === "bulk"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Approve Selected ({selectedUserIds.length})
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search students by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Filter:</span>
              <Select
                value={placementFilter}
                onChange={(e) => setPlacementFilter(e.target.value as any)}
                options={[
                  { value: "ALL", label: "All Students" },
                  { value: "PLACED", label: "Placed Only" },
                  { value: "UNPLACED", label: "Unplaced Only" }
                ]}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length > 0 && selectedUserIds.length === students.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Student Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Graduation Year</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No students found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(s.userId)}
                        onChange={(e) => handleSelectOne(s.userId, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {s.user.firstName} {s.user.lastName}
                    </TableCell>
                    <TableCell className="text-slate-600">{s.user.email}</TableCell>
                    <TableCell>{s.graduationYear ?? "N/A"}</TableCell>
                    <TableCell>
                      {s.user.isApproved ? (
                        <Badge variant="success">Approved</Badge>
                      ) : (
                        <Badge variant="warning">Pending Approval</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!s.user.isApproved && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading === s.userId}
                            onClick={() => void handleSingleApprove(s.userId)}
                            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoading === s.userId}
                          onClick={() => void handleSingleReject(s.userId)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
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
