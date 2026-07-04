import type {
  AIMatchScore as PrismaAIMatchScore,
  ActivityLog as PrismaActivityLog,
  Application as PrismaApplication,
  ApplicationStatusHistory as PrismaApplicationStatusHistory,
  CandidateCertification as PrismaCandidateCertification,
  CandidateEducation as PrismaCandidateEducation,
  CandidateExperience as PrismaCandidateExperience,
  CandidateProject as PrismaCandidateProject,
  ChatMessage as PrismaChatMessage,
  ChatThread as PrismaChatThread,
  CollegeProfile as PrismaCollegeProfile,
  CollegeRecruiterConnection as PrismaCollegeRecruiterConnection,
  Course as PrismaCourse,
  CourseEnrollment as PrismaCourseEnrollment,
  CourseRevenue as PrismaCourseRevenue,
  DocumentVerification as PrismaDocumentVerification,
  EmailVerification as PrismaEmailVerification,
  EventParticipant as PrismaEventParticipant,
  FeatureFlag as PrismaFeatureFlag,
  FreelanceRecruiterProfile as PrismaFreelanceRecruiterProfile,
  FreelanceReferral as PrismaFreelanceReferral,
  InterviewSlot as PrismaInterviewSlot,
  Invite as PrismaInvite,
  InviteUse as PrismaInviteUse,
  Invoice as PrismaInvoice,
  Job as PrismaJob,
  JobSeekerProfile as PrismaJobSeekerProfile,
  ManpowerCandidate as PrismaManpowerCandidate,
  Notification as PrismaNotification,
  NotificationPreference as PrismaNotificationPreference,
  OAuthAccount as PrismaOAuthAccount,
  PasswordReset as PrismaPasswordReset,
  PlacementEvent as PrismaPlacementEvent,
  PlatformSetting as PrismaPlatformSetting,
  Prisma,
  RecruiterProfile as PrismaRecruiterProfile,
  RefreshToken as PrismaRefreshToken,
  SavedJob as PrismaSavedJob,
  ServiceRequest as PrismaServiceRequest,
  StudentProfile as PrismaStudentProfile,
  Tenant as PrismaTenant,
  TrainingPartnerProfile as PrismaTrainingPartnerProfile,
  User as PrismaUser,
  UserDocument as PrismaUserDocument,
  VendorProfile as PrismaVendorProfile,
  WhiteLabelConfig as PrismaWhiteLabelConfig
} from "@prisma/client";

export {
  ApplicationStatus,
  ChatContextType,
  CommissionTrigger,
  CommissionType,
  CompanySize,
  ConnectionStatus,
  CourseLevel,
  CourseMode,
  DocumentType,
  EnrollmentStatus,
  EventStatus,
  EventType,
  InterviewMode,
  InterviewOutcome,
  InterviewRound,
  InterviewStatus,
  InvoiceStatus,
  JobStatus,
  JobType,
  MessageType,
  NotificationChannel,
  NotificationType,
  OAuthProvider,
  ParticipantStatus,
  PaymentStatus,
  Plan,
  PricingModel,
  ProfileVisibility,
  ReferralStatus,
  ServiceRequestStatus,
  ServiceRequestType,
  SubRole,
  UserRole,
  VendorType,
  VerificationStatus,
  WorkMode
} from "@prisma/client";

export interface Tenant extends PrismaTenant {}
export interface User extends PrismaUser {}
export interface RefreshToken extends PrismaRefreshToken {}
export interface EmailVerification extends PrismaEmailVerification {}
export interface PasswordReset extends PrismaPasswordReset {}
export interface OAuthAccount extends PrismaOAuthAccount {}
export interface CollegeProfile extends PrismaCollegeProfile {}
export interface StudentProfile extends PrismaStudentProfile {}
export interface RecruiterProfile extends PrismaRecruiterProfile {}
export interface FreelanceRecruiterProfile extends PrismaFreelanceRecruiterProfile {}
export interface VendorProfile extends PrismaVendorProfile {}
export interface TrainingPartnerProfile extends PrismaTrainingPartnerProfile {}
export interface JobSeekerProfile extends PrismaJobSeekerProfile {}
export interface CandidateEducation extends PrismaCandidateEducation {}
export interface CandidateExperience extends PrismaCandidateExperience {}
export interface CandidateCertification extends PrismaCandidateCertification {}
export interface CandidateProject extends PrismaCandidateProject {}
export interface Invite extends PrismaInvite {}
export interface InviteUse extends PrismaInviteUse {}
export interface CollegeRecruiterConnection extends PrismaCollegeRecruiterConnection {}
export interface Job extends PrismaJob {}
export interface Application extends PrismaApplication {}
export interface ApplicationStatusHistory extends PrismaApplicationStatusHistory {}
export interface InterviewSlot extends PrismaInterviewSlot {}
export interface SavedJob extends PrismaSavedJob {}
export interface FreelanceReferral extends PrismaFreelanceReferral {}
export interface Invoice extends PrismaInvoice {}
export interface ServiceRequest extends PrismaServiceRequest {}
export interface ManpowerCandidate extends PrismaManpowerCandidate {}
export interface DocumentVerification extends PrismaDocumentVerification {}
export interface PlacementEvent extends PrismaPlacementEvent {}
export interface EventParticipant extends PrismaEventParticipant {}
export interface Course extends PrismaCourse {}
export interface CourseEnrollment extends PrismaCourseEnrollment {}
export interface CourseRevenue extends PrismaCourseRevenue {}
export interface UserDocument extends PrismaUserDocument {}
export interface ChatThread extends PrismaChatThread {}
export interface ChatMessage extends PrismaChatMessage {}
export interface Notification extends PrismaNotification {}
export interface NotificationPreference extends PrismaNotificationPreference {}
export interface WhiteLabelConfig extends PrismaWhiteLabelConfig {}
export interface ActivityLog extends PrismaActivityLog {}
export interface AIMatchScore extends PrismaAIMatchScore {}
export interface PlatformSetting extends PrismaPlatformSetting {}
export interface FeatureFlag extends PrismaFeatureFlag {}

export type JsonValue = Prisma.JsonValue;

export enum SkillLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED"
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponseMeta extends Record<string, unknown> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: PaginatedResponseMeta;
}

export interface JwtPayload {
  userId: string;
  role: import("@prisma/client").UserRole;
  tenantId: string | null;
  subRole: import("@prisma/client").SubRole;
  familyId?: string | null;
  jti?: string;
}

export interface TenantContext {
  tenant: Tenant | null;
  tenantId: string | null;
  slug: string | null;
  plan: import("@prisma/client").Plan | null;
  isWhitelabel: boolean;
}

export interface StudentDashboardConfig {
  showCareerScore: boolean;
  showRecommendedJobs: boolean;
  showCourseRecommendations: boolean;
  showAtsPipeline: boolean;
}

export interface RecruiterDashboardConfig {
  showHiringNowToggle: boolean;
  showAtsKanban: boolean;
  showFunnelAnalytics: boolean;
  showReferralPanel: boolean;
}

export interface CollegeDashboardConfig {
  showPlacementAnalytics: boolean;
  showRecruiterConnections: boolean;
  showEventManager: boolean;
  showStudentProgress: boolean;
}

export interface FreelanceDashboardConfig {
  showCandidatePool: boolean;
  showLiveReferralTracking: boolean;
  showCommissionTracker: boolean;
  showInvoiceCenter: boolean;
}

export interface VendorDashboardConfig {
  showServiceQueue: boolean;
  showFulfillmentTracker: boolean;
  showBillingOverview: boolean;
  showSlaMetrics: boolean;
}

export interface TrainingPartnerDashboardConfig {
  showCourseRevenue: boolean;
  showEnrollmentTracker: boolean;
  showSkillGapDemand: boolean;
  showPlacementCorrelation: boolean;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface StudentAnalytics {
  applicationFunnel: {
    applied: number;
    screening: number;
    shortlisted: number;
    interviewing: number;
    offered: number;
    hired: number;
    rejected: number;
  };
  applicationsByMonth: Array<{ month: string; count: number }>;
  topSkillsMatched: Array<{ skill: string; matchCount: number }>;
  responseRate: number;
  avgTimeToResponse: number;
  profileViews: number;
  careerScoreHistory: Array<{ date: string; score: number }>;
  savedJobsCount: number;
  interviewsCount: number;
}

export interface RecruiterAnalytics {
  totalJobsPosted: number;
  activeJobs: number;
  totalApplicationsReceived: number;
  applicationsByStage: Record<import("@prisma/client").ApplicationStatus, number>;
  applicationsByJob: Array<{ jobTitle: string; count: number }>;
  timeToHire: number;
  offerAcceptanceRate: number;
  topSourceColleges: Array<{ college: string; count: number }>;
  interviewsScheduled: number;
  hiresByMonth: Array<{ month: string; count: number }>;
  conversionFunnel: Array<{ stage: string; count: number; rate: number }>;
}

export interface CollegeAnalytics {
  totalStudents: number;
  studentsWithProfile: number;
  studentsApplied: number;
  studentsHired: number;
  placementRate: number;
  topRecruiterConnections: Array<{ company: string; hires: number }>;
  applicationsByBranch: Array<{ branch: string; count: number }>;
  avgCareerScore: number;
  upcomingEvents: number;
  inviteCodeUsage: Array<{ code: string; used: number; max: number }>;
}

export interface PlatformAnalytics {
  userGrowth: Array<{ date: string; role: import("@prisma/client").UserRole; count: number }>;
  tenantStats: Array<{ tenantId: string; name: string; users: number; jobs: number; applications: number }>;
  revenueMetrics: {
    totalCommissions: number;
    totalCourseRevenue: number;
    totalServiceRevenue: number;
    pendingPayouts: number;
  };
  jobFunnelPlatform: Record<import("@prisma/client").ApplicationStatus, number>;
  topColleges: Array<{ name: string; placementRate: number }>;
  topRecruiters: Array<{ company: string; hires: number }>;
  dailyActiveUsers: Array<{ date: string; count: number }>;
  systemHealth: {
    totalApiCalls: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

export interface FreelanceAnalytics {
  totalReferrals: number;
  referralsByStatus: Record<import("@prisma/client").ReferralStatus, number>;
  commissionsByMonth: Array<{ month: string; amount: number }>;
  topJobs: Array<{ jobTitle: string; company: string; referrals: number }>;
  conversionRate: number;
  pendingPayout: number;
  totalEarned: number;
}

export interface CandidateSkillItem {
  name: string;
  level: SkillLevel;
}

export interface CandidateProfile {
  userId: string;
  skills: CandidateSkillItem[];
  preferredRoles: string[];
  preferredLocations: string[];
  workModePref: import("@prisma/client").WorkMode | "ANY";
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  cgpa: number | null;
  experienceYears: number | null;
}

export interface JobRequirement {
  jobId: string;
  title: string;
  skillsRequired: Array<{ name: string; isMandatory: boolean; level?: SkillLevel }>;
  locationCity: string | null;
  locationState: string | null;
  workMode: import("@prisma/client").WorkMode;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: import("@prisma/client").JobType;
  experienceMin: number | null;
  experienceMax: number | null;
}

export interface MatchResult {
  jobId: string;
  matchScore: number;
  skillMatchPct: number;
  missingSkills: string[];
  recommendedCourseIds: string[];
}

export interface MatchResponse {
  candidateId: string;
  results: MatchResult[];
  computedAt: string;
}

export interface ScoreRequest {
  userId: string;
  hasAvatar: boolean;
  hasBio: boolean;
  hasResume: boolean;
  skillsCount: number;
  educationCount: number;
  experienceCount: number;
  certificationsCount: number;
  projectsCount: number;
  cgpa: number | null;
  hasLinkedin: boolean;
  hasGithub: boolean;
  hasPortfolio: boolean;
}

export interface ScoreResponse {
  userId: string;
  careerScore: number;
  breakdown: Record<string, number>;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentDto {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  courseId: string;
}
