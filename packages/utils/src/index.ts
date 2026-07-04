import { format as formatDateFns } from "date-fns";
import { nanoid } from "nanoid";
import { StudentProfile, UserRole } from "@campushire/types";

const rolePrefixMap: Record<UserRole, string> = {
  SUPER_ADMIN: "COL-",
  COLLEGE_ADMIN: "COL-",
  STUDENT: "STU-",
  JOB_SEEKER: "JSK-",
  CORPORATE_RECRUITER: "REC-",
  FREELANCE_RECRUITER: "FRE-",
  VENDOR: "VEN-",
  TRAINING_PARTNER: "TRP-"
};

export const generateTIN = (role: UserRole): string => {
  const prefix = rolePrefixMap[role];
  return `${prefix}${nanoid(8).toUpperCase()}`;
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const generateInviteCode = (): string => {
  return nanoid(10).toUpperCase();
};

export const formatCurrency = (amount: number, currency = "INR"): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
};

const toLakhs = (amount: number): string => {
  const lakhs = amount / 100000;
  if (lakhs % 1 === 0) {
    return `${lakhs.toFixed(0)}L`;
  }
  return `${lakhs.toFixed(1)}L`;
};

export const formatSalaryRange = (min: number, max: number): string => {
  return `\u20B9${toLakhs(min)} - \u20B9${toLakhs(max)}`;
};

export const formatDate = (date: Date, format = "dd MMM yyyy"): string => {
  return formatDateFns(date, format);
};

export const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase();
};

export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin",
    COLLEGE_ADMIN: "College Admin",
    STUDENT: "Student",
    JOB_SEEKER: "Job Seeker",
    CORPORATE_RECRUITER: "Corporate Recruiter",
    FREELANCE_RECRUITER: "Freelance Recruiter",
    VENDOR: "Vendor",
    TRAINING_PARTNER: "Training Partner"
  };
  return labels[role];
};

export const getStatusColor = (status: string): string => {
  const normalized = status.toLowerCase();
  const colorMap: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    approved: "bg-emerald-100 text-emerald-800",
    completed: "bg-emerald-100 text-emerald-800",
    hired: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    screening: "bg-amber-100 text-amber-800",
    on_hold: "bg-amber-100 text-amber-800",
    paused: "bg-orange-100 text-orange-800",
    draft: "bg-slate-100 text-slate-800",
    rejected: "bg-rose-100 text-rose-800",
    cancelled: "bg-rose-100 text-rose-800",
    failed: "bg-rose-100 text-rose-800",
    offered: "bg-sky-100 text-sky-800",
    shortlisted: "bg-sky-100 text-sky-800",
    interview_r1: "bg-indigo-100 text-indigo-800",
    interview_r2: "bg-indigo-100 text-indigo-800",
    interview_r3: "bg-indigo-100 text-indigo-800"
  };
  return colorMap[normalized] ?? "bg-gray-100 text-gray-800";
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const validatePhone = (phone: string): boolean => {
  const normalized = phone.replace(/\s+/g, "");
  return /^(?:\+91|91)?[6-9]\d{9}$/.test(normalized);
};

export const truncateText = (text: string, length: number): string => {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, Math.max(0, length - 3)).trimEnd()}...`;
};

const scoreFromSkills = (skills: unknown): number => {
  if (!skills) {
    return 0;
  }
  if (Array.isArray(skills)) {
    return Math.min(25, skills.length * 4);
  }
  if (typeof skills === "object") {
    const values = Object.values(skills as Record<string, unknown>);
    const flatCount = values.reduce<number>((count, value) => {
      if (Array.isArray(value)) {
        return count + value.length;
      }
      if (typeof value === "string" && value.length > 0) {
        return count + 1;
      }
      return count;
    }, 0);
    return Math.min(25, flatCount * 3);
  }
  return 0;
};

export const calculateCareerScore = (profile: Partial<StudentProfile>): number => {
  let score = 0;

  score += scoreFromSkills(profile.skills);

  if (profile.resumeUrl) {
    score += 15;
  }

  if (typeof profile.cgpa === "number") {
    const cgpaScore = Math.min(20, Math.max(0, (profile.cgpa / 10) * 20));
    score += cgpaScore;
  }

  if (profile.program) {
    score += 8;
  }
  if (profile.department) {
    score += 8;
  }
  if (profile.graduationYear) {
    score += 8;
  }
  if (profile.linkedInUrl) {
    score += 6;
  }
  if (profile.githubUrl || profile.portfolioUrl) {
    score += 10;
  }

  const normalized = Math.round(Math.min(100, score));
  return normalized;
};

export const isProfileComplete = (profile: Partial<StudentProfile>): boolean => {
  const requiredFields: Array<keyof StudentProfile> = [
    "program",
    "department",
    "graduationYear",
    "skills",
    "resumeUrl"
  ];

  return requiredFields.every((field) => {
    const value = profile[field];
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  });
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>`"'\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

