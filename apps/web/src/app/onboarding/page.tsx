"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanySize, SkillLevel, UserRole, VendorType, WorkMode } from "@campushire/types";
import { Button, Card, CardContent, Input, Select, Textarea } from "@/components/ui";
import { FileUpload } from "@/components/common/FileUpload";
import { useAuthStore } from "@/lib/store/auth.store";
import { getProfile, updateProfile, uploadAvatar } from "@/lib/api/users.api";
import { getDashboardPathForRole } from "@/lib/utils/routes";

const steps = ["Basic Profile", "Role Details", "Preferences"];

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi"
];

interface SkillEntry {
  name: string;
  level: SkillLevel;
}

const parseCsv = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const skillsToRecord = (skills: SkillEntry[]): Record<string, string> =>
  skills.reduce<Record<string, string>>((acc, skill) => {
    acc[skill.name] = skill.level;
    return acc;
  }, {});

const toSuspendedState = (isActive: boolean, metadata: unknown): boolean => {
  if (!isActive) return true;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).isSuspended === true;
};

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");

  const [course, setCourse] = useState("");
  const [branch, setBranch] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 3);
  const [cgpa, setCgpa] = useState(7);
  const [rollNo, setRollNo] = useState("");

  const [currentCompany, setCurrentCompany] = useState("");
  const [experienceMonths, setExperienceMonths] = useState(0);
  const [noticeDays, setNoticeDays] = useState(30);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState<CompanySize>(CompanySize.SIZE_11_50);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [collegeName, setCollegeName] = useState("");
  const [naacGrade, setNaacGrade] = useState("");
  const [streams, setStreams] = useState("");
  const [totalIntake, setTotalIntake] = useState(100);
  const [establishedYear, setEstablishedYear] = useState(2000);

  const [agencyName, setAgencyName] = useState("");
  const [freelanceSpecializations, setFreelanceSpecializations] = useState("");
  const [freelanceExperienceYears, setFreelanceExperienceYears] = useState(2);

  const [vendorType, setVendorType] = useState<VendorType>(VendorType.DOCUMENT_VERIFIER);
  const [vendorCompanyName, setVendorCompanyName] = useState("");
  const [servicesOffered, setServicesOffered] = useState("");
  const [coverageAreas, setCoverageAreas] = useState("");

  const [trainingOrgName, setTrainingOrgName] = useState("");
  const [trainingSpecializations, setTrainingSpecializations] = useState("");
  const [trainingWebsite, setTrainingWebsite] = useState("");

  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(SkillLevel.INTERMEDIATE);
  const [preferredRoles, setPreferredRoles] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode>(WorkMode.ANY);
  const [salaryMinL, setSalaryMinL] = useState(3);
  const [salaryMaxL, setSalaryMaxL] = useState(8);

  const isStudentTrack = user?.role === UserRole.STUDENT || user?.role === UserRole.JOB_SEEKER;

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    let active = true;
    const loadProfile = async () => {
      try {
        const profile = await getProfile();
        if (!active) return;

        setBio(profile.bio ?? "");
        setPhone(profile.phone ?? "");

        if (profile.studentProfile) {
          setCourse(profile.studentProfile.program ?? "");
          setBranch(profile.studentProfile.department ?? "");
          setYearOfStudy(profile.studentProfile.yearOfStudy ?? 1);
          setGraduationYear(profile.studentProfile.graduationYear ?? graduationYear);
          setCgpa(profile.studentProfile.cgpa ?? 7);
          setRollNo(profile.studentProfile.enrollmentNumber ?? "");

          if (
            profile.studentProfile.skills &&
            typeof profile.studentProfile.skills === "object" &&
            !Array.isArray(profile.studentProfile.skills)
          ) {
            const mapped = Object.entries(profile.studentProfile.skills as Record<string, unknown>).map(
              ([name, level]) => ({
                name,
                level:
                  level === SkillLevel.BEGINNER || level === SkillLevel.ADVANCED
                    ? level
                    : SkillLevel.INTERMEDIATE
              })
            );
            setSkills(mapped);
          }
        }

        if (profile.jobSeekerProfile) {
          setExperienceMonths(profile.jobSeekerProfile.totalExperienceMonths ?? 0);
          setCity(profile.jobSeekerProfile.currentCity ?? "");
        }

        if (profile.recruiterProfile) {
          setCompanyName(profile.recruiterProfile.companyName ?? "");
          setIndustry(profile.recruiterProfile.industry ?? "");
          setCompanyWebsite(profile.recruiterProfile.website ?? "");
        }

        if (profile.collegeProfileManaged) {
          setCollegeName(profile.collegeProfileManaged.name ?? "");
          setNaacGrade(profile.collegeProfileManaged.naacGrade ?? "");
        }
      } catch {
        // Continue onboarding even if prefill call fails.
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [graduationYear, router, user]);

  const addSkill = () => {
    const normalized = skillName.trim();
    if (!normalized) return;
    if (skills.some((entry) => entry.name.toLowerCase() === normalized.toLowerCase())) {
      setSkillName("");
      return;
    }
    setSkills((prev) => [...prev, { name: normalized, level: skillLevel }]);
    setSkillName("");
  };

  const removeSkill = (name: string) => {
    setSkills((prev) => prev.filter((entry) => entry.name !== name));
  };

  const saveCurrentStep = async () => {
    if (!user) return;

    const location = [city.trim(), state.trim()].filter(Boolean).join(", ");

    if (step === 1) {
      const profile = await updateProfile({
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        recruiterProfile:
          user.role === UserRole.CORPORATE_RECRUITER
            ? { headquarters: location || undefined }
            : undefined,
        jobSeekerProfile:
          user.role === UserRole.JOB_SEEKER ? { currentCity: city.trim() || undefined } : undefined,
        studentProfile:
          user.role === UserRole.STUDENT
            ? { preferredLocations: location ? [location] : undefined }
            : undefined
      });

      setUser({ ...profile, isSuspended: toSuspendedState(profile.isActive, profile.metadata) });
      return;
    }

    if (step === 2) {
      const dto = (() => {
        if (user.role === UserRole.STUDENT) {
          return {
            studentProfile: {
              program: course || undefined,
              department: branch || undefined,
              yearOfStudy,
              graduationYear,
              cgpa,
              enrollmentNumber: rollNo || undefined
            }
          };
        }

        if (user.role === UserRole.JOB_SEEKER) {
          return {
            jobSeekerProfile: {
              totalExperienceMonths: experienceMonths,
              currentCity: city || undefined,
              resumeUrl: undefined,
              preferredLocations: location ? [location] : undefined,
              skills: undefined,
              expectedCtcMin: undefined,
              expectedCtcMax: undefined,
              preferredWorkMode: undefined,
              availableFrom: undefined
            }
          };
        }

        if (user.role === UserRole.CORPORATE_RECRUITER) {
          return {
            recruiterProfile: {
              companyName: companyName || undefined,
              industry: industry || undefined,
              website: companyWebsite || undefined,
              about: `Size: ${companySize}; GST: ${gstNumber || "N/A"}`
            }
          };
        }

        if (user.role === UserRole.COLLEGE_ADMIN) {
          return {
            collegeProfile: {
              name: collegeName || undefined,
              naacGrade: naacGrade || undefined,
              streams: parseCsv(streams),
              city: city || undefined,
              state: state || undefined,
              about: `Intake: ${totalIntake}; Established: ${establishedYear}`
            }
          };
        }

        if (user.role === UserRole.FREELANCE_RECRUITER) {
          return {
            freelanceRecruiterProfile: {
              agencyName: agencyName || undefined,
              specialization: parseCsv(freelanceSpecializations),
              defaultCommissionValue: freelanceExperienceYears
            }
          };
        }

        if (user.role === UserRole.VENDOR) {
          return {
            vendorProfile: {
              businessName: vendorCompanyName || undefined,
              serviceAreas: parseCsv(coverageAreas),
              about: `Type: ${vendorType}; Services: ${servicesOffered}`
            }
          };
        }

        return {
          trainingPartnerProfile: {
            organizationName: trainingOrgName || undefined,
            website: trainingWebsite || undefined,
            about: trainingSpecializations || undefined
          }
        };
      })();

      const profile = await updateProfile(dto);
      setUser({ ...profile, isSuspended: toSuspendedState(profile.isActive, profile.metadata) });
      return;
    }

    if (isStudentTrack) {
      const dto =
        user.role === UserRole.STUDENT
          ? {
              studentProfile: {
                skills: skillsToRecord(skills),
                preferredLocations: parseCsv(preferredLocations),
                preferredWorkMode: workMode,
                expectedCtcMin: salaryMinL * 100000,
                expectedCtcMax: salaryMaxL * 100000,
                portfolioUrl: preferredRoles.trim() || undefined
              }
            }
          : {
              jobSeekerProfile: {
                skills: skillsToRecord(skills),
                preferredLocations: parseCsv(preferredLocations),
                preferredWorkMode: workMode,
                expectedCtcMin: salaryMinL * 100000,
                expectedCtcMax: salaryMaxL * 100000
              }
            };

      const profile = await updateProfile(dto);
      setUser({ ...profile, isSuspended: toSuspendedState(profile.isActive, profile.metadata) });
    }
  };

  const handleNext = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveCurrentStep();
      if (step < 3) {
        setStep((value) => value + 1);
      } else if (user) {
        router.replace(getDashboardPathForRole(user.role));
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save onboarding step.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => setStep((value) => Math.max(1, value - 1));
  const handleSkip = () => {
    if (step < 3) setStep((value) => value + 1);
    else if (user) router.replace(getDashboardPathForRole(user.role));
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:p-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Complete your profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Step {step} of 3: {steps[step - 1]}
        </p>
        <div className="mt-4 h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 space-y-6">
          {step === 1 ? (
            <Card>
              <CardContent className="space-y-4 p-5">
                <FileUpload
                  maxSizeMB={5}
                  accept="image/*"
                  onUpload={async (file) => {
                    const result = await uploadAvatar(file);
                    if (user) {
                      setUser({ ...user, avatarUrl: result.avatarUrl });
                    }
                  }}
                />

                <Textarea label="Bio / Summary" value={bio} onChange={(event) => setBio(event.target.value)} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="City" value={city} onChange={(event) => setCity(event.target.value)} />
                  <Select
                    label="State"
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                    options={indianStates.map((stateName) => ({ label: stateName, value: stateName }))}
                  />
                </div>
                <Input label="Phone Number" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardContent className="space-y-4 p-5">
                {user?.role === UserRole.STUDENT ? (
                  <>
                    <Input label="Course" value={course} onChange={(event) => setCourse(event.target.value)} />
                    <Input label="Branch" value={branch} onChange={(event) => setBranch(event.target.value)} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Year of Study"
                        type="number"
                        value={String(yearOfStudy)}
                        onChange={(event) => setYearOfStudy(Number(event.target.value || "1"))}
                      />
                      <Input
                        label="Graduation Year"
                        type="number"
                        value={String(graduationYear)}
                        onChange={(event) => setGraduationYear(Number(event.target.value || "2027"))}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="CGPA"
                        type="number"
                        value={String(cgpa)}
                        onChange={(event) => setCgpa(Number(event.target.value || "0"))}
                      />
                      <Input label="Roll Number" value={rollNo} onChange={(event) => setRollNo(event.target.value)} />
                    </div>
                  </>
                ) : null}

                {user?.role === UserRole.JOB_SEEKER ? (
                  <>
                    <Input
                      label="Current / Last Company"
                      value={currentCompany}
                      onChange={(event) => setCurrentCompany(event.target.value)}
                    />
                    <Input
                      label="Total Experience (months)"
                      type="number"
                      value={String(experienceMonths)}
                      onChange={(event) => setExperienceMonths(Number(event.target.value || "0"))}
                    />
                    <Input
                      label="Notice Period (days)"
                      type="number"
                      value={String(noticeDays)}
                      onChange={(event) => setNoticeDays(Number(event.target.value || "0"))}
                    />
                  </>
                ) : null}

                {user?.role === UserRole.CORPORATE_RECRUITER ? (
                  <>
                    <Input label="Company Name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                    <Input label="Industry" value={industry} onChange={(event) => setIndustry(event.target.value)} />
                    <Select
                      label="Company Size"
                      value={companySize}
                      onChange={(event) => setCompanySize(event.target.value as CompanySize)}
                      options={Object.values(CompanySize).map((value) => ({ label: value, value }))}
                    />
                    <Input
                      label="Website"
                      value={companyWebsite}
                      onChange={(event) => setCompanyWebsite(event.target.value)}
                    />
                    <Input label="GST Number" value={gstNumber} onChange={(event) => setGstNumber(event.target.value)} />
                  </>
                ) : null}

                {user?.role === UserRole.COLLEGE_ADMIN ? (
                  <>
                    <Input label="College Name" value={collegeName} onChange={(event) => setCollegeName(event.target.value)} />
                    <Input label="NAAC Grade" value={naacGrade} onChange={(event) => setNaacGrade(event.target.value)} />
                    <Input
                      label="Streams (comma separated)"
                      value={streams}
                      onChange={(event) => setStreams(event.target.value)}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Total Intake"
                        type="number"
                        value={String(totalIntake)}
                        onChange={(event) => setTotalIntake(Number(event.target.value || "100"))}
                      />
                      <Input
                        label="Established Year"
                        type="number"
                        value={String(establishedYear)}
                        onChange={(event) => setEstablishedYear(Number(event.target.value || "2000"))}
                      />
                    </div>
                  </>
                ) : null}

                {user?.role === UserRole.FREELANCE_RECRUITER ? (
                  <>
                    <Input label="Agency Name" value={agencyName} onChange={(event) => setAgencyName(event.target.value)} />
                    <Input
                      label="Specializations"
                      value={freelanceSpecializations}
                      onChange={(event) => setFreelanceSpecializations(event.target.value)}
                    />
                    <Input
                      label="Experience (years)"
                      type="number"
                      value={String(freelanceExperienceYears)}
                      onChange={(event) => setFreelanceExperienceYears(Number(event.target.value || "0"))}
                    />
                  </>
                ) : null}

                {user?.role === UserRole.VENDOR ? (
                  <>
                    <Select
                      label="Vendor Type"
                      value={vendorType}
                      onChange={(event) => setVendorType(event.target.value as VendorType)}
                      options={Object.values(VendorType).map((value) => ({ label: value, value }))}
                    />
                    <Input
                      label="Company Name"
                      value={vendorCompanyName}
                      onChange={(event) => setVendorCompanyName(event.target.value)}
                    />
                    <Input
                      label="Services Offered"
                      value={servicesOffered}
                      onChange={(event) => setServicesOffered(event.target.value)}
                    />
                    <Input
                      label="Coverage Areas"
                      value={coverageAreas}
                      onChange={(event) => setCoverageAreas(event.target.value)}
                    />
                  </>
                ) : null}

                {user?.role === UserRole.TRAINING_PARTNER ? (
                  <>
                    <Input
                      label="Organization Name"
                      value={trainingOrgName}
                      onChange={(event) => setTrainingOrgName(event.target.value)}
                    />
                    <Input
                      label="Specializations"
                      value={trainingSpecializations}
                      onChange={(event) => setTrainingSpecializations(event.target.value)}
                    />
                    <Input
                      label="Website"
                      value={trainingWebsite}
                      onChange={(event) => setTrainingWebsite(event.target.value)}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardContent className="space-y-5 p-5">
                {isStudentTrack ? (
                  <>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Skills</p>
                      <div className="mt-3 flex flex-col gap-3 md:flex-row">
                        <Input
                          label="Skill Name"
                          value={skillName}
                          onChange={(event) => setSkillName(event.target.value)}
                        />
                        <Select
                          label="Skill Level"
                          value={skillLevel}
                          onChange={(event) => setSkillLevel(event.target.value as SkillLevel)}
                          options={Object.values(SkillLevel).map((value) => ({ label: value, value }))}
                        />
                        <div className="md:pt-6">
                          <Button type="button" onClick={addSkill}>
                            Add Skill
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <button
                            key={skill.name}
                            type="button"
                            onClick={() => removeSkill(skill.name)}
                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700"
                          >
                            {skill.name} ({skill.level})
                          </button>
                        ))}
                      </div>
                    </div>

                    <Input
                      label="Preferred Roles (comma separated)"
                      value={preferredRoles}
                      onChange={(event) => setPreferredRoles(event.target.value)}
                    />
                    <Input
                      label="Preferred Locations (comma separated)"
                      value={preferredLocations}
                      onChange={(event) => setPreferredLocations(event.target.value)}
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-800">Work Mode Preference</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.values(WorkMode).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setWorkMode(mode)}
                            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                              workMode === mode
                                ? "border-accent bg-accent-50 text-accent"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">Expected Salary Range (Lakhs)</p>
                      <div className="mt-2 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-slate-600">Minimum: ₹{salaryMinL}L</label>
                          <input
                            type="range"
                            min={0}
                            max={50}
                            value={salaryMinL}
                            onChange={(event) => setSalaryMinL(Number(event.target.value))}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-600">Maximum: ₹{salaryMaxL}L</label>
                          <input
                            type="range"
                            min={0}
                            max={50}
                            value={salaryMaxL}
                            onChange={(event) => setSalaryMaxL(Number(event.target.value))}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Profile summary is ready. Continue to your dashboard and refine details anytime.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1 || saving}>
            Back
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={handleSkip} disabled={saving}>
              Skip for now
            </Button>
            <Button type="button" onClick={() => void handleNext()} disabled={saving}>
              {saving ? "Saving..." : step === 3 ? "Go to Dashboard" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
