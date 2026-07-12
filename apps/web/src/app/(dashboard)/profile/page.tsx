"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, Input, Select, Textarea } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { FileUpload } from "@/components/common/FileUpload";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { getProfile, updateProfile, uploadAvatar } from "@/lib/api/users.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { ROUTES } from "@/lib/utils/routes";
import { formatDate, getInitials, getRoleLabel } from "@campushire/utils";
import { BookOpen, Briefcase, FileText, Folder, Sparkles, UserCircle2 } from "lucide-react";
import { SkillLevel, type ProfileVisibility, type UserRole } from "@campushire/types";

type TabKey = "overview" | "edit" | "education" | "experience" | "skills" | "documents";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "edit", label: "Edit Profile" },
  { key: "education", label: "Education" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "documents", label: "Documents" }
];

interface SkillItem {
  name: string;
  level: SkillLevel;
}

const getSkillsFromProfile = (profile: ReturnType<typeof useAuthStore.getState>["user"]): SkillItem[] => {
  const source = profile?.studentProfile?.skills ?? profile?.jobSeekerProfile?.skills;
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];

  return Object.entries(source as Record<string, unknown>).map(([name, level]) => ({
    name,
      level:
      level === SkillLevel.BEGINNER || level === SkillLevel.ADVANCED
        ? (level as SkillLevel)
        : SkillLevel.INTERMEDIATE
  }));
};

export default function ProfilePage() {
  const setAuthUser = useAuthStore((state) => state.setUser);
  const authUser = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState(authUser);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>(SkillLevel.INTERMEDIATE);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("COLLEGE_ONLY");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const result = await getProfile();
        if (!active) return;

        setProfile(result);
        setAuthUser(result);
        setSkills(getSkillsFromProfile(result));
        setFirstName(result.firstName ?? "");
        setLastName(result.lastName ?? "");
        setPhone(result.phone ?? "");
        setBio(result.bio ?? "");
        setVisibility((result.profileVisibility as ProfileVisibility) ?? "COLLEGE_ONLY");
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Unable to fetch profile.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [setAuthUser]);

  const role = profile?.role as UserRole | undefined;
  const isStudentTrack = role === "STUDENT" || role === "JOB_SEEKER";

  const saveCoreProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await updateProfile({
        firstName,
        lastName,
        phone,
        bio,
        profileVisibility: visibility
      });

      setProfile(updated);
      setAuthUser(updated);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const saveSkills = async (nextSkills: SkillItem[]) => {
    if (!profile || !isStudentTrack) return;

    const payload = nextSkills.reduce<Record<string, string>>((acc, skill) => {
      acc[skill.name] = skill.level;
      return acc;
    }, {});

    setSaving(true);
    setError(null);

    try {
      const updated =
        role === "STUDENT"
          ? await updateProfile({ studentProfile: { skills: payload } })
          : await updateProfile({ jobSeekerProfile: { skills: payload } });
      setProfile(updated);
      setAuthUser(updated);
      setSkills(nextSkills);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save skills.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = async () => {
    const normalized = newSkill.trim();
    if (!normalized) return;
    if (skills.some((skill) => skill.name.toLowerCase() === normalized.toLowerCase())) {
      setNewSkill("");
      return;
    }
    const next = [...skills, { name: normalized, level: newSkillLevel }];
    await saveSkills(next);
    setNewSkill("");
  };

  const removeSkill = async (name: string) => {
    const next = skills.filter((skill) => skill.name !== name);
    await saveSkills(next);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    setError(null);
    try {
      const result = await uploadAvatar(file);
      // Update profile with new avatar URL
      const updated = { ...profile!, avatarUrl: result.avatarUrl };
      setProfile(updated);
      setAuthUser(updated);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Unable to upload avatar.";
      setError(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const overviewStats = useMemo(() => {
    const careerScore = profile?.studentProfile?.careerScore ?? profile?.jobSeekerProfile?.careerScore ?? 0;
    const totalApplications = profile?.candidateExperiences?.length ?? 0;
    const projects = profile?.candidateProjects?.length ?? 0;
    return { careerScore, totalApplications, projects };
  }, [profile]);

  if (loading) {
    return <LoadingSkeleton variant="profile" count={1} />;
  }

  if (!profile) {
    return (
      <EmptyState
        icon={UserCircle2}
        title="Profile unavailable"
        description="We could not load your profile right now."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Review and manage your account information"
        actions={
          <Button onClick={() => void saveCoreProfile()} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              activeTab === tab.key
                ? "bg-accent text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-accent/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <Card>
          <CardContent className="p-6">
            <div className="rounded-xl bg-gradient-to-r from-primary to-accent p-6 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/50" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
                      {getInitials(profile.firstName, profile.lastName)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h2>
                    <p className="text-sm text-slate-100">{getRoleLabel(profile.role)}</p>
                    <p className="text-xs text-slate-200">TIN: {profile.tin}</p>
                  </div>
                </div>
                <Badge variant="info">{profile.profileVisibility}</Badge>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-700">{profile.bio || "Your profile summary will appear here."}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Career Score</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{overviewStats.careerScore}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Experience Entries</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{overviewStats.totalApplications}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Projects</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{overviewStats.projects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "edit" ? (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Profile Picture</h2>
              <div className="flex items-center gap-4">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600">
                    {getInitials(profile.firstName, profile.lastName)}
                  </div>
                )}
                <div className="flex-1">
                  <FileUpload
                    accept="image/*"
                    maxSizeMB={5}
                    onUpload={handleAvatarUpload}
                  />
                  {uploadingAvatar ? <p className="mt-2 text-sm text-slate-600">Uploading...</p> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                <Input label="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </div>
              <Input label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              <Textarea label="Bio" value={bio} onChange={(event) => setBio(event.target.value)} />

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Profile Visibility</p>
                <div className="flex flex-wrap gap-2">
                  {(["PUBLIC", "COLLEGE_ONLY", "PRIVATE"] as ProfileVisibility[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVisibility(value)}
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
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeTab === "education" ? (
        <Card>
          <CardContent className="p-6">
            {profile.candidateEducations && profile.candidateEducations.length > 0 ? (
              <div className="space-y-3">
                {profile.candidateEducations.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{item.institution}</p>
                    <p className="text-sm text-slate-600">{item.degree} {item.fieldOfStudy ? `- ${item.fieldOfStudy}` : ""}</p>
                    <p className="text-xs text-slate-500">
                      {item.startDate ? formatDate(new Date(item.startDate)) : "N/A"} to{" "}
                      {item.endDate ? formatDate(new Date(item.endDate)) : "Present"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No education entries"
                description="Education records will appear here when available in your account history."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "experience" ? (
        <Card>
          <CardContent className="p-6">
            {profile.candidateExperiences && profile.candidateExperiences.length > 0 ? (
              <div className="space-y-3">
                {profile.candidateExperiences.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{item.companyName}</p>
                    <p className="text-sm text-slate-600">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      {item.startDate ? formatDate(new Date(item.startDate)) : "N/A"} to{" "}
                      {item.endDate ? formatDate(new Date(item.endDate)) : "Present"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No experience entries"
                description="Experience entries will appear here when available in your account history."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "skills" ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            {isStudentTrack ? (
              <>
                <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto]">
                  <Input
                    label="Skill"
                    value={newSkill}
                    onChange={(event) => setNewSkill(event.target.value)}
                    placeholder="e.g. React, Python, Communication"
                  />
                  <Select
                    label="Level"
                    value={newSkillLevel}
                    onChange={(event) => setNewSkillLevel(event.target.value as SkillLevel)}
                    options={[
                      { label: "Beginner", value: SkillLevel.BEGINNER },
                      { label: "Intermediate", value: SkillLevel.INTERMEDIATE },
                      { label: "Advanced", value: SkillLevel.ADVANCED }
                    ]}
                  />
                  <div className="sm:pt-7">
                    <Button type="button" onClick={() => void addSkill()} disabled={saving}>
                      Add
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <button
                      key={skill.name}
                      type="button"
                      onClick={() => void removeSkill(skill.name)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700"
                    >
                      {skill.name} ({skill.level})
                    </button>
                  ))}
                </div>

                {skills.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="No skills yet"
                    description="Add your strengths to improve recommendations and visibility."
                  />
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Skills are role-specific"
                description="Skill editing is available for student and job seeker accounts."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "documents" ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Folder}
              title="Documents workspace"
              description="Document management is available from your role dashboard documents section."
              action={{ label: "Open Documents", href: ROUTES.documents }}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={() => void saveCoreProfile()} disabled={saving}>
          <FileText className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
