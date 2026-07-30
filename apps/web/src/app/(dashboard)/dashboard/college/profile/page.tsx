"use client";

import { useEffect, useState } from "react";
import { Building2, Save, ShieldAlert } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Select, Textarea } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { getProfile, updateProfile } from "@/lib/api/users.api";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/store/auth.store";
import { SubRole } from "@campushire/types";
import { toast } from "sonner";

const NAAC_GRADES = [
  { label: "A++", value: "A++" },
  { label: "A+", value: "A+" },
  { label: "A", value: "A" },
  { label: "B++", value: "B++" },
  { label: "B+", value: "B+" },
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "D", value: "D" },
  { label: "Not Accredited / NA", value: "NA" }
];

export default function EditCollegeProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [naacGrade, setNaacGrade] = useState("A+");
  const [streamsStr, setStreamsStr] = useState("");
  const [website, setWebsite] = useState("");
  const [placementEmail, setPlacementEmail] = useState("");
  const [placementPhone, setPlacementPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [about, setAbout] = useState("");
  const [openForPlacement, setOpenForPlacement] = useState(true);

  // Is Owner (College Admin Owner vs TPO/Asst TPO/Coordinator sub-roles)
  const isOwner = !user?.subRole || user?.subRole === SubRole.OWNER;

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      const cp = data.collegeProfileManaged;
      if (cp) {
        setName(cp.name || "");
        setNaacGrade(cp.naacGrade || "A+");
        setWebsite(cp.website || "");
        setPlacementEmail(cp.placementEmail || "");
        setPlacementPhone(cp.placementPhone || "");
        setAddress(cp.address || "");
        setCity(cp.city || "");
        setState(cp.state || "");
        setPincode(cp.pincode || "");
        setAbout(cp.about || "");
        setOpenForPlacement(cp.openForPlacement !== false);

        if (Array.isArray(cp.streams)) {
          setStreamsStr(cp.streams.join(", "));
        } else if (cp.streams && typeof cp.streams === "object") {
          setStreamsStr(Object.keys(cp.streams).join(", "));
        } else {
          setStreamsStr("");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load college profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleSave = async () => {
    if (!isOwner) {
      toast.error("Only College Admin (Owner) can edit college profile.");
      return;
    }

    if (!name.trim()) {
      toast.error("College name is required.");
      return;
    }

    setSaving(true);
    try {
      const streamsArray = streamsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        collegeProfile: {
          name: name.trim(),
          naacGrade: naacGrade || undefined,
          streams: streamsArray,
          website: website.trim() || undefined,
          placementEmail: placementEmail.trim() || undefined,
          placementPhone: placementPhone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          pincode: pincode.trim() || undefined,
          about: about.trim() || undefined,
          openForPlacement
        }
      };

      const updatedUser = await updateProfile(payload);
      if (updatedUser) {
        useAuthStore.getState().setUser(updatedUser);
        const cp = updatedUser.collegeProfileManaged;
        if (cp) {
          setName(cp.name || "");
          setNaacGrade(cp.naacGrade || "A+");
          setWebsite(cp.website || "");
          setPlacementEmail(cp.placementEmail || "");
          setPlacementPhone(cp.placementPhone || "");
          setAddress(cp.address || "");
          setCity(cp.city || "");
          setState(cp.state || "");
          setPincode(cp.pincode || "");
          setAbout(cp.about || "");
          setOpenForPlacement(cp.openForPlacement !== false);
          if (Array.isArray(cp.streams)) {
            setStreamsStr(cp.streams.join(", "));
          } else if (cp.streams && typeof cp.streams === "object") {
            setStreamsStr(Object.keys(cp.streams).join(", "));
          }
        }
      }
      toast.success("College profile updated successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update college profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="profile" count={1} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadProfile()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Profile"
        subtitle="Manage institution details, NAAC accreditation, contact info, and placement settings."
        actions={
          isOwner ? (
            <Button onClick={() => void handleSave()} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          ) : undefined
        }
      />

      {!isOwner && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold">Read-Only Mode</p>
            <p className="text-amber-700">
              You are logged in as <strong>{user?.subRole || "Staff"}</strong>. Only the primary College Admin (Owner) can edit college profile details.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Institution Identity</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">College / University Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwner || saving}
                placeholder="e.g. Indian Institute of Technology Delhi"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">NAAC Grade / Accreditation</label>
              <Select
                value={naacGrade}
                onChange={(e) => setNaacGrade(e.target.value)}
                options={NAAC_GRADES}
                disabled={!isOwner || saving}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Description / About Institution</label>
            <Textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              disabled={!isOwner || saving}
              placeholder="Provide an overview of your college, achievements, and placement statistics..."
              className="h-28"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Streams / Departments Offered (Comma Separated)</label>
            <Input
              value={streamsStr}
              onChange={(e) => setStreamsStr(e.target.value)}
              disabled={!isOwner || saving}
              placeholder="e.g. Computer Science, Electrical Engineering, Mechanical, Civil"
            />
            <p className="mt-1 text-xs text-slate-500">Separate multiple departments with commas.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Contact & Location Information</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Placement Contact Email</label>
              <Input
                type="email"
                value={placementEmail}
                onChange={(e) => setPlacementEmail(e.target.value)}
                disabled={!isOwner || saving}
                placeholder="placements@college.edu"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Placement Contact Phone</label>
              <Input
                value={placementPhone}
                onChange={(e) => setPlacementPhone(e.target.value)}
                disabled={!isOwner || saving}
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Official Website URL</label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!isOwner || saving}
                placeholder="https://www.college.edu"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Street Address</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!isOwner || saving}
              placeholder="Campus Address, Hauz Khas"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">City</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!isOwner || saving}
                placeholder="New Delhi"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">State</label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={!isOwner || saving}
                placeholder="Delhi"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Pincode</label>
              <Input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                disabled={!isOwner || saving}
                placeholder="110016"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Open for Placement Drives</p>
              <p className="text-xs text-slate-500">Allow corporate recruiters to send connection requests and post job opportunities to your students.</p>
            </div>
            <button
              type="button"
              disabled={!isOwner || saving}
              onClick={() => setOpenForPlacement((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                openForPlacement ? "bg-emerald-600" : "bg-slate-300"
              } ${!isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  openForPlacement ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {isOwner && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button onClick={() => void handleSave()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
