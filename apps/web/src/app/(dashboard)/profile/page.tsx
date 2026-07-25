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
import { BookOpen, Briefcase, FileText, Folder, Sparkles, UserCircle2, Trash } from "lucide-react";
import { SkillLevel, type ProfileVisibility, type UserRole } from "@campushire/types";
import { toast } from "sonner";

type TabKey = "overview" | "edit" | "education" | "experience" | "skills" | "documents" | "projects";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "edit", label: "Edit Profile" },
  { key: "education", label: "Education" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "documents", label: "Documents" },
  { key: "projects", label: "Projects" }
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

  // Job Seeker Profile fields
  const [city, setCity] = useState("");
  const [expectedCtcMin, setExpectedCtcMin] = useState("");
  const [expectedCtcMax, setExpectedCtcMax] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [isOpenToWork, setIsOpenToWork] = useState(false);

  // Education Form fields
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduField, setEduField] = useState("");
  const [eduStart, setEduStart] = useState("");
  const [eduEnd, setEduEnd] = useState("");
  const [eduGrade, setEduGrade] = useState("");
  const [eduDesc, setEduDesc] = useState("");

  // Experience Form fields
  const [expCompany, setExpCompany] = useState("");
  const [expTitle, setExpTitle] = useState("");
  const [expType, setExpType] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [expIsCurrent, setExpIsCurrent] = useState(false);
  const [expLocation, setExpLocation] = useState("");
  const [expDesc, setExpDesc] = useState("");

  // Project Form fields
  const [projTitle, setProjTitle] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [projRepoUrl, setProjRepoUrl] = useState("");
  const [projStart, setProjStart] = useState("");
  const [projEnd, setProjEnd] = useState("");

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
        if (result.jobSeekerProfile) {
          setCity(result.jobSeekerProfile.currentCity ?? "");
          setExpectedCtcMin(result.jobSeekerProfile.expectedCtcMin ? String(result.jobSeekerProfile.expectedCtcMin) : "");
          setExpectedCtcMax(result.jobSeekerProfile.expectedCtcMax ? String(result.jobSeekerProfile.expectedCtcMax) : "");
          setIsOpenToWork(Boolean(result.jobSeekerProfile.isOpenToWork));
          if (result.jobSeekerProfile.availableFrom) {
            setAvailableFrom(new Date(result.jobSeekerProfile.availableFrom).toISOString().slice(0, 10));
          }
        }
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
      const payload: any = {
        firstName,
        lastName,
        phone,
        bio,
        profileVisibility: visibility
      };
      if (role === "JOB_SEEKER") {
        payload.jobSeekerProfile = {
          currentCity: city || undefined,
          expectedCtcMin: expectedCtcMin ? Number(expectedCtcMin) : undefined,
          expectedCtcMax: expectedCtcMax ? Number(expectedCtcMax) : undefined,
          availableFrom: availableFrom ? new Date(availableFrom) : undefined,
          isOpenToWork
        };
      }
      const updated = await updateProfile(payload);

      setProfile(updated);
      setAuthUser(updated);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEducation = async () => {
    if (!eduInstitution || !eduDegree) {
      toast.error("Institution and Degree are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({
        candidateEducations: [
          {
            institution: eduInstitution,
            degree: eduDegree,
            fieldOfStudy: eduField || undefined,
            startDate: eduStart ? new Date(eduStart) : undefined,
            endDate: eduEnd ? new Date(eduEnd) : undefined,
            grade: eduGrade || undefined,
            description: eduDesc || undefined
          }
        ]
      });
      setProfile(updated);
      setAuthUser(updated);
      setEduInstitution("");
      setEduDegree("");
      setEduField("");
      setEduStart("");
      setEduEnd("");
      setEduGrade("");
      setEduDesc("");
      toast.success("Education added.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to add education.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        candidateEducations: [{ id, institution: "", degree: "", _delete: true }]
      });
      setProfile(updated);
      setAuthUser(updated);
      toast.success("Education deleted.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to delete education.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExperience = async () => {
    if (!expCompany || !expTitle) {
      toast.error("Company Name and Title are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({
        candidateExperiences: [
          {
            companyName: expCompany,
            title: expTitle,
            employmentType: expType || undefined,
            startDate: expStart ? new Date(expStart) : undefined,
            endDate: expEnd ? new Date(expEnd) : undefined,
            isCurrent: expIsCurrent,
            location: expLocation || undefined,
            description: expDesc || undefined
          }
        ]
      });
      setProfile(updated);
      setAuthUser(updated);
      setExpCompany("");
      setExpTitle("");
      setExpType("");
      setExpStart("");
      setExpEnd("");
      setExpIsCurrent(false);
      setExpLocation("");
      setExpDesc("");
      toast.success("Experience added.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to add experience.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        candidateExperiences: [{ id, companyName: "", title: "", _delete: true }]
      });
      setProfile(updated);
      setAuthUser(updated);
      toast.success("Experience deleted.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to delete experience.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddProject = async () => {
    if (!projTitle) {
      toast.error("Project Title is required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({
        candidateProjects: [
          {
            title: projTitle,
            description: projDesc || undefined,
            projectUrl: projUrl || undefined,
            repositoryUrl: projRepoUrl || undefined,
            startDate: projStart ? new Date(projStart) : undefined,
            endDate: projEnd ? new Date(projEnd) : undefined
          }
        ]
      });
      setProfile(updated);
      setAuthUser(updated);
      setProjTitle("");
      setProjDesc("");
      setProjUrl("");
      setProjRepoUrl("");
      setProjStart("");
      setProjEnd("");
      toast.success("Project added.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to add project.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        candidateProjects: [{ id, title: "", _delete: true }]
      });
      setProfile(updated);
      setAuthUser(updated);
      toast.success("Project deleted.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to delete project.");
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

          {role === "JOB_SEEKER" ? (
            <Card>
              <CardContent className="space-y-4 p-6">
                <h2 className="text-lg font-semibold text-slate-900">Job Seeker Details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Current City" value={city} onChange={(event) => setCity(event.target.value)} />
                  <Input
                    label="Expected Salary Min (INR)"
                    type="number"
                    value={expectedCtcMin}
                    onChange={(event) => setExpectedCtcMin(event.target.value)}
                  />
                  <Input
                    label="Expected Salary Max (INR)"
                    type="number"
                    value={expectedCtcMax}
                    onChange={(event) => setExpectedCtcMax(event.target.value)}
                  />
                  <Input
                    label="Available From / Notice Period Date"
                    type="date"
                    value={availableFrom}
                    onChange={(event) => setAvailableFrom(event.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Open to Work</p>
                    <p className="text-xs text-slate-500">Makes your profile visible in recruiter searches</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpenToWork((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isOpenToWork ? "bg-accent" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isOpenToWork ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {activeTab === "education" ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Education History</h2>
              {profile.candidateEducations && profile.candidateEducations.length > 0 ? (
                <div className="space-y-3">
                  {profile.candidateEducations.map((item) => (
                    <div key={item.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.institution}</p>
                        <p className="text-sm text-slate-600">{item.degree} {item.fieldOfStudy ? `- ${item.fieldOfStudy}` : ""}</p>
                        {item.grade ? <p className="text-xs text-slate-500">Grade: {item.grade}</p> : null}
                        {item.description ? <p className="mt-1 text-xs text-slate-600">{item.description}</p> : null}
                        <p className="text-xs text-slate-500 mt-1">
                          {item.startDate ? formatDate(new Date(item.startDate)) : "N/A"} to{" "}
                          {item.endDate ? formatDate(new Date(item.endDate)) : "Present"}
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => void handleDeleteEducation(item.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="No education entries"
                  description="Add your educational qualifications below."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Add Education Entry</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Institution" value={eduInstitution} onChange={(event) => setEduInstitution(event.target.value)} placeholder="e.g. Stanford University" />
                <Input label="Degree" value={eduDegree} onChange={(event) => setEduDegree(event.target.value)} placeholder="e.g. Bachelor of Science" />
                <Input label="Field of Study" value={eduField} onChange={(event) => setEduField(event.target.value)} placeholder="e.g. Computer Science" />
                <Input label="Grade / GPA" value={eduGrade} onChange={(event) => setEduGrade(event.target.value)} placeholder="e.g. 3.8/4.0" />
                <Input label="Start Date" type="date" value={eduStart} onChange={(event) => setEduStart(event.target.value)} />
                <Input label="End Date" type="date" value={eduEnd} onChange={(event) => setEduEnd(event.target.value)} />
              </div>
              <Textarea label="Description / Highlights" value={eduDesc} onChange={(event) => setEduDesc(event.target.value)} placeholder="Honors, activities, etc." />
              <div className="flex justify-end">
                <Button onClick={() => void handleAddEducation()} disabled={saving}>
                  Add Education
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "experience" ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Work Experience</h2>
              {profile.candidateExperiences && profile.candidateExperiences.length > 0 ? (
                <div className="space-y-3">
                  {profile.candidateExperiences.map((item) => (
                    <div key={item.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.companyName}</p>
                        <p className="text-sm text-slate-600">{item.title} {item.employmentType ? `(${item.employmentType})` : ""}</p>
                        {item.location ? <p className="text-xs text-slate-500">Location: {item.location}</p> : null}
                        {item.description ? <p className="mt-1 text-xs text-slate-600">{item.description}</p> : null}
                        <p className="text-xs text-slate-500 mt-1">
                          {item.startDate ? formatDate(new Date(item.startDate)) : "N/A"} to{" "}
                          {item.isCurrent ? "Present" : (item.endDate ? formatDate(new Date(item.endDate)) : "Present")}
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => void handleDeleteExperience(item.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Briefcase}
                  title="No experience entries"
                  description="Add your professional experiences below."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Add Experience Entry</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Company Name" value={expCompany} onChange={(event) => setExpCompany(event.target.value)} placeholder="e.g. Google" />
                <Input label="Role / Title" value={expTitle} onChange={(event) => setExpTitle(event.target.value)} placeholder="e.g. Software Engineer" />
                <Input label="Employment Type" value={expType} onChange={(event) => setExpType(event.target.value)} placeholder="e.g. Full-time, Internship" />
                <Input label="Location" value={expLocation} onChange={(event) => setExpLocation(event.target.value)} placeholder="e.g. Mountain View, CA" />
                <Input label="Start Date" type="date" value={expStart} onChange={(event) => setExpStart(event.target.value)} />
                <Input label="End Date" type="date" value={expEnd} onChange={(event) => setExpEnd(event.target.value)} disabled={expIsCurrent} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="expIsCurrent"
                  checked={expIsCurrent}
                  onChange={(event) => setExpIsCurrent(event.target.checked)}
                  className="rounded border-slate-300 text-accent focus:ring-accent"
                />
                <label htmlFor="expIsCurrent" className="text-sm font-medium text-slate-700">
                  I currently work here
                </label>
              </div>
              <Textarea label="Role Description" value={expDesc} onChange={(event) => setExpDesc(event.target.value)} placeholder="Describe your key responsibilities and accomplishments." />
              <div className="flex justify-end">
                <Button onClick={() => void handleAddExperience()} disabled={saving}>
                  Add Experience
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "projects" ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Projects Portfolio</h2>
              {profile.candidateProjects && profile.candidateProjects.length > 0 ? (
                <div className="space-y-3">
                  {profile.candidateProjects.map((item) => (
                    <div key={item.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        {item.description ? <p className="text-sm text-slate-600 mt-1">{item.description}</p> : null}
                        <div className="flex gap-4 mt-2 text-xs">
                          {item.projectUrl ? (
                            <a href={item.projectUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                              Live Demo
                            </a>
                          ) : null}
                          {item.repositoryUrl ? (
                            <a href={item.repositoryUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                              Repository
                            </a>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {item.startDate ? formatDate(new Date(item.startDate)) : "N/A"} to{" "}
                          {item.endDate ? formatDate(new Date(item.endDate)) : "Present"}
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => void handleDeleteProject(item.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Folder}
                  title="No projects listed"
                  description="Add your personal or professional projects below."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Add Project Entry</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Project Title" value={projTitle} onChange={(event) => setProjTitle(event.target.value)} placeholder="e.g. Portfolio Website" />
                <Input label="Project URL" value={projUrl} onChange={(event) => setProjUrl(event.target.value)} placeholder="https://myproject.com" />
                <Input label="Repository URL" value={projRepoUrl} onChange={(event) => setProjRepoUrl(event.target.value)} placeholder="https://github.com/myproject" />
                <Input label="Start Date" type="date" value={projStart} onChange={(event) => setProjStart(event.target.value)} />
                <Input label="End Date" type="date" value={projEnd} onChange={(event) => setProjEnd(event.target.value)} />
              </div>
              <Textarea label="Project Description" value={projDesc} onChange={(event) => setProjDesc(event.target.value)} placeholder="Brief description of project goal and stack used." />
              <div className="flex justify-end">
                <Button onClick={() => void handleAddProject()} disabled={saving}>
                  Add Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
