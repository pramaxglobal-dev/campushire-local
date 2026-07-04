import { UserRole } from "@campushire/types";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  onboarding: "/onboarding",
  authCallback: "/auth/callback",
  pending: "/pending",
  suspended: "/suspended",
  dashboard: {
    root: "/dashboard",
    student: "/dashboard/student",
    recruiter: "/dashboard/recruiter",
    college: "/dashboard/college",
    admin: "/dashboard/admin",
    freelance: "/dashboard/freelance",
    vendor: "/dashboard/vendor",
    training: "/dashboard/training"
  },
  jobs: {
    list: "/dashboard/jobs",
    detail: (id: string) => `/dashboard/jobs/${id}`,
    new: "/dashboard/jobs/new",
    edit: (id: string) => `/dashboard/jobs/${id}/edit`
  },
  applications: {
    list: "/dashboard/applications",
    detail: (id: string) => `/dashboard/applications/${id}`
  },
  ats: {
    root: "/dashboard/ats",
    board: (jobId: string) => `/dashboard/ats/${jobId}`
  },
  interviews: "/dashboard/interviews",
  notifications: "/dashboard/notifications",
  savedJobs: "/dashboard/saved-jobs",
  analytics: "/dashboard/analytics",
  whitelabel: "/dashboard/whitelabel",
  connections: "/dashboard/connections",
  events: {
    list: "/dashboard/events",
    detail: (id: string) => `/dashboard/events/${id}`
  },
  courses: {
    list: "/dashboard/courses",
    detail: (id: string) => `/dashboard/courses/${id}`
  },
  documents: "/dashboard/documents",
  chat: "/dashboard/chat",
  vendors: "/dashboard/vendors",
  profile: "/profile",
  settings: "/settings",
  vendor: "/dashboard/vendor",
  training: "/dashboard/training",
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_EMAIL: "/verify-email",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  ONBOARDING: "/onboarding",
  AUTH_CALLBACK: "/auth/callback",
  PENDING: "/pending",
  SUSPENDED: "/suspended",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  DASHBOARD_ROOT: "/dashboard",
  ANALYTICS: "/dashboard/analytics",
  WHITELABEL: "/dashboard/whitelabel",
  CONNECTIONS: "/dashboard/connections",
  EVENTS_LIST: "/dashboard/events"
} as const;

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  SUPER_ADMIN: ROUTES.dashboard.admin,
  COLLEGE_ADMIN: ROUTES.dashboard.college,
  STUDENT: ROUTES.dashboard.student,
  JOB_SEEKER: ROUTES.dashboard.student,
  CORPORATE_RECRUITER: ROUTES.dashboard.recruiter,
  FREELANCE_RECRUITER: ROUTES.dashboard.freelance,
  VENDOR: ROUTES.dashboard.vendor,
  TRAINING_PARTNER: ROUTES.dashboard.training
};

export const APPROVAL_REQUIRED_ROLES = new Set<UserRole>([
  UserRole.CORPORATE_RECRUITER,
  UserRole.COLLEGE_ADMIN,
  UserRole.FREELANCE_RECRUITER,
  UserRole.VENDOR,
  UserRole.TRAINING_PARTNER
]);

export function getRoleHomepage(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role] ?? ROUTES.dashboard.root;
}

export const getDashboardPathForRole = (role: UserRole): string => {
  return getRoleHomepage(role);
};

export const needsApproval = (role: UserRole): boolean => APPROVAL_REQUIRED_ROLES.has(role);

export const isProtectedPath = (path: string): boolean => {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings")
  );
};
