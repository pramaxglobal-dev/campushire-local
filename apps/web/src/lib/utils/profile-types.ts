import type {
  CandidateCertification,
  CandidateEducation,
  CandidateExperience,
  CandidateProject,
  CollegeProfile,
  FreelanceRecruiterProfile,
  JobSeekerProfile,
  RecruiterProfile,
  StudentProfile,
  Tenant,
  TrainingPartnerProfile,
  User,
  VendorProfile
} from "@campushire/types";

export interface FullUserProfile extends User {
  tenant?: Tenant | null;
  studentProfile?: StudentProfile | null;
  recruiterProfile?: RecruiterProfile | null;
  freelanceRecruiterProfile?: FreelanceRecruiterProfile | null;
  vendorProfile?: VendorProfile | null;
  trainingPartnerProfile?: TrainingPartnerProfile | null;
  jobSeekerProfile?: JobSeekerProfile | null;
  collegeProfileManaged?: CollegeProfile | null;
  candidateEducations?: CandidateEducation[];
  candidateExperiences?: CandidateExperience[];
  candidateCertifications?: CandidateCertification[];
  candidateProjects?: CandidateProject[];
  isSuspended?: boolean;
}