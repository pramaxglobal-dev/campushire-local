"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Palette, Save } from "lucide-react";
import { Button, Card, CardContent, Input, Select } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { FileUpload } from "@/components/common/FileUpload";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { listTenants } from "@/lib/api/admin.api";
import {
  getConfig,
  publishConfig,
  unpublishConfig,
  uploadFavicon,
  uploadLogo,
  upsertConfig,
  type WhiteLabelConfigDto
} from "@/lib/api/whitelabel.api";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { toast } from "sonner";
import { UserRole, type Tenant } from "@campushire/types";
import { useAuthStore } from "@/lib/store/auth.store";

interface FormState {
  brandName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  subdomain: string;
  customDomain: string;
  senderName: string;
  senderEmail: string;
  showPoweredBy: boolean;
}

const defaultState: FormState = {
  brandName: "CampusHire",
  tagline: "The Future of Hiring, Today",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#1B3A6B",
  accentColor: "#0EA5E9",
  fontFamily: "Inter",
  subdomain: "",
  customDomain: "",
  senderName: "",
  senderEmail: "",
  showPoweredBy: true
};

const fontOptions = ["Inter", "Roboto", "Poppins", "Lato", "Open Sans", "Montserrat"];

export default function WhiteLabelPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [form, setForm] = useState<FormState>(defaultState);
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");

  const debouncedSubdomain = useDebounce(form.subdomain, 400);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSuperAdmin && !selectedTenantId) {
        setLoading(false);
        return;
      }
      const config = await getConfig(selectedTenantId || undefined);
      const tenantSettings = config.tenant?.settings && typeof config.tenant.settings === "object" && !Array.isArray(config.tenant.settings)
        ? (config.tenant.settings as Record<string, unknown>)
        : {};
      setForm({
        brandName: config.brandName ?? "CampusHire",
        tagline: typeof tenantSettings.tagline === "string" ? tenantSettings.tagline : "The Future of Hiring, Today",
        logoUrl: config.logoUrl ?? "",
        faviconUrl: "",
        primaryColor: config.primaryColor ?? "#1B3A6B",
        accentColor: config.accentColor ?? "#0EA5E9",
        fontFamily: config.fontFamily ?? "Inter",
        subdomain: config.tenant?.slug ?? "",
        customDomain: config.customDomain ?? "",
        senderName: config.senderName ?? "",
        senderEmail: config.senderEmail ?? "",
        showPoweredBy: config.showPoweredBy ?? true
      });
      setIsLive(Boolean(config.tenant?.isWhiteLabel));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load branding config.");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, selectedTenantId]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void listTenants({ page: 1, limit: 100 }).then((response) => {
      const rows = response.data ?? [];
      setTenants(rows);
      setSelectedTenantId((current) => current || rows[0]?.id || "");
    }).catch((tenantError) => {
      setError(tenantError instanceof Error ? tenantError.message : "Unable to load tenants.");
      setLoading(false);
    });
  }, [isSuperAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const check = async () => {
      if (!isSuperAdmin) {
        setSubdomainStatus("idle");
        return;
      }
      if (!debouncedSubdomain.trim()) {
        setSubdomainStatus("idle");
        return;
      }
      setSubdomainStatus("checking");
      try {
        const response = await listTenants({ search: debouncedSubdomain.trim(), page: 1, limit: 10 });
        const exactMatch = (response.data ?? []).some((tenant) => tenant.slug === debouncedSubdomain.trim());
        setSubdomainStatus(exactMatch ? "unavailable" : "available");
      } catch {
        setSubdomainStatus("idle");
      }
    };
    void check();
  }, [debouncedSubdomain, isSuperAdmin]);

  const onSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const payload: WhiteLabelConfigDto = {
        tenantId: selectedTenantId || undefined,
        brandName: form.brandName,
        tagline: form.tagline,
        subdomain: form.subdomain,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        fontFamily: form.fontFamily,
        customDomain: form.customDomain || undefined,
        senderName: form.senderName || undefined,
        senderEmail: form.senderEmail || undefined,
        showPoweredBy: form.showPoweredBy
      };
      await upsertConfig(payload);
      toast.success("White-label configuration saved.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async (): Promise<void> => {
    setPublishing(true);
    try {
      await publishConfig(selectedTenantId || undefined);
      setIsLive(true);
      toast.success("Branding configuration published.");
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "Unable to publish configuration.");
    } finally {
      setPublishing(false);
    }
  };

  const onUnpublish = async (): Promise<void> => {
    setPublishing(true);
    try {
      await unpublishConfig(selectedTenantId || undefined);
      setIsLive(false);
      toast.success("Branding configuration unpublished.");
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "Unable to unpublish configuration.");
    } finally {
      setPublishing(false);
    }
  };

  const onPreviewNewTab = (): void => {
    const params = new URLSearchParams({
      preview: "true",
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      font: form.fontFamily,
      brand: form.brandName,
      logo: form.logoUrl
    });
    window.open(`/login?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const subdomainLabel = useMemo(() => {
    if (subdomainStatus === "checking") return "Checking availability...";
    if (subdomainStatus === "available") return "Subdomain available";
    if (subdomainStatus === "unavailable") return "Subdomain already in use";
    return isSuperAdmin ? "Enter a unique tenant subdomain." : "Saving updates your organization subdomain.";
  }, [isSuperAdmin, subdomainStatus]);

  if (loading) {
    return <LoadingSkeleton variant="card" count={4} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="White Label Management" subtitle="Customize tenant branding, domains, and email identity." />

      {isSuperAdmin ? (
        <Card>
          <CardContent className="p-5">
            <Select
              label="Tenant"
              value={selectedTenantId}
              options={tenants.map((tenant) => ({ label: `${tenant.name} (${tenant.slug})`, value: tenant.id }))}
              onChange={(event) => setSelectedTenantId(event.target.value)}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-5 p-6">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Brand Identity</h2>
              <FileUpload
                accept="image/*"
                maxSizeMB={5}
                onUpload={async (file) => {
                  const result = await uploadLogo(file, selectedTenantId || undefined);
                  setForm((prev) => ({ ...prev, logoUrl: result.url }));
                  toast.success("Logo uploaded.");
                }}
              />
              <FileUpload
                accept="image/x-icon,image/png,image/svg+xml"
                maxSizeMB={2}
                onUpload={async (file) => {
                  const result = await uploadFavicon(file, selectedTenantId || undefined);
                  setForm((prev) => ({ ...prev, faviconUrl: result.url }));
                  toast.success("Favicon uploaded.");
                }}
              />
              <Input
                label="Brand Name"
                value={form.brandName}
                onChange={(event) => setForm((prev) => ({ ...prev, brandName: event.target.value }))}
              />
              <Input
                label="Tagline"
                value={form.tagline}
                onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Colors</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      aria-label="Primary color picker"
                      className="h-10 w-14 rounded-md border border-slate-300 p-1"
                      value={form.primaryColor}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, primaryColor: event.target.value }))
                      }
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, primaryColor: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      aria-label="Accent color picker"
                      className="h-10 w-14 rounded-md border border-slate-300 p-1"
                      value={form.accentColor}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, accentColor: event.target.value }))
                      }
                    />
                    <Input
                      value={form.accentColor}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, accentColor: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Typography</h2>
              <Select
                label="Font Family"
                value={form.fontFamily}
                options={fontOptions.map((font) => ({ label: font, value: font }))}
                onChange={(event) => setForm((prev) => ({ ...prev, fontFamily: event.target.value }))}
              />
              <p className="text-sm text-slate-600" style={{ fontFamily: form.fontFamily }}>
                Preview: The Future of Hiring, Today
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Domain</h2>
              <Input
                label="Subdomain"
                value={form.subdomain}
                helperText={`${subdomainLabel} (${form.subdomain || "your-name"}.campushire.in)`}
                onChange={(event) => setForm((prev) => ({ ...prev, subdomain: event.target.value }))}
              />
              <Input
                label="Custom Domain"
                value={form.customDomain}
                helperText="Configure DNS CNAME to your tenant host. SSL status is managed by platform operations."
                onChange={(event) => setForm((prev) => ({ ...prev, customDomain: event.target.value }))}
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Show Powered by CampusHire</p>
                  <p className="text-xs text-slate-500">Show a small footer attribution on public pages.</p>
                </div>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    form.showPoweredBy
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, showPoweredBy: !prev.showPoweredBy }))
                  }
                >
                  {form.showPoweredBy ? "Enabled" : "Disabled"}
                </button>
              </div>
              <Input
                label="Email Sender Name"
                value={form.senderName}
                onChange={(event) => setForm((prev) => ({ ...prev, senderName: event.target.value }))}
              />
              <Input
                label="Email Sender Address"
                type="email"
                value={form.senderEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, senderEmail: event.target.value }))}
              />
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Live Preview</h2>
              <Button variant="outline" onClick={onPreviewNewTab}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview in New Tab
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white shadow-card">
                <div
                  className="rounded-t-xl px-5 py-4 text-white"
                  style={{ background: `linear-gradient(120deg, ${form.primaryColor}, ${form.accentColor})` }}
                >
                  <div className="flex items-center gap-2">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Brand logo preview" className="h-8 w-8 rounded bg-white p-1" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-white/90 text-primary">
                        <Palette className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{form.brandName}</p>
                      <p className="text-xs text-white/90">{form.tagline}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-5" style={{ fontFamily: form.fontFamily }}>
                  <Input label="Email" />
                  <Input label="Password" type="password" />
                  <Button type="button" className="w-full" style={{ backgroundColor: form.accentColor }} disabled title="Preview only">
                    Sign In
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-700">
                Status:
                <span className={`ml-2 rounded px-2 py-1 text-xs font-semibold ${isLive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                  {isLive ? "Live" : "Draft"}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-4 z-20 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => void onUnpublish()} disabled={publishing}>
            Unpublish
          </Button>
          <Button variant="outline" onClick={() => void onSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button onClick={() => void onPublish()} disabled={publishing}>
            {publishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
