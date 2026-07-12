"use client";

import { useCallback, useEffect, useState } from "react";
import { JobStatus, NotificationChannel, NotificationType, Plan, UserRole, type PlatformSetting, type Tenant } from "@campushire/types";
import { formatDate } from "@campushire/utils";
import { Building2, FileClock, Megaphone, Settings2, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal, Select, Textarea } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  broadcastNotification,
  createTenant,
  listAuditLogs,
  listPlatformSettings,
  listTenants,
  toggleTenantActive,
  updatePlatformSetting,
  updateTenant,
  type AuditLogView
} from "@/lib/api/admin.api";
import { approveJob, listJobs, rejectJob, type JobCard } from "@/lib/api/jobs.api";
import { toast } from "sonner";

interface TenantForm {
  name: string;
  slug: string;
  plan: Plan;
  primaryDomain: string;
  supportEmail: string;
  timezone: string;
  country: string;
  isWhiteLabel: boolean;
}

const emptyTenant: TenantForm = {
  name: "",
  slug: "",
  plan: Plan.FREE,
  primaryDomain: "",
  supportEmail: "",
  timezone: "Asia/Kolkata",
  country: "India",
  isWhiteLabel: false
};

const broadcastRoles = Object.values(UserRole).filter((role) => role !== UserRole.SUPER_ADMIN);

export default function AdminManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantForm>(emptyTenant);
  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [rejectingJob, setRejectingJob] = useState<JobCard | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantRows, jobRows, settingRows, logRows] = await Promise.all([
        listTenants({ page: 1, limit: 100 }),
        listJobs({ page: 1, limit: 100, status: JobStatus.PENDING_APPROVAL }),
        listPlatformSettings(),
        listAuditLogs()
      ]);
      setTenants(tenantRows.data ?? []);
      setJobs(jobRows.data ?? []);
      setSettings(settingRows);
      setAuditLogs(logRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load management controls.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openTenant = (tenant?: Tenant): void => {
    setEditingTenantId(tenant?.id ?? null);
    setTenantForm(tenant ? {
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      primaryDomain: tenant.primaryDomain ?? "",
      supportEmail: tenant.supportEmail ?? "",
      timezone: tenant.timezone,
      country: tenant.country,
      isWhiteLabel: tenant.isWhiteLabel
    } : emptyTenant);
    setTenantOpen(true);
  };

  const saveTenant = async (): Promise<void> => {
    if (!tenantForm.name.trim()) { toast.error("Tenant name is required."); return; }
    setSaving(true);
    try {
      const payload = {
        name: tenantForm.name.trim(),
        slug: tenantForm.slug.trim() || undefined,
        plan: tenantForm.plan,
        primaryDomain: tenantForm.primaryDomain.trim() || undefined,
        supportEmail: tenantForm.supportEmail.trim() || undefined,
        timezone: tenantForm.timezone.trim(),
        country: tenantForm.country.trim(),
        isWhiteLabel: tenantForm.isWhiteLabel
      };
      if (editingTenantId) await updateTenant(editingTenantId, payload);
      else await createTenant(payload);
      toast.success(editingTenantId ? "Tenant updated." : "Tenant created.");
      setTenantOpen(false);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save tenant.");
    } finally { setSaving(false); }
  };

  const saveSetting = async (): Promise<void> => {
    if (!settingKey.trim() || !settingValue.trim()) { toast.error("Setting key and value are required."); return; }
    setSaving(true);
    try {
      await updatePlatformSetting(settingKey.trim(), settingValue.trim());
      toast.success("Platform setting saved.");
      setSettingKey(""); setSettingValue("");
      await load();
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : "Unable to save setting."); }
    finally { setSaving(false); }
  };

  const sendBroadcast = async (): Promise<void> => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) { toast.error("Title and message are required."); return; }
    setSaving(true);
    try {
      await broadcastNotification({
        title: broadcastTitle.trim(), body: broadcastBody.trim(),
        type: NotificationType.SYSTEM, channel: NotificationChannel.IN_APP,
        roles: selectedRoles.length ? selectedRoles : undefined
      });
      toast.success("Broadcast queued for delivery.");
      setBroadcastTitle(""); setBroadcastBody(""); setSelectedRoles([]);
    } catch (sendError) { toast.error(sendError instanceof Error ? sendError.message : "Unable to send broadcast."); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-8">
      <PageHeader title="Platform Management" subtitle="Operate tenants, moderation, policy, and platform-wide communication from one control plane." />

      <section id="tenants" className="scroll-mt-24">
        <Card><CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Building2 className="h-5 w-5" />Tenant Management</h2><p className="text-sm text-slate-600">Create, edit, activate, and suspend isolated organizations.</p></div>
            <Button onClick={() => openTenant()}>Create Tenant</Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{tenant.name}</p><p className="text-sm text-slate-500">{tenant.slug} · {tenant.plan}</p></div><Badge variant={tenant.isActive ? "success" : "danger"}>{tenant.isActive ? "Active" : "Suspended"}</Badge></div>
                <p className="mt-2 text-sm text-slate-600">{tenant.primaryDomain ?? "No custom domain"}</p>
                <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => openTenant(tenant)}>Edit</Button><Button size="sm" variant={tenant.isActive ? "destructive" : "default"} onClick={async () => { try { await toggleTenantActive(tenant.id); toast.success(`Tenant ${tenant.isActive ? "suspended" : "activated"}.`); await load(); } catch (toggleError) { toast.error(toggleError instanceof Error ? toggleError.message : "Unable to change tenant status."); } }}>{tenant.isActive ? "Suspend" : "Activate"}</Button></div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      </section>

      <section id="jobs" className="scroll-mt-24">
        <Card><CardContent className="space-y-4 p-5">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5" />Job Moderation</h2><p className="text-sm text-slate-600">Review recruiter submissions before public release.</p></div>
          {jobs.length === 0 ? <p className="text-sm text-slate-600">No jobs are waiting for approval.</p> : jobs.map((job) => (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><p className="font-semibold">{job.title}</p><p className="text-sm text-slate-600">{job.company} · submitted {formatDate(new Date(job.postedAt), "dd MMM yyyy")}</p></div><div className="flex gap-2"><Button size="sm" onClick={async () => { try { await approveJob(job.id); toast.success("Job approved and published."); await load(); } catch (approveError) { toast.error(approveError instanceof Error ? approveError.message : "Unable to approve job."); } }}>Approve</Button><Button size="sm" variant="destructive" onClick={() => setRejectingJob(job)}>Reject</Button></div></div>
          ))}
        </CardContent></Card>
      </section>

      <section id="platform-settings" className="scroll-mt-24">
        <Card><CardContent className="space-y-4 p-5">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Settings2 className="h-5 w-5" />Platform Settings</h2><p className="text-sm text-slate-600">Persist global operational policy as auditable key/value settings.</p></div>
          <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"><Input label="Setting key" value={settingKey} onChange={(event) => setSettingKey(event.target.value)} placeholder="support.email" /><Input label="Value" value={settingValue} onChange={(event) => setSettingValue(event.target.value)} /><div className="flex items-end"><Button onClick={() => void saveSetting()} disabled={saving}>Save</Button></div></div>
          <div className="grid gap-2 md:grid-cols-2">{settings.map((setting) => <button type="button" key={setting.id} className="rounded-lg border border-slate-200 p-3 text-left" onClick={() => { setSettingKey(setting.key); setSettingValue(typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value)); }}><p className="text-sm font-semibold">{setting.key}</p><p className="truncate text-xs text-slate-500">{typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value)}</p></button>)}</div>
        </CardContent></Card>
      </section>

      <section id="broadcast" className="scroll-mt-24">
        <Card><CardContent className="space-y-4 p-5">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Megaphone className="h-5 w-5" />Broadcast Notification</h2><p className="text-sm text-slate-600">Send a persisted in-app announcement to selected audiences; no selected role means everyone.</p></div>
          <Input label="Title" value={broadcastTitle} onChange={(event) => setBroadcastTitle(event.target.value)} /><Textarea label="Message" value={broadcastBody} onChange={(event) => setBroadcastBody(event.target.value)} />
          <div><p className="mb-2 text-sm font-medium">Audience</p><div className="flex flex-wrap gap-2">{broadcastRoles.map((role) => { const active = selectedRoles.includes(role); return <button key={role} type="button" onClick={() => setSelectedRoles((current) => active ? current.filter((item) => item !== role) : [...current, role])} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-primary bg-primary text-white" : "border-slate-300 text-slate-700"}`}>{role.replaceAll("_", " ")}</button>; })}</div></div>
          <Button onClick={() => void sendBroadcast()} disabled={saving}>Send Broadcast</Button>
        </CardContent></Card>
      </section>

      <section id="audit-logs" className="scroll-mt-24">
        <Card><CardContent className="space-y-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><FileClock className="h-5 w-5" />Audit Logs</h2><p className="text-sm text-slate-600">Latest 200 administrative and operational actions, ordered newest first.</p></div><div className="max-h-[32rem] divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">{auditLogs.map((log) => <div key={log.id} className="grid gap-1 p-3 text-sm md:grid-cols-[1.2fr_1fr_1fr_auto]"><span className="font-semibold text-slate-900">{log.action}</span><span className="text-slate-600">{log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}</span><span className="text-slate-600">{log.tenant?.name ?? "Platform"}</span><span className="text-xs text-slate-500">{formatDate(new Date(log.createdAt), "dd MMM yyyy, hh:mm a")}</span></div>)}</div></CardContent></Card>
      </section>

      <Modal open={tenantOpen} onOpenChange={setTenantOpen} title={editingTenantId ? "Edit Tenant" : "Create Tenant"}><div className="space-y-3"><Input label="Organization name" value={tenantForm.name} onChange={(event) => setTenantForm({ ...tenantForm, name: event.target.value })} /><Input label="Slug" value={tenantForm.slug} onChange={(event) => setTenantForm({ ...tenantForm, slug: event.target.value })} /><Select label="Plan" value={tenantForm.plan} options={Object.values(Plan).map((plan) => ({ label: plan, value: plan }))} onChange={(event) => setTenantForm({ ...tenantForm, plan: event.target.value as Plan })} /><Input label="Primary domain" value={tenantForm.primaryDomain} onChange={(event) => setTenantForm({ ...tenantForm, primaryDomain: event.target.value })} /><Input label="Support email" type="email" value={tenantForm.supportEmail} onChange={(event) => setTenantForm({ ...tenantForm, supportEmail: event.target.value })} /><div className="grid grid-cols-2 gap-3"><Input label="Timezone" value={tenantForm.timezone} onChange={(event) => setTenantForm({ ...tenantForm, timezone: event.target.value })} /><Input label="Country" value={tenantForm.country} onChange={(event) => setTenantForm({ ...tenantForm, country: event.target.value })} /></div><button type="button" className={`w-full rounded-lg border p-3 text-sm font-semibold ${tenantForm.isWhiteLabel ? "border-primary bg-primary/5 text-primary" : "border-slate-200"}`} onClick={() => setTenantForm({ ...tenantForm, isWhiteLabel: !tenantForm.isWhiteLabel })}>White-label {tenantForm.isWhiteLabel ? "enabled" : "disabled"}</button><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setTenantOpen(false)}>Cancel</Button><Button onClick={() => void saveTenant()} disabled={saving}>{saving ? "Saving..." : "Save Tenant"}</Button></div></div></Modal>

      <Modal open={rejectingJob !== null} onOpenChange={(open) => !open && setRejectingJob(null)} title="Reject Job"><div className="space-y-3"><Textarea label="Reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRejectingJob(null)}>Cancel</Button><Button variant="destructive" onClick={async () => { if (!rejectingJob || !rejectReason.trim()) { toast.error("A rejection reason is required."); return; } try { await rejectJob(rejectingJob.id, rejectReason.trim()); toast.success("Job rejected with feedback."); setRejectingJob(null); setRejectReason(""); await load(); } catch (rejectError) { toast.error(rejectError instanceof Error ? rejectError.message : "Unable to reject job."); } }}>Reject Job</Button></div></div></Modal>
    </div>
  );
}
