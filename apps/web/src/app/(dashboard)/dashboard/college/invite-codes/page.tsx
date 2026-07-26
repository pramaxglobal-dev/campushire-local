"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@campushire/utils";
import { Copy, KeyRound, Plus, Power } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  createInvite,
  deactivateInvite,
  getInviteStats,
  listInvites,
  type InviteStats,
  type InviteWithUsages
} from "@/lib/api/invites.api";
import { toast } from "sonner";

export default function CollegeInviteCodesPage() {
  const [invites, setInvites] = useState<InviteWithUsages[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [maxUses, setMaxUses] = useState(50);
  const [expiryDate, setExpiryDate] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inviteList, inviteStats] = await Promise.all([listInvites(), getInviteStats()]);
      setInvites(inviteList || []);
      setStats(inviteStats || { totalInvites: 0, totalUses: 0, activeInvites: 0, studentsRegistered: 0 });
    } catch (err: any) {
      setError(err?.message || "Failed to load invite codes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateCode = async () => {
    setCreating(true);
    try {
      await createInvite({
        maxUses,
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined
      });
      toast.success("New student invite code generated!");
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate invite code.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateInvite(id);
      toast.success("Invite code deactivated.");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate invite code.");
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Invite code copied to clipboard!");
  };

  if (loading) {
    return <LoadingSkeleton count={3} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadData()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Invite Codes"
        subtitle="Generate unique signup invite codes for student registration and track usage."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate New Code
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-slate-500">Total Invites</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalInvites ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-slate-500">Active Invites</p>
            <p className="text-2xl font-bold text-emerald-600">{stats?.activeInvites ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-slate-500">Total Uses</p>
            <p className="text-2xl font-bold text-indigo-600">{stats?.totalUses ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-slate-500">Students Registered</p>
            <p className="text-2xl font-bold text-blue-600">{stats?.studentsRegistered ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Invite Code</TableCell>
                <TableCell>Max Uses</TableCell>
                <TableCell>Times Used</TableCell>
                <TableCell>Created On</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    <KeyRound className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    No invite codes generated yet. Click "Generate New Code" above to create one.
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono font-bold text-indigo-600">
                      <div className="flex items-center gap-2">
                        <span>{row.code}</span>
                        <button
                          onClick={() => copyToClipboard(row.code)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy Code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{row.maxUses}</TableCell>
                    <TableCell>{row.usedCount}</TableCell>
                    <TableCell className="text-slate-600">
                      {formatDate(new Date(row.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {row.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Deactivated</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDeactivate(row.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Power className="h-3.5 w-3.5 mr-1" />
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Generate Student Invite Code">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Max Usage Limit</label>
            <Input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              min={1}
              max={1000}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Expiration Date (Optional)</label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateCode()} disabled={creating}>
              {creating ? "Generating..." : "Generate Code"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
