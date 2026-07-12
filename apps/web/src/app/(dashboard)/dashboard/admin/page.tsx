"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import { UserRole, type PlatformAnalytics } from "@campushire/types";
import { formatDate, getRoleLabel, getStatusColor } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Input, Modal, Select, Table, TableBody, TableCell, TableHeader, TableRow, Textarea } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import type { SafeUser } from "@/lib/api/auth.api";
import {
  approveUser,
  getPendingApprovals,
  getPlatformStats,
  listFeatureFlags,
  listUsers,
  rejectUser,
  suspendUser,
  toggleFeatureFlag,
  unsuspendUser,
  type FeatureFlagListItem,
  type PendingApproval
} from "@/lib/api/admin.api";
import { getPlatformAnalytics } from "@/lib/api/analytics.api";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { toast } from "sonner";

const APPROVAL_TABS: Array<{ label: string; role: UserRole }> = [
  { label: "Corporate Recruiters", role: UserRole.CORPORATE_RECRUITER },
  { label: "College Admins", role: UserRole.COLLEGE_ADMIN },
  { label: "Vendors", role: UserRole.VENDOR },
  { label: "Training Partners", role: UserRole.TRAINING_PARTNER },
  { label: "Freelancers", role: UserRole.FREELANCE_RECRUITER }
];

const EMPTY_PLATFORM_STATS: Awaited<ReturnType<typeof getPlatformStats>> = {
  usersByRole: {
    [UserRole.SUPER_ADMIN]: 0,
    [UserRole.COLLEGE_ADMIN]: 0,
    [UserRole.STUDENT]: 0,
    [UserRole.JOB_SEEKER]: 0,
    [UserRole.CORPORATE_RECRUITER]: 0,
    [UserRole.FREELANCE_RECRUITER]: 0,
    [UserRole.VENDOR]: 0,
    [UserRole.TRAINING_PARTNER]: 0
  },
  totalTenants: 0,
  totalJobs: 0,
  totalApplications: 0,
  newSignupsLast7Days: 0
};

const EMPTY_PLATFORM_ANALYTICS: PlatformAnalytics = {
  userGrowth: [],
  tenantStats: [],
  revenueMetrics: {
    totalCommissions: 0,
    totalCourseRevenue: 0,
    totalServiceRevenue: 0,
    pendingPayouts: 0
  },
  jobFunnelPlatform: {} as PlatformAnalytics["jobFunnelPlatform"],
  topColleges: [],
  topRecruiters: [],
  dailyActiveUsers: [],
  systemHealth: {
    totalApiCalls: 0,
    errorRate: 0,
    avgResponseTime: 0
  }
};

type AdminSection =
  | "overview"
  | "users"
  | "pending-approvals"
  | "tenants"
  | "platform-settings"
  | "feature-flags"
  | "analytics";

const VALID_ADMIN_SECTIONS = new Set<AdminSection>([
  "overview",
  "users",
  "pending-approvals",
  "tenants",
  "platform-settings",
  "feature-flags",
  "analytics"
]);

const getActiveSection = (value: string | null): AdminSection => {
  if (value && VALID_ADMIN_SECTIONS.has(value as AdminSection)) {
    return value as AdminSection;
  }

  return "overview";
};

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlatformStats>> | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeApprovalRole, setActiveApprovalRole] = useState<UserRole>(UserRole.CORPORATE_RECRUITER);
  const [reasonModal, setReasonModal] = useState<{
    mode: "reject" | "suspend" | null;
    userId: string;
  }>({ mode: null, userId: "" });
  const [reason, setReason] = useState("");
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagListItem[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const activeSection = getActiveSection(searchParams.get("section"));

  const overviewRef = useRef<HTMLElement | null>(null);
  const analyticsRef = useRef<HTMLElement | null>(null);
  const pendingApprovalsRef = useRef<HTMLElement | null>(null);
  const usersRef = useRef<HTMLElement | null>(null);
  const featureFlagsRef = useRef<HTMLElement | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, pendingResult, usersResult, flagsResult, analyticsResult] =
        await Promise.allSettled([
        getPlatformStats(),
        getPendingApprovals(),
        listUsers({
          page: 1,
          limit: 20,
          search: debouncedSearch || undefined,
          role: roleFilter ? (roleFilter as UserRole) : undefined
        }),
        listFeatureFlags(),
        getPlatformAnalytics()
      ]);

      const hasAnySuccess = [statsResult, pendingResult, usersResult, flagsResult, analyticsResult].some(
        (result) => result.status === "fulfilled"
      );

      if (!hasAnySuccess) {
        setError("Unable to load admin dashboard.");
      }

      setStats(statsResult.status === "fulfilled" ? statsResult.value : EMPTY_PLATFORM_STATS);
      setPendingApprovals(pendingResult.status === "fulfilled" ? pendingResult.value : []);
      setUsers(usersResult.status === "fulfilled" ? usersResult.value.data ?? [] : []);
      setFeatureFlags(flagsResult.status === "fulfilled" ? flagsResult.value : []);
      setAnalytics(
        analyticsResult.status === "fulfilled" ? analyticsResult.value : EMPTY_PLATFORM_ANALYTICS
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    let target: HTMLElement | null = null;

    switch (activeSection) {
      case "users":
      case "tenants":
        target = usersRef.current;
        break;
      case "pending-approvals":
        target = pendingApprovalsRef.current;
        break;
      case "feature-flags":
      case "platform-settings":
        target = featureFlagsRef.current;
        break;
      case "analytics":
        target = analyticsRef.current;
        break;
      default:
        target = overviewRef.current;
        break;
    }

    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSection]);

  const loadUsers = useCallback(async () => {
    try {
      const usersResult = await listUsers({
        page: 1,
        limit: 20,
        search: debouncedSearch || undefined,
        role: roleFilter ? (roleFilter as UserRole) : undefined
      });
      setUsers(usersResult.data ?? []);
    } catch (usersError) {
      toast.error(usersError instanceof Error ? usersError.message : "Unable to load users.");
    }
  }, [debouncedSearch, roleFilter]);

  const refreshPendingApprovals = useCallback(async () => {
    try {
      const pendingResult = await getPendingApprovals();
      setPendingApprovals(pendingResult);
    } catch (pendingError) {
      toast.error(pendingError instanceof Error ? pendingError.message : "Unable to load pending approvals.");
    }
  }, []);

  const pendingByRole = useMemo(() => {
    return APPROVAL_TABS.map((tab) => ({
      ...tab,
      users: pendingApprovals.filter((item) => item.role === tab.role)
    }));
  }, [pendingApprovals]);

  const selectedPending = pendingByRole.find((tab) => tab.role === activeApprovalRole)?.users ?? [];

  const totalUsers = useMemo(() => {
    if (!stats) return 0;
    return Object.values(stats.usersByRole).reduce((sum, count) => sum + count, 0);
  }, [stats]);

  const updateReasonAction = async () => {
    if (!reasonModal.mode || !reasonModal.userId || !reason.trim()) return;
    try {
      if (reasonModal.mode === "reject") {
        await rejectUser(reasonModal.userId, reason.trim());
        toast.success("User rejected");
      } else {
        await suspendUser(reasonModal.userId, reason.trim());
        toast.success("User suspended");
      }
      setReasonModal({ mode: null, userId: "" });
      setReason("");
      await loadDashboard();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Unable to complete action.");
    }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error || !stats || !analytics) {
    return <ErrorState message={error ?? "Unable to load dashboard."} onRetry={() => void loadDashboard()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="Monitor platform growth, approvals, and policy controls."
      />

      <section id="overview" ref={overviewRef} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Total Users" value={totalUsers} trend={totalUsers >= 0 ? "up" : "down"} />
        <MetricCard title="Total Tenants" value={stats.totalTenants} trend={stats.totalTenants >= 0 ? "up" : "down"} />
        <MetricCard title="Active Jobs" value={stats.totalJobs} trend={stats.totalJobs >= 0 ? "up" : "down"} />
        <MetricCard title="Total Applications" value={stats.totalApplications} trend={stats.totalApplications >= 0 ? "up" : "down"} />
        <MetricCard title="New Signups (7d)" value={stats.newSignupsLast7Days} trend={stats.newSignupsLast7Days >= 0 ? "up" : "down"} />
        <MetricCard title="Pending Approvals" value={pendingApprovals.length} trend={pendingApprovals.length > 0 ? "up" : "down"} />
      </section>

      <section id="analytics" ref={analyticsRef}>
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Platform Analytics</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricStat title="Commissions" value={analytics.revenueMetrics.totalCommissions} />
            <MetricStat title="Course Revenue" value={analytics.revenueMetrics.totalCourseRevenue} />
            <MetricStat title="Service Revenue" value={analytics.revenueMetrics.totalServiceRevenue} />
            <MetricStat title="Pending Payouts" value={analytics.revenueMetrics.pendingPayouts} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">User Growth (30d)</p>
              <div className="mt-3 h-40 w-full">
                <svg viewBox="0 0 100 40" className="h-full w-full">
                  <polyline
                    fill="none"
                    stroke="#0EA5E9"
                    strokeWidth="1.5"
                    points={analytics.userGrowth
                      .slice(-12)
                      .map((point, index, arr) => {
                        const max = Math.max(...arr.map((item) => item.count), 1);
                        const x = arr.length <= 1 ? 0 : (index / (arr.length - 1)) * 100;
                        const y = 40 - (point.count / max) * 35;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Daily Active Users</p>
              <div className="mt-3 flex h-32 items-end gap-1">
                {analytics.dailyActiveUsers.slice(-14).map((entry) => (
                  <div key={entry.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary"
                      style={{ height: `${Math.max(6, entry.count * 2)}px` }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                API Calls: {analytics.systemHealth.totalApiCalls} | Error Rate: {analytics.systemHealth.errorRate}%
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">Top Colleges</p>
              {analytics.topColleges.slice(0, 5).map((college) => (
                <div key={college.name} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-slate-700">{college.name}</span>
                  <span className="font-semibold text-slate-900">{college.placementRate}%</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">Top Recruiters</p>
              {analytics.topRecruiters.slice(0, 5).map((recruiter) => (
                <div key={recruiter.company} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-slate-700">{recruiter.company}</span>
                  <span className="font-semibold text-slate-900">{recruiter.hires}</span>
                </div>
              ))}
            </div>
          </div>
          </CardContent>
        </Card>
      </section>

      <section id="pending-approvals" ref={pendingApprovalsRef}>
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Pending Approvals</h2>
            <div className="flex flex-wrap gap-2">
              {pendingByRole.map((tab) => (
                <button
                  key={tab.role}
                  type="button"
                  onClick={() => {
                    setActiveApprovalRole(tab.role);
                    void refreshPendingApprovals();
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    activeApprovalRole === tab.role
                      ? "border-accent bg-accent text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {tab.label} ({tab.users.length})
                </button>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPending.map((row) => (
                  <TableRow key={row.user.id}>
                    <TableCell>{row.user.firstName} {row.user.lastName}</TableCell>
                    <TableCell>{row.user.email}</TableCell>
                    <TableCell>{getRoleLabel(row.user.role)}</TableCell>
                    <TableCell>{formatDate(new Date(row.user.createdAt), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={async () => {
                          try {
                            await approveUser(row.user.id);
                            toast.success("User approved");
                            await loadDashboard();
                          } catch (approveError) {
                            toast.error(approveError instanceof Error ? approveError.message : "Unable to approve user.");
                          }
                        }}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setReasonModal({ mode: "reject", userId: row.user.id })}>
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section id="users" ref={usersRef}>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
                <Button type="button" size="sm" variant="outline" onClick={() => void loadUsers()}>
                  Refresh
                </Button>
              </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  helperText="Search by name or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={roleFilter}
                options={[
                  { label: "All Roles", value: "" },
                  ...Object.values(UserRole).map((role) => ({ label: getRoleLabel(role), value: role }))
                ]}
                onChange={(event) => setRoleFilter(event.target.value)}
              />
            </div>
          </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleLabel(user.role)}</TableCell>
                    <TableCell>{user.tenantId ?? "Platform"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.isActive ? "ACTIVE" : "REJECTED")}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(new Date(user.createdAt), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.isActive ? (
                          <Button size="sm" variant="destructive" onClick={() => setReasonModal({ mode: "suspend", userId: user.id })}>
                            Suspend
                          </Button>
                        ) : (
                          <Button size="sm" onClick={async () => {
                            try {
                              await unsuspendUser(user.id);
                              toast.success("User unsuspended");
                              await loadDashboard();
                            } catch (unsuspendError) {
                              toast.error(unsuspendError instanceof Error ? unsuspendError.message : "Unable to unsuspend user.");
                            }
                          }}>
                            Unsuspend
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section id="feature-flags" ref={featureFlagsRef}>
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Feature Flags</h2>
          {featureFlags.length === 0 ? (
            <p className="text-sm text-slate-600">No platform feature flags found.</p>
          ) : (
            <div className="space-y-2">
              {featureFlags.map((flag) => (
                <div key={flag.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium text-slate-900">{flag.key}</p>
                    <p className="text-xs text-slate-500">
                      {flag.description ?? "No description provided."}
                    </p>
                    <p className="text-xs text-slate-500">
                      Enabled Plans: {flag.enabledForPlans.length > 0 ? flag.enabledForPlans.join(", ") : "None"}
                    </p>
                  </div>
                  <Button
                    variant={flag.isEnabled ? "outline" : "default"}
                    onClick={async () => {
                      try {
                        const updated = await toggleFeatureFlag(flag.key);
                        toast.success(`${flag.key} ${updated.isEnabled ? "enabled" : "disabled"}`);
                        const refreshed = await listFeatureFlags();
                        setFeatureFlags(refreshed);
                      } catch (toggleError) {
                        toast.error(toggleError instanceof Error ? toggleError.message : "Unable to toggle feature.");
                      }
                    }}
                  >
                    {flag.isEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>
      </section>

      <Modal
        open={reasonModal.mode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReasonModal({ mode: null, userId: "" });
            setReason("");
          }
        }}
        title={reasonModal.mode === "reject" ? "Reject User" : "Suspend User"}
      >
        <div className="space-y-4">
          <Textarea
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReasonModal({ mode: null, userId: "" });
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void updateReasonAction()}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const MetricCard = ({ title, value, trend }: { title: string; value: number; trend: "up" | "down" }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <span className={`inline-flex items-center text-xs ${trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>
          {trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          7d
        </span>
      </div>
    </CardContent>
  </Card>
);

const MetricStat = ({ title, value }: { title: string; value: number }) => (
  <div className="rounded-lg border border-slate-200 p-3">
    <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
    <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);
