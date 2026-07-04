"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Shield, Trash2 } from "lucide-react";
import { NotificationChannel, NotificationType, UserRole, type NotificationPreference, type ProfileVisibility } from "@campushire/types";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/store/auth.store";
import { forgotPassword } from "@/lib/api/auth.api";
import { getPreferences, updatePreferences } from "@/lib/api/notifications.api";
import { updateProfile } from "@/lib/api/users.api";

interface PreferenceCell {
  type: NotificationType;
  channel: NotificationChannel;
  isEnabled: boolean;
}

const rows: Array<{ label: string; type: NotificationType }> = [
  { label: "Application Updates", type: NotificationType.APPLICATION_STATUS },
  { label: "Interview Reminders", type: NotificationType.INTERVIEW_SCHEDULED },
  { label: "Job Matches", type: NotificationType.JOB_MATCH },
  { label: "Messages", type: NotificationType.MESSAGE_RECEIVED }
];

const channels: NotificationChannel[] = [
  NotificationChannel.IN_APP,
  NotificationChannel.EMAIL,
  NotificationChannel.WHATSAPP
];

const isPreferenceList = (
  value: NotificationPreference[] | NotificationPreference
): value is NotificationPreference[] => {
  return Array.isArray(value);
};

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { logout } = useAuth();

  const [prefs, setPrefs] = useState<PreferenceCell[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ProfileVisibility>("COLLEGE_ONLY");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (user?.profileVisibility) {
      setVisibility(user.profileVisibility as ProfileVisibility);
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoadingPrefs(true);
      setError(null);
      try {
        const result = await getPreferences();
        if (!active) return;

        const normalized = isPreferenceList(result) ? result : [result];

        const mapped: PreferenceCell[] = rows.flatMap((row) =>
          channels.map((channel) => {
            const existing = normalized.find((item) => item.type === row.type && item.channel === channel);
            return {
              type: row.type,
              channel,
              isEnabled: existing ? existing.isEnabled : channel !== NotificationChannel.WHATSAPP
            };
          })
        );

        setPrefs(mapped);
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Unable to fetch preferences.";
        setError(message);
      } finally {
        if (active) {
          setLoadingPrefs(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const matrix = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      cells: channels.map((channel) =>
        prefs.find((item) => item.type === row.type && item.channel === channel) ?? {
          type: row.type,
          channel,
          isEnabled: false
        }
      )
    }));
  }, [prefs]);

  const togglePreference = async (type: NotificationType, channel: NotificationChannel) => {
    const next = prefs.map((item) =>
      item.type === type && item.channel === channel ? { ...item, isEnabled: !item.isEnabled } : item
    );

    setPrefs(next);
    setSaving(true);
    setError(null);

    try {
      await updatePreferences({
        preferences: next.map((item) => ({
          type: item.type,
          channel: item.channel,
          isEnabled: item.isEnabled
        }))
      });
      setStatus("Notification preferences updated.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save preferences.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!user) return;

    setSendingReset(true);
    setError(null);

    try {
      await forgotPassword(user.email);
      setStatus("Password reset instructions sent to your email.");
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : "Unable to send reset email.";
      setError(message);
    } finally {
      setSendingReset(false);
    }
  };

  const saveVisibility = async (value: ProfileVisibility) => {
    if (!user) return;
    setVisibility(value);
    setSaving(true);
    setError(null);

    try {
      const updated = await updateProfile({ profileVisibility: value });
      setUser(updated);
      setStatus("Profile visibility updated.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to update visibility.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage security, notifications, and account preferences"
      />

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {status ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{status}</p> : null}

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Account Security</h2>
          </div>
          <Input label="Email" value={user?.email ?? ""} disabled />
          <Button className="mt-4" onClick={() => void requestPasswordReset()} disabled={sendingReset}>
            {sendingReset ? "Sending..." : "Send password reset link"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Notification Preferences</h2>
          </div>

          {loadingPrefs ? (
            <p className="text-sm text-slate-500">Loading preferences...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="py-3 pr-3">Category</th>
                    {channels.map((channel) => (
                      <th key={channel} className="px-3 py-3 text-center">{channel}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.type} className="border-b border-slate-100">
                      <td className="py-3 pr-3 text-sm font-medium text-slate-800">{row.label}</td>
                      {row.cells.map((cell) => (
                        <td key={`${cell.type}-${cell.channel}`} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => void togglePreference(cell.type, cell.channel)}
                            disabled={saving}
                            className={`h-6 w-11 rounded-full transition ${
                              cell.isEnabled ? "bg-accent" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                                cell.isEnabled ? "translate-x-5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {(user?.role === UserRole.STUDENT || user?.role === UserRole.JOB_SEEKER) ? (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">Profile Visibility</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["PUBLIC", "COLLEGE_ONLY", "PRIVATE"] as ProfileVisibility[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void saveVisibility(value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    visibility === value
                      ? "border-accent bg-accent-50 text-accent"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-rose-200">
        <CardContent className="p-6">
          <div className="mb-3 flex items-center gap-2 text-rose-700">
            <Trash2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Danger Zone</h2>
          </div>
          <p className="text-sm text-slate-600">
            You can sign out now and contact support to request account deactivation.
          </p>
          <Button variant="destructive" className="mt-4" onClick={() => setConfirmOpen(true)}>
            Deactivate Account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate account"
        description="This action signs you out now. Contact support for full deactivation processing."
        confirmLabel="Sign out"
        confirmVariant="destructive"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void logout();
        }}
      />
    </div>
  );
}
