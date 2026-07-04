"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { UserRole } from "@campushire/types";
import { Button, Input } from "@/components/ui";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { useAuth } from "@/lib/hooks/useAuth";
import { publicApiClient, unwrapResponse } from "@/lib/api/client";
import { getPasswordStrength, passwordRegex } from "@/lib/utils/validators";
import type { RegisterDto } from "@/lib/api/auth.api";

interface InviteValidationResult {
  valid: boolean;
  reason?: string;
}

interface RoleCard {
  role: UserRole;
  title: string;
  description: string;
}

const roles: RoleCard[] = [
  {
    role: UserRole.STUDENT,
    title: "Student",
    description: "Access verified campus opportunities"
  },
  {
    role: UserRole.JOB_SEEKER,
    title: "Job Seeker",
    description: "Discover curated jobs and referrals"
  },
  {
    role: UserRole.CORPORATE_RECRUITER,
    title: "Corporate Recruiter",
    description: "Hire from high-intent candidate pools"
  },
  {
    role: UserRole.COLLEGE_ADMIN,
    title: "College Admin",
    description: "Manage placements and invite cohorts"
  },
  {
    role: UserRole.FREELANCE_RECRUITER,
    title: "Freelance Recruiter",
    description: "Refer talent and track commissions"
  },
  {
    role: UserRole.VENDOR,
    title: "Vendor",
    description: "Deliver trusted verification services"
  },
  {
    role: UserRole.TRAINING_PARTNER,
    title: "Training Partner",
    description: "Run courses aligned to hiring demand"
  }
];

const steps = ["Select role", "Basic details", "Role details"];

const isInviteRequired = (role: UserRole): boolean => role === UserRole.STUDENT;

const getStrengthColor = (strength: "weak" | "fair" | "good" | "strong"): string => {
  if (strength === "strong") return "bg-emerald-500";
  if (strength === "good") return "bg-sky-500";
  if (strength === "fair") return "bg-amber-500";
  return "bg-rose-500";
};

export const RegisterForm = () => {
  const { register: registerUser } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [inviteStatus, setInviteStatus] = useState<InviteValidationResult | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const validateStepTwo = (): string | null => {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Enter a valid email address.";
    if (!passwordRegex.test(password)) {
      return "Password must include uppercase, lowercase, number, and symbol.";
    }
    if (password !== confirmPassword) return "Password confirmation does not match.";
    return null;
  };

  const validateInviteCode = async () => {
    if (!inviteCode.trim()) {
      setInviteStatus({ valid: false, reason: "Invite code is required." });
      return;
    }

    setIsCheckingInvite(true);
    setInviteStatus(null);

    try {
      const response = await publicApiClient.get(`/api/invites/validate/${encodeURIComponent(inviteCode.trim())}`);
      const result = unwrapResponse<InviteValidationResult>(response);
      setInviteStatus(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to validate invite code.";
      setInviteStatus({ valid: false, reason: message });
    } finally {
      setIsCheckingInvite(false);
    }
  };

  const goNext = async () => {
    setFormError(null);

    if (step === 1) {
      if (!role) {
        setFormError("Choose a role to continue.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const error = validateStepTwo();
      if (error) {
        setFormError(error);
        return;
      }
      setStep(3);
      return;
    }

    if (!role) {
      setFormError("Choose a role to continue.");
      return;
    }

    if (isInviteRequired(role)) {
      if (!inviteCode.trim()) {
        setFormError("Invite code is required for student accounts.");
        return;
      }

      if (!inviteStatus?.valid) {
        setFormError("Validate your invite code before continuing.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const dto: RegisterDto = {
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        inviteCode: inviteCode.trim() || undefined,
        phone: phone.trim() || undefined
      };

      await registerUser(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete registration.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setFormError(null);
    setStep((value) => Math.max(1, value - 1));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Step {step} of 3</span>
          <span>{steps[step - 1]}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-accent transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {formError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {roles.map((item) => {
            const active = role === item.role;
            return (
              <button
                type="button"
                key={item.role}
                onClick={() => setRole(item.role)}
                className={`relative rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-accent bg-accent-50 shadow-card scale-[1.01]"
                    : "border-slate-200 bg-white hover:border-accent/60"
                }`}
              >
                {active ? <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-accent" /> : null}
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.description}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            <Input label="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </div>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Phone (optional)"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helperText="Use at least 8 characters with uppercase, lowercase, number, and symbol."
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Password strength</span>
              <span className="font-medium capitalize">{passwordStrength}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div
                className={`h-2 rounded-full transition-all ${getStrengthColor(passwordStrength)}`}
                style={{
                  width:
                    passwordStrength === "weak"
                      ? "25%"
                      : passwordStrength === "fair"
                        ? "50%"
                        : passwordStrength === "good"
                          ? "75%"
                          : "100%"
                }}
              />
            </div>
          </div>
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          {role === UserRole.STUDENT ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Input
                label="College Invite Code"
                value={inviteCode}
                onChange={(event) => {
                  setInviteCode(event.target.value);
                  setInviteStatus(null);
                }}
              />
              <div className="mt-3 flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => void validateInviteCode()} disabled={isCheckingInvite}>
                  {isCheckingInvite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Validate Code
                </Button>
                {inviteStatus ? (
                  <span className={`text-sm ${inviteStatus.valid ? "text-emerald-700" : "text-rose-700"}`}>
                    {inviteStatus.valid ? "Invite code verified" : inviteStatus.reason ?? "Invalid code"}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Input
                label="Organization Name (optional)"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
              />
              <p className="mt-2 text-xs text-slate-500">
                You can add more profile details in onboarding after account creation.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">Sign up with social account</p>
            <div className="mt-3">
              <OAuthButtons mode="register" role={role ?? undefined} inviteCode={inviteCode.trim() || undefined} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 1 || isSubmitting}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          className="ml-auto bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
          onClick={() => void goNext()}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {step < 3 ? (
            <>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </div>
    </div>
  );
};
