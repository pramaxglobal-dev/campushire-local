"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@campushire/utils";
import { Plus, Shield, Trash2, UserCheck, UserMinus, UserPlus } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal, Select, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui";
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

const ROLE_LABELS: Record<string, string> = {
  OWNER: "College Admin (Owner)",
  ADMIN: "TPO",
  MANAGER: "Assistant TPO",
  MEMBER: "Coordinator"
};

export default function CollegeTeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<CollegeTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [subRole, setSubRole] = useState<SubRole>(SubRole.ADMIN);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // One-time temp password display state
  const [createdMemberName, setCreatedMemberName] = useState("");
  const [tempPasswordModalOpen, setTempPasswordModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  // Permanent delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CollegeTeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null);

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
      setMembers(prev => prev.filter(m => m.id !== deleteTarget.id));
    } catch (err: any) {
      // If backend blocked it with a reason, show that reason inside the modal
      const msg = err?.message || "Failed to delete team member.";
      setDeleteBlockReason(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton count={3} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadTeam()} />;
  }

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
                {isOwner && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isOwner ? 6 : 5} className="text-center py-8 text-slate-500">
                    <UserCheck className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    No team members found. Click &quot;Add Team Member&quot; above to invite staff.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => {
                  const roleLabel = member.subRole ? ROLE_LABELS[member.subRole] || member.subRole : "College Admin (Owner)";
                  const canBeActedOn = isOwner && member.id !== user?.id;

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium text-slate-900">
                        {member.firstName} {member.lastName}
                      </TableCell>
                      <TableCell className="text-slate-600">{member.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.subRole === SubRole.OWNER
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
                      {isOwner && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canBeActedOn && member.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={removingId === member.id}
                                onClick={() => void handleRemoveMember(member.id, `${member.firstName} ${member.lastName}`)}
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
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Member Modal */}
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
                { value: SubRole.ADMIN, label: "TPO" },
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

      {/* One-time Temporary Password Modal */}
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
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ This password will NOT be shown again</p>
            <p className="text-xs text-amber-700">
              Copy it now and share it securely with <strong>{createdMemberName}</strong>. Ask them to log in and change it immediately.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500 mb-2">Temporary Password for {createdMemberName}</p>
            <p className="text-2xl font-mono font-bold tracking-widest text-slate-900 select-all">
              {tempPassword}
            </p>
          </div>

          <p className="text-xs text-slate-500 text-center">
            The staff member should log in at <span className="font-medium">/login</span> using their email address and this temporary password, then change it from their account settings.
          </p>

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

      {/* Permanent Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setDeleteBlockReason(null); }} title="Permanently Delete Team Member">
        <div className="space-y-4">
          {deleteBlockReason ? (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Cannot Delete This Account</p>
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
                <p className="text-sm font-semibold text-red-800 mb-1">⚠️ This action cannot be undone.</p>
                <p className="text-sm text-red-700">
                  Are you sure you want to <strong>permanently delete</strong>{" "}
                  <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> ({deleteTarget?.email}) from the system?
                  Their login access and account will be completely removed.
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Note: If this person has created invite codes or approved students, the deletion will be blocked for data safety.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
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
