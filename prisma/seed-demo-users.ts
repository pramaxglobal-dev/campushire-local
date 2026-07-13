import bcrypt from "bcrypt";
import { createHash } from "crypto";
import {
  CompanySize,
  CommissionType,
  PricingModel,
  Plan,
  PrismaClient,
  ProfileVisibility,
  UserRole,
  VendorType,
  WorkMode
} from "@prisma/client";

const prisma = new PrismaClient();
const PASSWORD_ROUNDS = 12;
const DEMO_PASSWORD = "Talentor@123";

const tinPrefixByRole: Record<UserRole, string> = {
  SUPER_ADMIN: "ADM",
  COLLEGE_ADMIN: "COL",
  STUDENT: "STU",
  JOB_SEEKER: "JSK",
  CORPORATE_RECRUITER: "REC",
  FREELANCE_RECRUITER: "FRE",
  VENDOR: "VEN",
  TRAINING_PARTNER: "TRP"
};

const makeTin = (role: UserRole, seed: string): string => {
  const digest = createHash("sha256").update(`${role}:${seed}`).digest("hex");
  return `${tinPrefixByRole[role]}-${digest.slice(0, 8).toUpperCase()}`;
};

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
};

const logEntity = (label: string, id: string): void => {
  console.log(`${label}: ${id}`);
};

async function main() {
  console.log("Starting demo user creation...");
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  // Super Admin Demo Users (2)
  const superAdmin1 = await prisma.user.upsert({
    where: { email: "superadmin.demo1@talentorx.local" },
    update: {
      firstName: "Super",
      lastName: "Admin One",
      passwordHash: demoPasswordHash,
      role: UserRole.SUPER_ADMIN,
      tin: makeTin(UserRole.SUPER_ADMIN, "superadmin.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true,
      profileVisibility: ProfileVisibility.PRIVATE
    },
    create: {
      email: "superadmin.demo1@talentorx.local",
      firstName: "Super",
      lastName: "Admin One",
      passwordHash: demoPasswordHash,
      role: UserRole.SUPER_ADMIN,
      tin: makeTin(UserRole.SUPER_ADMIN, "superadmin.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true,
      profileVisibility: ProfileVisibility.PRIVATE
    }
  });
  logEntity("Demo User (SUPER_ADMIN 1)", superAdmin1.id);

  const superAdmin2 = await prisma.user.upsert({
    where: { email: "superadmin.demo2@talentorx.local" },
    update: {
      firstName: "Super",
      lastName: "Admin Two",
      passwordHash: demoPasswordHash,
      role: UserRole.SUPER_ADMIN,
      tin: makeTin(UserRole.SUPER_ADMIN, "superadmin.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true,
      profileVisibility: ProfileVisibility.PRIVATE
    },
    create: {
      email: "superadmin.demo2@talentorx.local",
      firstName: "Super",
      lastName: "Admin Two",
      passwordHash: demoPasswordHash,
      role: UserRole.SUPER_ADMIN,
      tin: makeTin(UserRole.SUPER_ADMIN, "superadmin.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true,
      profileVisibility: ProfileVisibility.PRIVATE
    }
  });
  logEntity("Demo User (SUPER_ADMIN 2)", superAdmin2.id);

  // Get or create demo tenant for College Admin
  const demoCollegeTenant = await prisma.tenant.upsert({
    where: { slug: "demo-college" },
    update: {
      name: "Demo College",
      plan: Plan.GROWTH,
      isActive: true
    },
    create: {
      name: "Demo College",
      slug: "demo-college",
      plan: Plan.GROWTH,
      isActive: true
    }
  });
  logEntity("Demo Tenant (College)", demoCollegeTenant.id);

  // College Admin Demo Users (2)
  const collegeAdmin1 = await prisma.user.upsert({
    where: { email: "collegeadmin.demo1@talentorx.local" },
    update: {
      tenantId: demoCollegeTenant.id,
      firstName: "College",
      lastName: "Admin One",
      passwordHash: demoPasswordHash,
      role: UserRole.COLLEGE_ADMIN,
      tin: makeTin(UserRole.COLLEGE_ADMIN, "collegeadmin.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: demoCollegeTenant.id,
      email: "collegeadmin.demo1@talentorx.local",
      firstName: "College",
      lastName: "Admin One",
      passwordHash: demoPasswordHash,
      role: UserRole.COLLEGE_ADMIN,
      tin: makeTin(UserRole.COLLEGE_ADMIN, "collegeadmin.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (COLLEGE_ADMIN 1)", collegeAdmin1.id);

  const collegeProfile1 = await prisma.collegeProfile.upsert({
    where: { adminUserId: collegeAdmin1.id },
    update: {
      tenantId: demoCollegeTenant.id,
      name: "Demo College One",
      openForPlacement: true
    },
    create: {
      tenantId: demoCollegeTenant.id,
      adminUserId: collegeAdmin1.id,
      name: "Demo College One",
      slug: "demo-college-one",
      openForPlacement: true,
      city: "Demo City",
      state: "Demo State",
      country: "India"
    }
  });
  logEntity("Demo CollegeProfile 1", collegeProfile1.id);

  const collegeAdmin2 = await prisma.user.upsert({
    where: { email: "collegeadmin.demo2@talentorx.local" },
    update: {
      tenantId: demoCollegeTenant.id,
      firstName: "College",
      lastName: "Admin Two",
      passwordHash: demoPasswordHash,
      role: UserRole.COLLEGE_ADMIN,
      tin: makeTin(UserRole.COLLEGE_ADMIN, "collegeadmin.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: demoCollegeTenant.id,
      email: "collegeadmin.demo2@talentorx.local",
      firstName: "College",
      lastName: "Admin Two",
      passwordHash: demoPasswordHash,
      role: UserRole.COLLEGE_ADMIN,
      tin: makeTin(UserRole.COLLEGE_ADMIN, "collegeadmin.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (COLLEGE_ADMIN 2)", collegeAdmin2.id);

  const collegeProfile2 = await prisma.collegeProfile.upsert({
    where: { adminUserId: collegeAdmin2.id },
    update: {
      tenantId: demoCollegeTenant.id,
      name: "Demo College Two",
      openForPlacement: true
    },
    create: {
      tenantId: demoCollegeTenant.id,
      adminUserId: collegeAdmin2.id,
      name: "Demo College Two",
      slug: "demo-college-two",
      openForPlacement: true,
      city: "Demo City",
      state: "Demo State",
      country: "India"
    }
  });
  logEntity("Demo CollegeProfile 2", collegeProfile2.id);

  // Student Demo Users (2)
  const student1 = await prisma.user.upsert({
    where: { email: "student.demo1@talentorx.local" },
    update: {
      tenantId: demoCollegeTenant.id,
      firstName: "Student",
      lastName: "Demo One",
      passwordHash: demoPasswordHash,
      role: UserRole.STUDENT,
      tin: makeTin(UserRole.STUDENT, "student.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: demoCollegeTenant.id,
      email: "student.demo1@talentorx.local",
      firstName: "Student",
      lastName: "Demo One",
      passwordHash: demoPasswordHash,
      role: UserRole.STUDENT,
      tin: makeTin(UserRole.STUDENT, "student.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (STUDENT 1)", student1.id);

  const studentProfile1 = await prisma.studentProfile.upsert({
    where: { userId: student1.id },
    update: {
      tenantId: demoCollegeTenant.id,
      collegeProfileId: collegeProfile1.id,
      program: "B.Tech",
      department: "Computer Science",
      yearOfStudy: 3,
      graduationYear: 2026,
      cgpa: 8.5,
      isProfileComplete: true
    },
    create: {
      userId: student1.id,
      tenantId: demoCollegeTenant.id,
      collegeProfileId: collegeProfile1.id,
      program: "B.Tech",
      department: "Computer Science",
      yearOfStudy: 3,
      graduationYear: 2026,
      cgpa: 8.5,
      isProfileComplete: true
    }
  });
  logEntity("Demo StudentProfile 1", studentProfile1.id);

  const student2 = await prisma.user.upsert({
    where: { email: "student.demo2@talentorx.local" },
    update: {
      tenantId: demoCollegeTenant.id,
      firstName: "Student",
      lastName: "Demo Two",
      passwordHash: demoPasswordHash,
      role: UserRole.STUDENT,
      tin: makeTin(UserRole.STUDENT, "student.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: demoCollegeTenant.id,
      email: "student.demo2@talentorx.local",
      firstName: "Student",
      lastName: "Demo Two",
      passwordHash: demoPasswordHash,
      role: UserRole.STUDENT,
      tin: makeTin(UserRole.STUDENT, "student.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (STUDENT 2)", student2.id);

  const studentProfile2 = await prisma.studentProfile.upsert({
    where: { userId: student2.id },
    update: {
      tenantId: demoCollegeTenant.id,
      collegeProfileId: collegeProfile2.id,
      program: "B.Tech",
      department: "Computer Science",
      yearOfStudy: 2,
      graduationYear: 2027,
      cgpa: 8.2,
      isProfileComplete: true
    },
    create: {
      userId: student2.id,
      tenantId: demoCollegeTenant.id,
      collegeProfileId: collegeProfile2.id,
      program: "B.Tech",
      department: "Computer Science",
      yearOfStudy: 2,
      graduationYear: 2027,
      cgpa: 8.2,
      isProfileComplete: true
    }
  });
  logEntity("Demo StudentProfile 2", studentProfile2.id);

  // Job Seeker Demo Users (2)
  const jobSeeker1 = await prisma.user.upsert({
    where: { email: "jobseeker.demo1@talentorx.local" },
    update: {
      firstName: "JobSeeker",
      lastName: "Demo One",
      passwordHash: demoPasswordHash,
      role: UserRole.JOB_SEEKER,
      tin: makeTin(UserRole.JOB_SEEKER, "jobseeker.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      email: "jobseeker.demo1@talentorx.local",
      firstName: "JobSeeker",
      lastName: "Demo One",
      passwordHash: demoPasswordHash,
      role: UserRole.JOB_SEEKER,
      tin: makeTin(UserRole.JOB_SEEKER, "jobseeker.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (JOB_SEEKER 1)", jobSeeker1.id);

  const jobSeekerProfile1 = await prisma.jobSeekerProfile.upsert({
    where: { userId: jobSeeker1.id },
    update: {
      totalExperienceMonths: 24,
      currentCity: "Demo City",
      isProfileComplete: true
    },
    create: {
      userId: jobSeeker1.id,
      totalExperienceMonths: 24,
      currentCity: "Demo City",
      isProfileComplete: true
    }
  });
  logEntity("Demo JobSeekerProfile 1", jobSeekerProfile1.id);

  const jobSeeker2 = await prisma.user.upsert({
    where: { email: "jobseeker.demo2@talentorx.local" },
    update: {
      firstName: "JobSeeker",
      lastName: "Demo Two",
      passwordHash: demoPasswordHash,
      role: UserRole.JOB_SEEKER,
      tin: makeTin(UserRole.JOB_SEEKER, "jobseeker.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      email: "jobseeker.demo2@talentorx.local",
      firstName: "JobSeeker",
      lastName: "Demo Two",
      passwordHash: demoPasswordHash,
      role: UserRole.JOB_SEEKER,
      tin: makeTin(UserRole.JOB_SEEKER, "jobseeker.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (JOB_SEEKER 2)", jobSeeker2.id);

  const jobSeekerProfile2 = await prisma.jobSeekerProfile.upsert({
    where: { userId: jobSeeker2.id },
    update: {
      totalExperienceMonths: 36,
      currentCity: "Demo City",
      isProfileComplete: true
    },
    create: {
      userId: jobSeeker2.id,
      totalExperienceMonths: 36,
      currentCity: "Demo City",
      isProfileComplete: true
    }
  });
  logEntity("Demo JobSeekerProfile 2", jobSeekerProfile2.id);

  // Corporate Recruiter Demo Users (2)
  const recruiterTenant1 = await prisma.tenant.upsert({
    where: { slug: "demo-corp-recruiter-1" },
    update: {
      name: "Demo Corp Recruiter 1",
      plan: Plan.BASIC,
      isActive: true
    },
    create: {
      name: "Demo Corp Recruiter 1",
      slug: "demo-corp-recruiter-1",
      plan: Plan.BASIC,
      isActive: true
    }
  });
  logEntity("Demo Tenant (Recruiter 1)", recruiterTenant1.id);

  const corpRecruiter1 = await prisma.user.upsert({
    where: { email: "corporaterecruiter.demo1@talentorx.local" },
    update: {
      tenantId: recruiterTenant1.id,
      firstName: "Corporate",
      lastName: "Recruiter One",
      passwordHash: demoPasswordHash,
      role: UserRole.CORPORATE_RECRUITER,
      tin: makeTin(UserRole.CORPORATE_RECRUITER, "corporaterecruiter.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: recruiterTenant1.id,
      email: "corporaterecruiter.demo1@talentorx.local",
      firstName: "Corporate",
      lastName: "Recruiter One",
      passwordHash: demoPasswordHash,
      role: UserRole.CORPORATE_RECRUITER,
      tin: makeTin(UserRole.CORPORATE_RECRUITER, "corporaterecruiter.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (CORPORATE_RECRUITER 1)", corpRecruiter1.id);

  const recruiterProfile1 = await prisma.recruiterProfile.upsert({
    where: { userId: corpRecruiter1.id },
    update: {
      tenantId: recruiterTenant1.id,
      companyName: "Demo Corporation One",
      companySlug: "demo-corporation-one",
      isVerified: true,
      hiringNow: true
    },
    create: {
      userId: corpRecruiter1.id,
      tenantId: recruiterTenant1.id,
      companyName: "Demo Corporation One",
      companySlug: "demo-corporation-one",
      industry: "Technology",
      companySize: CompanySize.SIZE_51_200,
      isVerified: true,
      hiringNow: true
    }
  });
  logEntity("Demo RecruiterProfile 1", recruiterProfile1.id);

  const recruiterTenant2 = await prisma.tenant.upsert({
    where: { slug: "demo-corp-recruiter-2" },
    update: {
      name: "Demo Corp Recruiter 2",
      plan: Plan.BASIC,
      isActive: true
    },
    create: {
      name: "Demo Corp Recruiter 2",
      slug: "demo-corp-recruiter-2",
      plan: Plan.BASIC,
      isActive: true
    }
  });
  logEntity("Demo Tenant (Recruiter 2)", recruiterTenant2.id);

  const corpRecruiter2 = await prisma.user.upsert({
    where: { email: "corporaterecruiter.demo2@talentorx.local" },
    update: {
      tenantId: recruiterTenant2.id,
      firstName: "Corporate",
      lastName: "Recruiter Two",
      passwordHash: demoPasswordHash,
      role: UserRole.CORPORATE_RECRUITER,
      tin: makeTin(UserRole.CORPORATE_RECRUITER, "corporaterecruiter.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: recruiterTenant2.id,
      email: "corporaterecruiter.demo2@talentorx.local",
      firstName: "Corporate",
      lastName: "Recruiter Two",
      passwordHash: demoPasswordHash,
      role: UserRole.CORPORATE_RECRUITER,
      tin: makeTin(UserRole.CORPORATE_RECRUITER, "corporaterecruiter.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (CORPORATE_RECRUITER 2)", corpRecruiter2.id);

  const recruiterProfile2 = await prisma.recruiterProfile.upsert({
    where: { userId: corpRecruiter2.id },
    update: {
      tenantId: recruiterTenant2.id,
      companyName: "Demo Corporation Two",
      companySlug: "demo-corporation-two",
      isVerified: true,
      hiringNow: true
    },
    create: {
      userId: corpRecruiter2.id,
      tenantId: recruiterTenant2.id,
      companyName: "Demo Corporation Two",
      companySlug: "demo-corporation-two",
      industry: "Technology",
      companySize: CompanySize.SIZE_51_200,
      isVerified: true,
      hiringNow: true
    }
  });
  logEntity("Demo RecruiterProfile 2", recruiterProfile2.id);

  // Freelance Recruiter Demo Users (2)
  const freelanceTenant1 = await prisma.tenant.upsert({
    where: { slug: "demo-freelance-1" },
    update: {
      name: "Demo Freelance 1",
      plan: Plan.BASIC,
      isActive: true
    },
    create: {
      name: "Demo Freelance 1",
      slug: "demo-freelance-1",
      plan: Plan.BASIC,
      isActive: true
    }
  });
  logEntity("Demo Tenant (Freelance 1)", freelanceTenant1.id);

  const freelanceRecruiter1 = await prisma.user.upsert({
    where: { email: "freelancerecruiter.demo1@talentorx.local" },
    update: {
      tenantId: freelanceTenant1.id,
      firstName: "Freelance",
      lastName: "Recruiter One",
      passwordHash: demoPasswordHash,
      role: UserRole.FREELANCE_RECRUITER,
      tin: makeTin(UserRole.FREELANCE_RECRUITER, "freelancerecruiter.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: freelanceTenant1.id,
      email: "freelancerecruiter.demo1@talentorx.local",
      firstName: "Freelance",
      lastName: "Recruiter One",
      passwordHash: demoPasswordHash,
      role: UserRole.FREELANCE_RECRUITER,
      tin: makeTin(UserRole.FREELANCE_RECRUITER, "freelancerecruiter.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (FREELANCE_RECRUITER 1)", freelanceRecruiter1.id);

  const freelanceProfile1 = await prisma.freelanceRecruiterProfile.upsert({
    where: { userId: freelanceRecruiter1.id },
    update: {
      tenantId: freelanceTenant1.id,
      agencyName: "Demo Freelance Agency One",
      isAgency: true,
      isVerified: true,
      commissionPreference: CommissionType.PCT_OF_CTC,
      defaultCommissionValue: 10
    },
    create: {
      userId: freelanceRecruiter1.id,
      tenantId: freelanceTenant1.id,
      agencyName: "Demo Freelance Agency One",
      isAgency: true,
      isVerified: true,
      commissionPreference: CommissionType.PCT_OF_CTC,
      defaultCommissionValue: 10
    }
  });
  logEntity("Demo FreelanceRecruiterProfile 1", freelanceProfile1.id);

  const freelanceTenant2 = await prisma.tenant.upsert({
    where: { slug: "demo-freelance-2" },
    update: {
      name: "Demo Freelance 2",
      plan: Plan.BASIC,
      isActive: true
    },
    create: {
      name: "Demo Freelance 2",
      slug: "demo-freelance-2",
      plan: Plan.BASIC,
      isActive: true
    }
  });
  logEntity("Demo Tenant (Freelance 2)", freelanceTenant2.id);

  const freelanceRecruiter2 = await prisma.user.upsert({
    where: { email: "freelancerecruiter.demo2@talentorx.local" },
    update: {
      tenantId: freelanceTenant2.id,
      firstName: "Freelance",
      lastName: "Recruiter Two",
      passwordHash: demoPasswordHash,
      role: UserRole.FREELANCE_RECRUITER,
      tin: makeTin(UserRole.FREELANCE_RECRUITER, "freelancerecruiter.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: freelanceTenant2.id,
      email: "freelancerecruiter.demo2@talentorx.local",
      firstName: "Freelance",
      lastName: "Recruiter Two",
      passwordHash: demoPasswordHash,
      role: UserRole.FREELANCE_RECRUITER,
      tin: makeTin(UserRole.FREELANCE_RECRUITER, "freelancerecruiter.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (FREELANCE_RECRUITER 2)", freelanceRecruiter2.id);

  const freelanceProfile2 = await prisma.freelanceRecruiterProfile.upsert({
    where: { userId: freelanceRecruiter2.id },
    update: {
      tenantId: freelanceTenant2.id,
      agencyName: "Demo Freelance Agency Two",
      isAgency: true,
      isVerified: true,
      commissionPreference: CommissionType.PCT_OF_CTC,
      defaultCommissionValue: 10
    },
    create: {
      userId: freelanceRecruiter2.id,
      tenantId: freelanceTenant2.id,
      agencyName: "Demo Freelance Agency Two",
      isAgency: true,
      isVerified: true,
      commissionPreference: CommissionType.PCT_OF_CTC,
      defaultCommissionValue: 10
    }
  });
  logEntity("Demo FreelanceRecruiterProfile 2", freelanceProfile2.id);

  // Vendor Demo Users (2)
  const vendorTenant1 = await prisma.tenant.upsert({
    where: { slug: "demo-vendor-1" },
    update: {
      name: "Demo Vendor 1",
      plan: Plan.BASIC,
      isActive: true
    },
    create: {
      name: "Demo Vendor 1",
      slug: "demo-vendor-1",
      plan: Plan.BASIC,
      isActive: true
    }
  });
  logEntity("Demo Tenant (Vendor 1)", vendorTenant1.id);

  const vendor1 = await prisma.user.upsert({
    where: { email: "vendor.demo1@talentorx.local" },
    update: {
      tenantId: vendorTenant1.id,
      firstName: "Vendor",
      lastName: "Demo One",
      passwordHash: demoPasswordHash,
      role: UserRole.VENDOR,
      tin: makeTin(UserRole.VENDOR, "vendor.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: vendorTenant1.id,
      email: "vendor.demo1@talentorx.local",
      firstName: "Vendor",
      lastName: "Demo One",
      passwordHash: demoPasswordHash,
      role: UserRole.VENDOR,
      tin: makeTin(UserRole.VENDOR, "vendor.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (VENDOR 1)", vendor1.id);

  const vendorProfile1 = await prisma.vendorProfile.upsert({
    where: { userId: vendor1.id },
    update: {
      tenantId: vendorTenant1.id,
      vendorType: VendorType.DOCUMENT_VERIFIER,
      businessName: "Demo Vendor Services One",
      pricingModel: PricingModel.PER_REQUEST,
      basePrice: 499,
      isVerified: true,
      isActive: true
    },
    create: {
      userId: vendor1.id,
      tenantId: vendorTenant1.id,
      vendorType: VendorType.DOCUMENT_VERIFIER,
      businessName: "Demo Vendor Services One",
      pricingModel: PricingModel.PER_REQUEST,
      basePrice: 499,
      isVerified: true,
      isActive: true
    }
  });
  logEntity("Demo VendorProfile 1", vendorProfile1.id);

  const vendorTenant2 = await prisma.tenant.upsert({
    where: { slug: "demo-vendor-2" },
    update: {
      name: "Demo Vendor 2",
      plan: Plan.BASIC,
      isActive: true
    },
    create: {
      name: "Demo Vendor 2",
      slug: "demo-vendor-2",
      plan: Plan.BASIC,
      isActive: true
    }
  });
  logEntity("Demo Tenant (Vendor 2)", vendorTenant2.id);

  const vendor2 = await prisma.user.upsert({
    where: { email: "vendor.demo2@talentorx.local" },
    update: {
      tenantId: vendorTenant2.id,
      firstName: "Vendor",
      lastName: "Demo Two",
      passwordHash: demoPasswordHash,
      role: UserRole.VENDOR,
      tin: makeTin(UserRole.VENDOR, "vendor.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: vendorTenant2.id,
      email: "vendor.demo2@talentorx.local",
      firstName: "Vendor",
      lastName: "Demo Two",
      passwordHash: demoPasswordHash,
      role: UserRole.VENDOR,
      tin: makeTin(UserRole.VENDOR, "vendor.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (VENDOR 2)", vendor2.id);

  const vendorProfile2 = await prisma.vendorProfile.upsert({
    where: { userId: vendor2.id },
    update: {
      tenantId: vendorTenant2.id,
      vendorType: VendorType.BACKGROUND_CHECK,
      businessName: "Demo Vendor Services Two",
      pricingModel: PricingModel.PER_REQUEST,
      basePrice: 599,
      isVerified: true,
      isActive: true
    },
    create: {
      userId: vendor2.id,
      tenantId: vendorTenant2.id,
      vendorType: VendorType.BACKGROUND_CHECK,
      businessName: "Demo Vendor Services Two",
      pricingModel: PricingModel.PER_REQUEST,
      basePrice: 599,
      isVerified: true,
      isActive: true
    }
  });
  logEntity("Demo VendorProfile 2", vendorProfile2.id);

  // Training Partner Demo Users (2)
  const trainingTenant1 = await prisma.tenant.upsert({
    where: { slug: "demo-training-1" },
    update: {
      name: "Demo Training 1",
      plan: Plan.BASIC,
      isActive: true
    },
    create: {
      name: "Demo Training 1",
      slug: "demo-training-1",
      plan: Plan.BASIC,
      isActive: true
    }
  });
  logEntity("Demo Tenant (Training 1)", trainingTenant1.id);

  const trainingPartner1 = await prisma.user.upsert({
    where: { email: "trainingpartner.demo1@talentorx.local" },
    update: {
      tenantId: trainingTenant1.id,
      firstName: "Training",
      lastName: "Partner One",
      passwordHash: demoPasswordHash,
      role: UserRole.TRAINING_PARTNER,
      tin: makeTin(UserRole.TRAINING_PARTNER, "trainingpartner.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: trainingTenant1.id,
      email: "trainingpartner.demo1@talentorx.local",
      firstName: "Training",
      lastName: "Partner One",
      passwordHash: demoPasswordHash,
      role: UserRole.TRAINING_PARTNER,
      tin: makeTin(UserRole.TRAINING_PARTNER, "trainingpartner.demo1@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (TRAINING_PARTNER 1)", trainingPartner1.id);

  const trainingProfile1 = await prisma.trainingPartnerProfile.upsert({
    where: { userId: trainingPartner1.id },
    update: {
      tenantId: trainingTenant1.id,
      organizationName: "Demo Training Academy One",
      isVerified: true,
      platformFeePct: 15
    },
    create: {
      userId: trainingPartner1.id,
      tenantId: trainingTenant1.id,
      organizationName: "Demo Training Academy One",
      isVerified: true,
      platformFeePct: 15
    }
  });
  logEntity("Demo TrainingPartnerProfile 1", trainingProfile1.id);

  const trainingTenant2 = await prisma.tenant.upsert({
    where: { slug: "demo-training-2" },
    update: {
      name: "Demo Training 2",
      plan: Plan.BASIC,
      isActive: true
    },
    create: {
      name: "Demo Training 2",
      slug: "demo-training-2",
      plan: Plan.BASIC,
      isActive: true
    }
  });
  logEntity("Demo Tenant (Training 2)", trainingTenant2.id);

  const trainingPartner2 = await prisma.user.upsert({
    where: { email: "trainingpartner.demo2@talentorx.local" },
    update: {
      tenantId: trainingTenant2.id,
      firstName: "Training",
      lastName: "Partner Two",
      passwordHash: demoPasswordHash,
      role: UserRole.TRAINING_PARTNER,
      tin: makeTin(UserRole.TRAINING_PARTNER, "trainingpartner.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: trainingTenant2.id,
      email: "trainingpartner.demo2@talentorx.local",
      firstName: "Training",
      lastName: "Partner Two",
      passwordHash: demoPasswordHash,
      role: UserRole.TRAINING_PARTNER,
      tin: makeTin(UserRole.TRAINING_PARTNER, "trainingpartner.demo2@talentorx.local"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("Demo User (TRAINING_PARTNER 2)", trainingPartner2.id);

  const trainingProfile2 = await prisma.trainingPartnerProfile.upsert({
    where: { userId: trainingPartner2.id },
    update: {
      tenantId: trainingTenant2.id,
      organizationName: "Demo Training Academy Two",
      isVerified: true,
      platformFeePct: 15
    },
    create: {
      userId: trainingPartner2.id,
      tenantId: trainingTenant2.id,
      organizationName: "Demo Training Academy Two",
      isVerified: true,
      platformFeePct: 15
    }
  });
  logEntity("Demo TrainingPartnerProfile 2", trainingProfile2.id);

  console.log("\n=== DEMO USERS CREATED SUCCESSFULLY ===\n");
  console.log("Total: 16 demo users (2 per role)");
  console.log("Password for all: Talentor@123");
  console.log("\nDemo User Emails:");
  console.log("- superadmin.demo1@talentorx.local");
  console.log("- superadmin.demo2@talentorx.local");
  console.log("- collegeadmin.demo1@talentorx.local");
  console.log("- collegeadmin.demo2@talentorx.local");
  console.log("- student.demo1@talentorx.local");
  console.log("- student.demo2@talentorx.local");
  console.log("- jobseeker.demo1@talentorx.local");
  console.log("- jobseeker.demo2@talentorx.local");
  console.log("- corporaterecruiter.demo1@talentorx.local");
  console.log("- corporaterecruiter.demo2@talentorx.local");
  console.log("- freelancerecruiter.demo1@talentorx.local");
  console.log("- freelancerecruiter.demo2@talentorx.local");
  console.log("- vendor.demo1@talentorx.local");
  console.log("- vendor.demo2@talentorx.local");
  console.log("- trainingpartner.demo1@talentorx.local");
  console.log("- trainingpartner.demo2@talentorx.local");
}

main()
  .catch((error) => {
    console.error("Demo user seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
