"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@campushire/utils";
import { Briefcase, Calendar, Check, Eye, UserCheck, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal, Select, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  approveUser,
  bulkApproveStudents,
  getCohortDashboard,
  getStudentDetailsForCollegeAdmin,
  rejectUser,
  type CohortStudentItem,
  type StudentDetailViewData
} from "@/lib/api/admin.api";
import { useAuth } from "@/lib/hooks/useAuth";
import { SubRole } from "@campushire/types";
import { toast } from "sonner";

export default function CollegeStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<CohortStudentItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placementFilter, setPlacementFilter] = useState<"ALL" | "PLACED" | "UNPLACED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Detail Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<StudentDetailViewData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const canApprove = user?.subRole !== SubRole.MEMBER;

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCohortDashboard({
        placementStatus: placementFilter === "ALL" ? undefined : placementFilter,
        limit: 100
      });
      const studentItems = Array.isArray(res.students)
        ? res.students
        : Array.isArray((res.students as any)?.data)
        ? (res.students as any).data
        : [];
      setStudents(studentItems);
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
      await rejectUser(userId, "Rejected by College Placement Officer");
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
      toast.success(`Successfully approved ${res.approvedCount} student(s)!`);
      setSelectedUserIds([]);
      await loadStudents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to bulk approve students.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = async (userId: string) => {
    setSelectedStudentUserId(userId);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const data = await getStudentDetailsForCollegeAdmin(userId);
      setDetailData(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch student details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.user.firstName} ${s.user.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return fullName.includes(query) || s.user.email.toLowerCase().includes(query);
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
        title="Student Directory & Placement Tracking"
        subtitle="View all students linked to your college, track job applications, scheduled interviews, and manage account approvals."
        actions={
          canApprove && selectedUserIds.length > 0 ? (
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
                {canApprove && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length > 0 && selectedUserIds.length === students.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                )}
                <TableCell>Student Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Grad Year</TableCell>
                <TableCell>Applications</TableCell>
                <TableCell>Upcoming Interview</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canApprove ? 8 : 7} className="text-center py-8 text-slate-500">
                    No students found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s) => {
                  const upcomingDateFormatted = s.upcomingInterviewDate
                    ? formatDate(new Date(s.upcomingInterviewDate), "dd MMM yyyy, hh:mm a")
                    : "None";

                  return (
                    <TableRow key={s.id}>
                      {canApprove && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(s.userId)}
                            onChange={(e) => handleSelectOne(s.userId, e.target.checked)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-slate-900">
                        {s.user.firstName} {s.user.lastName}
                      </TableCell>
                      <TableCell className="text-slate-600">{s.user.email}</TableCell>
                      <TableCell>{s.graduationYear ?? "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={s.applicationsCount && s.applicationsCount > 0 ? "info" : "default"}>
                          {s.applicationsCount ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.upcomingInterviewDate ? (
                          <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs">
                            {upcomingDateFormatted}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.user.isApproved ? (
                          <Badge variant="success">Approved</Badge>
                        ) : (
                          <Badge variant="warning">Pending Approval</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleViewDetails(s.userId)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View Details
                          </Button>
                          {canApprove && !s.user.isApproved && (
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
                          {canApprove && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoading === s.userId}
                              onClick={() => void handleSingleReject(s.userId)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Details Modal */}
      <Modal open={detailModalOpen} onOpenChange={setDetailModalOpen} title="Student Profile & Placement Details">
        {detailLoading ? (
          <LoadingSkeleton count={3} />
        ) : detailData ? (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header info & Profile details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {detailData.student.firstName} {detailData.student.lastName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                    <span><strong>Email:</strong> {detailData.student.email}</span>
                    <span>•</span>
                    <span><strong>Phone:</strong> {detailData.student.phone || "N/A"}</span>
                  </div>
                </div>
                <Badge variant={detailData.student.isApproved ? "success" : "warning"}>
                  {detailData.student.isApproved ? "Approved Account" : "Pending Approval"}
                </Badge>
              </div>

              {/* Academic Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 pt-3 border-t border-slate-200 bg-white p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="block font-semibold text-slate-500 text-[10px] uppercase">Degree / Program</span>
                  <span className="font-bold text-slate-900">{detailData.student.program || "N/A"}</span>
                </div>
                <div>
                  <span className="block font-semibold text-slate-500 text-[10px] uppercase">Branch / Dept</span>
                  <span className="font-bold text-slate-900">{detailData.student.department || "N/A"}</span>
                </div>
                <div>
                  <span className="block font-semibold text-slate-500 text-[10px] uppercase">Batch Year</span>
                  <span className="font-bold text-slate-900">{detailData.student.graduationYear || "N/A"}</span>
                </div>
                <div>
                  <span className="block font-semibold text-slate-500 text-[10px] uppercase">CGPA</span>
                  <span className="font-bold text-slate-900">{detailData.student.cgpa ? `${detailData.student.cgpa} / 10` : "N/A"}</span>
                </div>
              </div>

              {/* Skills & Resume Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Skills:</span>
                  {Array.isArray(detailData.student.skills) && detailData.student.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {detailData.student.skills.map((skill: string, idx: number) => (
                        <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium text-[11px]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">No skills listed</span>
                  )}
                </div>

                <div className="shrink-0">
                  <span className="font-semibold text-slate-700 block mb-1">Resume File:</span>
                  {detailData.student.resumeUrl ? (
                    <a
                      href={detailData.student.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent/90 transition"
                    >
                      View Resume File ↗
                    </a>
                  ) : (
                    <span className="text-slate-400 bg-slate-100 px-2.5 py-1 rounded text-xs">No resume uploaded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Applications list */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-accent" />
                <h4 className="text-base font-semibold text-slate-900">
                  Job Applications ({detailData.applications.length})
                </h4>
              </div>
              {detailData.applications.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded border text-center">
                  No job applications submitted yet by this student.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Job Title</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell>Applied Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailData.applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium text-slate-900">{app.jobTitle}</TableCell>
                        <TableCell className="text-slate-600">{app.companyName}</TableCell>
                        <TableCell className="text-slate-600">
                          {formatDate(new Date(app.appliedAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              app.status === "HIRED" || app.status === "ACCEPTED" || app.status === "OFFERED"
                                ? "success"
                                : app.status === "REJECTED" || app.status === "WITHDRAWN"
                                ? "danger"
                                : "info"
                            }
                          >
                            {app.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Interviews list */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <h4 className="text-base font-semibold text-slate-900">
                  Scheduled & Past Interviews ({detailData.interviews.length})
                </h4>
              </div>
              {detailData.interviews.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded border text-center">
                  No interviews scheduled for this student yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Job Role</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Round</TableCell>
                      <TableCell>Mode</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailData.interviews.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium text-slate-900">{inv.jobTitle}</TableCell>
                        <TableCell className="text-slate-600">{inv.companyName}</TableCell>
                        <TableCell className="text-slate-600 font-mono text-xs">
                          {formatDate(new Date(inv.scheduledStartAt), "dd MMM yyyy, hh:mm a")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{inv.round}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{inv.mode}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              inv.status === "CONFIRMED" || inv.status === "SCHEDULED"
                                ? "success"
                                : inv.status === "COMPLETED"
                                ? "default"
                                : "warning"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ) : (
          <ErrorState message="Failed to load student details." />
        )}
      </Modal>
    </div>
  );
}
