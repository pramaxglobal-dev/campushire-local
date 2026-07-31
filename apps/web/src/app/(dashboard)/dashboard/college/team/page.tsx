"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@campushire/utils";
import { Eye, Plus, Shield, Trash2, UserMinus, UserPlus } from "lucide-react";
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
  TableRow
} from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  addCollegeTeamMember,
  deleteTeamMemberPermanently,
  listCollegeTeam,
  removeCollegeTeamMember,
  type CollegeTeamMember
} from "@/lib/api/admin.api";
import { useAuth } from "@/lib/hooks/useAuth";
import { SubRole } from "@campushire/types";
import { toast } from "sonner";

// ─── Role metadata ───────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  OWNER: "College Admin (Owner)",
  ADMIN: "TPO (Training & Placement Officer)",
  MANAGER: "Assistant TPO",
  MEMBER: "Coordinator"
};

interface PermissionEntry {
  can: string[];
  cannot: string[];
}

// These lists are derived DIRECTLY from the real backend route guards.
// See admin.routes.ts, invites.routes.ts, training.routes.ts, whitelabel.routes.ts
const ROLE_PERMISSIONS: Record<string, PermissionEntry> = {
  OWNER: {
    can: [
      "Approve or reject student accounts",
      "Bulk-approve multiple students at once",
      "Generate, view, deactivate, and delete student invite codes",
      "Add new staff members (TPO, Assistant TPO, Coordinator) to the college team",
      "Deactivate or permanently delete staff members",
      "Edit college profile (logo, branding, whitelabel settings)",
      "Assign Training Partner courses to students",
      "View course completion progress",
      "View college analytics (students, applications, placements)",
      "Access the student directory and full student profiles",
      "Manage college events",
      "View all team members and their permissions"
    ],
    cannot: []
  },
  ADMIN: {
    can: [
      "Approve or reject student accounts",
      "Bulk-approve multiple students at once",
      "View student invite codes (can generate and deactivate them)",
      "Assign Training Partner courses to students",
      "View course completion progress",
      "View college analytics",
      "Access the student directory and full student profiles",
      "View all team members"
    ],
    cannot: [
      "Add, deactivate, or delete staff/team members",
      "Edit college profile or branding (logo, whitelabel settings)",
      "Delete invite codes permanently"
    ]
  },
  MANAGER: {
    can: [
      "Approve or reject student accounts",
      "Bulk-approve multiple students at once",
      "View college analytics",
      "Access the student directory and full student profiles",
      "View course completion progress",
      "View all team members"
    ],
    cannot: [
      "Generate or manage student invite codes",
      "Assign courses to students",
      "Add, deactivate, or delete staff/team members",
      "Edit college profile or branding (logo, whitelabel settings)"
    ]
  },
  MEMBER: {
    can: [
      "View the student directory (read-only)",
      "View college analytics (read-only)",
      "View assigned courses and completion progress (read-only)",
      "View team members (read-only)"
    ],
    cannot: [
      "Approve or reject student accounts",
      "Generate or manage student invite codes",
      "Assign courses to students",
      "Add, deactivate, or delete staff/team members",
      "Edit college profile or branding"
    ]
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CollegeTeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<CollegeTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member modal
  const [modalOpen, setModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [subRole, setSubRole] = useState<SubRole>(SubRole.ADMIN);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // One-time temp password display
  const [createdMemberName, setCreatedMemberName] = useState("");
  const [tempPasswordModalOpen, setTempPasswordModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  // Permanent delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CollegeTeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null);

  // View details modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<CollegeTeamMember | null>(null);

  const isOwner = !user?.subRole || user?.subRole === SubRole.OWNER;

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollegeTeam();
      setMembers(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load college team members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const handleAddMember = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await addCollegeTeamMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        subRole
      });
      setModalOpen(false);
      const memberName = `${firstName.trim()} ${lastName.trim()}`;
      setCreatedMemberName(memberName);
      setTempPassword(result.temporaryPassword || "");
      setTempPasswordModalOpen(true);
      setFirstName("");
      setLastName("");
      setEmail("");
      setSubRole(SubRole.ADMIN);
      await loadTeam();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add team member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    setRemovingId(id);
    try {
      await removeCollegeTeamMember(id);
      toast.success(`Team member ${name} deactivated.`);
      await loadTeam();
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate team member.");
    } finally {
      setRemovingId(null);
    }
  };

  const openDeleteConfirm = (member: CollegeTeamMember) => {
    setDeleteTarget(member);
    setDeleteBlockReason(null);
    setDeleteConfirmOpen(true);
  };

  const handleDeletePermanently = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteBlockReason(null);
    try {
      await deleteTeamMemberPermanently(deleteTarget.id);
      toast.success(`${deleteTarget.firstName} ${deleteTarget.lastName} permanently deleted.`);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    } catch (err: any) {
      setDeleteBlockReason(err?.message || "Failed to delete team member.");
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDetails = (member: CollegeTeamMember) => {
    setDetailMember(member);
    setDetailModalOpen(true);
  };

  if (loading) return <LoadingSkeleton count={3} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadTeam()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Team & Staff"
        subtitle="Manage placement officers, assistant TPOs, and coordinators for your institution."
        actions={
          isOwner ? (
            <Button onClick={() => setModalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date Added</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No team members found. Click &quot;Add Team Member&quot; above to invite staff.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => {
                  const roleLabel = member.subRole
                    ? ROLE_LABELS[member.subRole] || member.subRole
                    : "College Admin (Owner)";
                  const isOwnAccount = member.id === user?.id;
                  const canBeActedOn = isOwner && !isOwnAccount;

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-slate-900">
                        {member.firstName} {member.lastName}
                        {isOwnAccount && (
                          <span className="ml-2 text-xs text-indigo-600 font-normal">(you)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">{member.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.subRole === SubRole.OWNER || !member.subRole
                              ? "default"
                              : member.subRole === SubRole.ADMIN
                              ? "info"
                              : member.subRole === SubRole.MANAGER
                              ? "warning"
                              : "default"
                          }
                        >
                          {roleLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Deactivated</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(new Date(member.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* View Details — owners can see all; staff can only see their own */}
                          {(isOwner || isOwnAccount) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(member)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View Details
                            </Button>
                          )}
                          {canBeActedOn && member.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={removingId === member.id}
                              onClick={() =>
                                void handleRemoveMember(member.id, `${member.firstName} ${member.lastName}`)
                              }
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              title="Deactivate (keeps data, just blocks login)"
                            >
                              <UserMinus className="h-3.5 w-3.5 mr-1" />
                              Deactivate
                            </Button>
                          )}
                          {canBeActedOn && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteConfirm(member)}
                              className="text-red-700 border-red-300 hover:bg-red-50"
                              title="Permanently delete from system"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
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

      {/* ─── View Details Modal ──────────────────────────────────────────────── */}
      <Modal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title="Staff Member Profile & Permissions"
      >
        {detailMember && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Profile section */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {detailMember.firstName} {detailMember.lastName}
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">{detailMember.email}</p>
                </div>
                <Badge
                  variant={detailMember.isActive ? "success" : "danger"}
                >
                  {detailMember.isActive ? "Active Account" : "Deactivated Account"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Role
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {detailMember.subRole
                      ? ROLE_LABELS[detailMember.subRole] || detailMember.subRole
                      : "College Admin (Owner)"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Date Added
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {formatDate(new Date(detailMember.createdAt), "dd MMM yyyy")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Last Login
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {detailMember.lastLoginAt
                      ? formatDate(new Date(detailMember.lastLoginAt), "dd MMM yyyy, hh:mm a")
                      : "Never logged in"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Account Status
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {detailMember.isActive ? "Active" : "Deactivated"}
                  </span>
                </div>
              </div>
            </div>

            {/* Permissions section */}
            {(() => {
              const roleKey = detailMember.subRole ?? "OWNER";
              const perms = ROLE_PERMISSIONS[roleKey] ?? ROLE_PERMISSIONS["OWNER"];
              const roleLabel = ROLE_LABELS[roleKey] ?? "College Admin (Owner)";
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-500" />
                    <h4 className="font-semibold text-slate-900">
                      Permissions & Access — {roleLabel}
                    </h4>
                  </div>

                  {perms.can.length > 0 && (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                        ✅ Can Do
                      </p>
                      <ul className="space-y-1.5">
                        {perms.can.map((item, i) => (
                          <li key={i} className="text-sm text-emerald-900 flex gap-2">
                            <span className="text-emerald-500 font-bold shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perms.cannot.length > 0 && (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">
                        ❌ Cannot Do
                      </p>
                      <ul className="space-y-1.5">
                        {perms.cannot.map((item, i) => (
                          <li key={i} className="text-sm text-red-900 flex gap-2">
                            <span className="text-red-400 font-bold shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perms.cannot.length === 0 && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800">
                      This role has full administrative access to all college features.
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Add Member Modal ────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Team Member">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">First Name</label>
              <Input
                placeholder="e.g. Rahul"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Last Name</label>
              <Input
                placeholder="e.g. Sharma"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Email Address</label>
            <Input
              type="email"
              placeholder="e.g. rahul.sharma@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Role to Assign</label>
            <Select
              value={subRole}
              onChange={(e) => setSubRole(e.target.value as SubRole)}
              options={[
                { value: SubRole.ADMIN, label: "TPO (Training & Placement Officer)" },
                { value: SubRole.MANAGER, label: "Assistant TPO" },
                { value: SubRole.MEMBER, label: "Coordinator" }
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddMember()} disabled={submitting}>
              {submitting ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Temp Password Modal ─────────────────────────────────────────────── */}
      <Modal
        open={tempPasswordModalOpen}
        onOpenChange={(open) => {
          if (!open) setTempPassword("");
          setTempPasswordModalOpen(open);
        }}
        title="Account Created — Save This Password"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              ⚠️ This password will NOT be shown again
            </p>
            <p className="text-xs text-amber-700">
              Copy it now and share it securely with <strong>{createdMemberName}</strong>. Ask them
              to log in and change it immediately.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500 mb-2">
              Temporary Password for {createdMemberName}
            </p>
            <p className="text-2xl font-mono font-bold tracking-widest text-slate-900 select-all">
              {tempPassword}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setTempPassword("");
                setTempPasswordModalOpen(false);
              }}
            >
              I&apos;ve saved it — Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Permanent Delete Confirm Modal ──────────────────────────────────── */}
      <Modal
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setDeleteBlockReason(null);
        }}
        title="Permanently Delete Team Member"
      >
        <div className="space-y-4">
          {deleteBlockReason ? (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  ⚠️ Cannot Delete This Account
                </p>
                <p className="text-sm text-amber-700">{deleteBlockReason}</p>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                  Close — I&apos;ll Deactivate Instead
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  ⚠️ This action cannot be undone.
                </p>
                <p className="text-sm text-red-700">
                  Are you sure you want to permanently delete{" "}
                  <strong>
                    {deleteTarget?.firstName} {deleteTarget?.lastName}
                  </strong>{" "}
                  ({deleteTarget?.email})? Their login access and account will be completely
                  removed.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleDeletePermanently()}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {deleting ? "Deleting..." : "Yes, Delete Permanently"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
