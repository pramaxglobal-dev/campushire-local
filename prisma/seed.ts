import bcrypt from "bcrypt";
import { createHash } from "crypto";
import {
  ApplicationStatus,
  CompanySize,
  CommissionTrigger,
  CommissionType,
  JobStatus,
  JobType,
  OAuthProvider,
  Plan,
  PricingModel,
  ProfileVisibility,
  PrismaClient,
  UserRole,
  VendorType,
  WorkMode
} from "@prisma/client";

const prisma = new PrismaClient();
const PASSWORD_ROUNDS = 12;

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

const logEntity = (label: string, id: string): void => {
  console.log(`${label}: ${id}`);
};

const makeTin = (role: UserRole, seed: string): string => {
  const digest = createHash("sha256").update(`${role}:${seed}`).digest("hex");
  return `${tinPrefixByRole[role]}-${digest.slice(0, 8).toUpperCase()}`;
};

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
};

const studentFirstNames = [
  "Aarav",
  "Ishita",
  "Rohan",
  "Priya",
  "Kartik",
  "Meera",
  "Aditya",
  "Sneha",
  "Yash",
  "Naina",
  "Vikram",
  "Ananya",
  "Kabir",
  "Ritika",
  "Dev",
  "Sanya",
  "Harsh",
  "Pooja",
  "Arjun",
  "Tanvi"
];

const studentLastNames = [
  "Sharma",
  "Gupta",
  "Verma",
  "Nair",
  "Reddy",
  "Iyer",
  "Mishra",
  "Kapoor",
  "Joshi",
  "Saxena",
  "Bhatia",
  "Menon",
  "Dubey",
  "Chopra",
  "Mehta",
  "Malhotra",
  "Pillai",
  "Singh",
  "Agarwal",
  "Kulkarni"
];

const studentSkillSets = [
  ["JavaScript", "React", "Node.js"],
  ["Python", "FastAPI", "PostgreSQL"],
  ["Java", "Spring Boot", "MySQL"],
  ["C++", "Data Structures", "Algorithms"],
  ["UI Design", "Figma", "Design Systems"],
  ["Data Analysis", "Pandas", "SQL"],
  ["Cloud", "AWS", "Docker"],
  ["Testing", "Jest", "Cypress"],
  ["Mobile", "React Native", "Expo"],
  ["AI", "Machine Learning", "TensorFlow"]
];

const growthFeatureKeys = [
  "ADVANCED_ANALYTICS",
  "FREELANCE_REFERRALS",
  "COURSE_MARKETPLACE",
  "VENDOR_MARKETPLACE",
  "WHITE_LABEL_BRANDING"
];

const enterpriseFeatureKeys = [
  "ADVANCED_ANALYTICS",
  "FREELANCE_REFERRALS",
  "COURSE_MARKETPLACE",
  "VENDOR_MARKETPLACE",
  "WHITE_LABEL_BRANDING",
  "CUSTOM_DOMAIN",
  "SAML_SSO",
  "API_ACCESS",
  "MULTI_BRAND_THEMES",
  "PREDICTIVE_AI_MATCHING"
];

const createOrUpdateFeatureFlag = async (
  key: string,
  plan: Plan,
  isEnabled: boolean,
  description: string
) => {
  const existing = await prisma.featureFlag.findFirst({
    where: {
      tenantId: null,
      key,
      plan
    }
  });

  const featureFlag = existing
    ? await prisma.featureFlag.update({
        where: { id: existing.id },
        data: {
          isEnabled,
          description
        }
      })
    : await prisma.featureFlag.create({
        data: {
          tenantId: null,
          key,
          plan,
          isEnabled,
          description
        }
      });
  logEntity(`FeatureFlag(${plan}:${key})`, featureFlag.id);
};

async function main() {
  const adminPasswordHash = await hashPassword("Admin@123");
  const defaultUserPasswordHash = await hashPassword("Campus@123");

  const platformName = await prisma.platformSetting.upsert({
    where: { key: "PLATFORM_NAME" },
    update: {
      value: "CampusHire",
      description: "Primary platform display name."
    },
    create: {
      key: "PLATFORM_NAME",
      value: "CampusHire",
      description: "Primary platform display name."
    }
  });
  logEntity("PlatformSetting(PLATFORM_NAME)", platformName.id);

  const supportEmail = await prisma.platformSetting.upsert({
    where: { key: "SUPPORT_EMAIL" },
    update: {
      value: "support@campushire.in",
      description: "Primary support mailbox."
    },
    create: {
      key: "SUPPORT_EMAIL",
      value: "support@campushire.in",
      description: "Primary support mailbox."
    }
  });
  logEntity("PlatformSetting(SUPPORT_EMAIL)", supportEmail.id);

  const defaultCommissionRates = await prisma.platformSetting.upsert({
    where: { key: "DEFAULT_COMMISSION_RATES" },
    update: {
      value: {
        freelanceRecruiterPct: 12,
        trainingPartnerPct: 15,
        vendorServicePct: 10
      },
      description: "Default platform commission rates."
    },
    create: {
      key: "DEFAULT_COMMISSION_RATES",
      value: {
        freelanceRecruiterPct: 12,
        trainingPartnerPct: 15,
        vendorServicePct: 10
      },
      description: "Default platform commission rates."
    }
  });
  logEntity("PlatformSetting(DEFAULT_COMMISSION_RATES)", defaultCommissionRates.id);

  for (const key of growthFeatureKeys) {
    await createOrUpdateFeatureFlag(
      key,
      Plan.GROWTH,
      true,
      `Growth plan feature: ${key.toLowerCase().replace(/_/g, " ")}.`
    );
  }

  for (const key of enterpriseFeatureKeys) {
    await createOrUpdateFeatureFlag(
      key,
      Plan.ENTERPRISE,
      true,
      `Enterprise plan feature: ${key.toLowerCase().replace(/_/g, " ")}.`
    );
  }

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@campushire.in" },
    update: {
      firstName: "Campus",
      lastName: "Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      tin: makeTin(UserRole.SUPER_ADMIN, "admin@campushire.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true,
      profileVisibility: ProfileVisibility.PRIVATE
    },
    create: {
      email: "admin@campushire.in",
      firstName: "Campus",
      lastName: "Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      tin: makeTin(UserRole.SUPER_ADMIN, "admin@campushire.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true,
      profileVisibility: ProfileVisibility.PRIVATE
    }
  });
  logEntity("User(SUPER_ADMIN)", superAdmin.id);

  const iitTenant = await prisma.tenant.upsert({
    where: { slug: "iit-delhi" },
    update: {
      name: "IIT Delhi",
      plan: Plan.GROWTH,
      isActive: true,
      supportEmail: "placement@iitd.ac.in"
    },
    create: {
      name: "IIT Delhi",
      slug: "iit-delhi",
      plan: Plan.GROWTH,
      isActive: true,
      supportEmail: "placement@iitd.ac.in"
    }
  });
  logEntity("Tenant(IIT Delhi)", iitTenant.id);

  const iimTenant = await prisma.tenant.upsert({
    where: { slug: "iim-ahmedabad" },
    update: {
      name: "IIM Ahmedabad",
      plan: Plan.GROWTH,
      isActive: true,
      supportEmail: "placements@iima.ac.in"
    },
    create: {
      name: "IIM Ahmedabad",
      slug: "iim-ahmedabad",
      plan: Plan.GROWTH,
      isActive: true,
      supportEmail: "placements@iima.ac.in"
    }
  });
  logEntity("Tenant(IIM Ahmedabad)", iimTenant.id);

  const iitAdmin = await prisma.user.upsert({
    where: { email: "admin@iitd.ac.in" },
    update: {
      tenantId: iitTenant.id,
      firstName: "Placement",
      lastName: "IITD",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.COLLEGE_ADMIN,
      tin: makeTin(UserRole.COLLEGE_ADMIN, "admin@iitd.ac.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: iitTenant.id,
      email: "admin@iitd.ac.in",
      firstName: "Placement",
      lastName: "IITD",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.COLLEGE_ADMIN,
      tin: makeTin(UserRole.COLLEGE_ADMIN, "admin@iitd.ac.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("User(College Admin IIT Delhi)", iitAdmin.id);

  const iimAdmin = await prisma.user.upsert({
    where: { email: "admin@iima.ac.in" },
    update: {
      tenantId: iimTenant.id,
      firstName: "Placement",
      lastName: "IIMA",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.COLLEGE_ADMIN,
      tin: makeTin(UserRole.COLLEGE_ADMIN, "admin@iima.ac.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: iimTenant.id,
      email: "admin@iima.ac.in",
      firstName: "Placement",
      lastName: "IIMA",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.COLLEGE_ADMIN,
      tin: makeTin(UserRole.COLLEGE_ADMIN, "admin@iima.ac.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("User(College Admin IIM Ahmedabad)", iimAdmin.id);

  const iitCollege = await prisma.collegeProfile.upsert({
    where: { slug: "iit-delhi" },
    update: {
      tenantId: iitTenant.id,
      adminUserId: iitAdmin.id,
      name: "IIT Delhi",
      openForPlacement: true,
      website: "https://home.iitd.ac.in",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      streams: {
        engineering: ["Computer Science", "Electrical", "Mechanical"],
        management: ["Technology Management"]
      }
    },
    create: {
      tenantId: iitTenant.id,
      adminUserId: iitAdmin.id,
      name: "IIT Delhi",
      slug: "iit-delhi",
      openForPlacement: true,
      website: "https://home.iitd.ac.in",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      streams: {
        engineering: ["Computer Science", "Electrical", "Mechanical"],
        management: ["Technology Management"]
      }
    }
  });
  logEntity("CollegeProfile(IIT Delhi)", iitCollege.id);

  const iimCollege = await prisma.collegeProfile.upsert({
    where: { slug: "iim-ahmedabad" },
    update: {
      tenantId: iimTenant.id,
      adminUserId: iimAdmin.id,
      name: "IIM Ahmedabad",
      openForPlacement: true,
      website: "https://www.iima.ac.in",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      streams: {
        management: ["MBA", "PGP-FABM"],
        analytics: ["Business Analytics"]
      }
    },
    create: {
      tenantId: iimTenant.id,
      adminUserId: iimAdmin.id,
      name: "IIM Ahmedabad",
      slug: "iim-ahmedabad",
      openForPlacement: true,
      website: "https://www.iima.ac.in",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      streams: {
        management: ["MBA", "PGP-FABM"],
        analytics: ["Business Analytics"]
      }
    }
  });
  logEntity("CollegeProfile(IIM Ahmedabad)", iimCollege.id);

  const iitInviteCodes = ["IITD26A1", "IITD26B1", "IITD26C1"];
  const iimInviteCodes = ["IIMA26A1", "IIMA26B1", "IIMA26C1"];

  const iitInvites = [];
  for (const code of iitInviteCodes) {
    const invite = await prisma.invite.upsert({
      where: { code },
      update: {
        tenantId: iitTenant.id,
        collegeProfileId: iitCollege.id,
        createdByUserId: iitAdmin.id,
        maxUses: 50,
        isActive: true
      },
      create: {
        tenantId: iitTenant.id,
        collegeProfileId: iitCollege.id,
        code,
        maxUses: 50,
        createdByUserId: iitAdmin.id,
        isActive: true
      }
    });
    iitInvites.push(invite);
    logEntity(`Invite(${code})`, invite.id);
  }

  const iimInvites = [];
  for (const code of iimInviteCodes) {
    const invite = await prisma.invite.upsert({
      where: { code },
      update: {
        tenantId: iimTenant.id,
        collegeProfileId: iimCollege.id,
        createdByUserId: iimAdmin.id,
        maxUses: 50,
        isActive: true
      },
      create: {
        tenantId: iimTenant.id,
        collegeProfileId: iimCollege.id,
        code,
        maxUses: 50,
        createdByUserId: iimAdmin.id,
        isActive: true
      }
    });
    iimInvites.push(invite);
    logEntity(`Invite(${code})`, invite.id);
  }

  const studentUsers = [];
  for (let i = 0; i < 20; i += 1) {
    const inFirstCollege = i < 10;
    const tenant = inFirstCollege ? iitTenant : iimTenant;
    const college = inFirstCollege ? iitCollege : iimCollege;
    const invitePool = inFirstCollege ? iitInvites : iimInvites;
    const invite = invitePool[i % 3];
    const firstName = studentFirstNames[i];
    const lastName = studentLastNames[i];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.campushire.in`;
    const year = inFirstCollege ? 2027 : 2026;
    const program = inFirstCollege ? "B.Tech" : "MBA";
    const department = inFirstCollege ? "Computer Science" : "Business Analytics";
    const score = 45 + ((i * 7) % 41);
    const skillSet = studentSkillSets[i % studentSkillSets.length];

    const student = await prisma.user.upsert({
      where: { email },
      update: {
        tenantId: tenant.id,
        firstName,
        lastName,
        passwordHash: defaultUserPasswordHash,
        role: UserRole.STUDENT,
        tin: makeTin(UserRole.STUDENT, email),
        isApproved: true,
        isEmailVerified: true,
        isActive: true
      },
      create: {
        tenantId: tenant.id,
        email,
        firstName,
        lastName,
        passwordHash: defaultUserPasswordHash,
        role: UserRole.STUDENT,
        tin: makeTin(UserRole.STUDENT, email),
        isApproved: true,
        isEmailVerified: true,
        isActive: true
      }
    });
    logEntity(`User(Student ${i + 1})`, student.id);

    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId: student.id },
      update: {
        tenantId: tenant.id,
        collegeProfileId: college.id,
        enrollmentNumber: `${college.slug.toUpperCase().replace(/-/g, "")}-${i + 1}`.slice(0, 30),
        program,
        department,
        yearOfStudy: inFirstCollege ? 3 : 2,
        graduationYear: year,
        cgpa: 7.2 + ((i % 7) * 0.2),
        skills: {
          primary: skillSet,
          tools: ["Git", "Postman", "Excel"],
          softSkills: ["Communication", "Teamwork", "Problem Solving"]
        },
        resumeUrl: `https://assets.campushire.in/resumes/${student.id}.pdf`,
        careerScore: score,
        isProfileComplete: true
      },
      create: {
        userId: student.id,
        tenantId: tenant.id,
        collegeProfileId: college.id,
        enrollmentNumber: `${college.slug.toUpperCase().replace(/-/g, "")}-${i + 1}`.slice(0, 30),
        program,
        department,
        yearOfStudy: inFirstCollege ? 3 : 2,
        graduationYear: year,
        cgpa: 7.2 + ((i % 7) * 0.2),
        skills: {
          primary: skillSet,
          tools: ["Git", "Postman", "Excel"],
          softSkills: ["Communication", "Teamwork", "Problem Solving"]
        },
        resumeUrl: `https://assets.campushire.in/resumes/${student.id}.pdf`,
        careerScore: score,
        isProfileComplete: true
      }
    });
    logEntity(`StudentProfile(${student.email})`, studentProfile.id);

    await prisma.inviteUse.upsert({
      where: {
        inviteId_usedByUserId: {
          inviteId: invite.id,
          usedByUserId: student.id
        }
      },
      update: {},
      create: {
        inviteId: invite.id,
        usedByUserId: student.id
      }
    });

    studentUsers.push(student);
  }

  for (const invite of [...iitInvites, ...iimInvites]) {
    const usedCount = await prisma.inviteUse.count({ where: { inviteId: invite.id } });
    const updatedInvite = await prisma.invite.update({
      where: { id: invite.id },
      data: { usedCount }
    });
    logEntity(`InviteUsedCount(${updatedInvite.code})`, updatedInvite.id);
  }

  const recruiterData = [
    {
      email: "recruiter@techcorp.in",
      firstName: "Rahul",
      lastName: "Khanna",
      companyName: "TechCorp",
      companySlug: "techcorp",
      hiringNow: true
    },
    {
      email: "recruiter@financehub.in",
      firstName: "Neha",
      lastName: "Kapadia",
      companyName: "FinanceHub",
      companySlug: "financehub",
      hiringNow: false
    },
    {
      email: "recruiter@designstudio.in",
      firstName: "Amit",
      lastName: "Bose",
      companyName: "DesignStudio",
      companySlug: "designstudio",
      hiringNow: false
    }
  ];

  const recruiters = [];
  for (const recruiterInfo of recruiterData) {
    const tenantSlug = recruiterInfo.companySlug;
    const recruiterTenant = await prisma.tenant.upsert({
      where: { slug: tenantSlug },
      update: {
        name: recruiterInfo.companyName,
        plan: Plan.BASIC,
        isActive: true
      },
      create: {
        name: recruiterInfo.companyName,
        slug: tenantSlug,
        plan: Plan.BASIC,
        isActive: true
      }
    });
    logEntity(`Tenant(${recruiterInfo.companyName})`, recruiterTenant.id);

    const recruiterUser = await prisma.user.upsert({
      where: { email: recruiterInfo.email },
      update: {
        tenantId: recruiterTenant.id,
        firstName: recruiterInfo.firstName,
        lastName: recruiterInfo.lastName,
        passwordHash: defaultUserPasswordHash,
        role: UserRole.CORPORATE_RECRUITER,
        tin: makeTin(UserRole.CORPORATE_RECRUITER, recruiterInfo.email),
        isApproved: true,
        isEmailVerified: true,
        isActive: true
      },
      create: {
        tenantId: recruiterTenant.id,
        email: recruiterInfo.email,
        firstName: recruiterInfo.firstName,
        lastName: recruiterInfo.lastName,
        passwordHash: defaultUserPasswordHash,
        role: UserRole.CORPORATE_RECRUITER,
        tin: makeTin(UserRole.CORPORATE_RECRUITER, recruiterInfo.email),
        isApproved: true,
        isEmailVerified: true,
        isActive: true
      }
    });
    logEntity(`User(Recruiter ${recruiterInfo.companyName})`, recruiterUser.id);

    const recruiterProfile = await prisma.recruiterProfile.upsert({
      where: { userId: recruiterUser.id },
      update: {
        tenantId: recruiterTenant.id,
        companyName: recruiterInfo.companyName,
        companySlug: recruiterInfo.companySlug,
        industry: "Technology",
        hiringNow: recruiterInfo.hiringNow,
        isVerified: true,
        companySize: CompanySize.SIZE_51_200,
        website: `https://www.${recruiterInfo.companySlug}.in`,
        openJobsCount: 0
      },
      create: {
        userId: recruiterUser.id,
        tenantId: recruiterTenant.id,
        companyName: recruiterInfo.companyName,
        companySlug: recruiterInfo.companySlug,
        industry: "Technology",
        hiringNow: recruiterInfo.hiringNow,
        isVerified: true,
        companySize: CompanySize.SIZE_51_200,
        website: `https://www.${recruiterInfo.companySlug}.in`,
        openJobsCount: 0
      }
    });
    logEntity(`RecruiterProfile(${recruiterInfo.companyName})`, recruiterProfile.id);

    recruiters.push({ tenant: recruiterTenant, user: recruiterUser, profile: recruiterProfile });
  }

  const jobsPayload = [
    {
      title: "Software Engineering Intern",
      slug: "software-engineering-intern-techcorp",
      tenant: recruiters[0].tenant,
      profile: recruiters[0].profile,
      createdBy: recruiters[0].user,
      jobType: JobType.INTERNSHIP,
      status: JobStatus.ACTIVE,
      workMode: WorkMode.HYBRID,
      minCtc: 600000,
      maxCtc: 900000
    },
    {
      title: "Backend Developer",
      slug: "backend-developer-techcorp",
      tenant: recruiters[0].tenant,
      profile: recruiters[0].profile,
      createdBy: recruiters[0].user,
      jobType: JobType.FULL_TIME,
      status: JobStatus.ACTIVE,
      workMode: WorkMode.REMOTE,
      minCtc: 1200000,
      maxCtc: 1800000
    },
    {
      title: "Financial Analyst",
      slug: "financial-analyst-financehub",
      tenant: recruiters[1].tenant,
      profile: recruiters[1].profile,
      createdBy: recruiters[1].user,
      jobType: JobType.FULL_TIME,
      status: JobStatus.ACTIVE,
      workMode: WorkMode.ONSITE,
      minCtc: 900000,
      maxCtc: 1400000
    },
    {
      title: "Product Design Intern",
      slug: "product-design-intern-designstudio",
      tenant: recruiters[2].tenant,
      profile: recruiters[2].profile,
      createdBy: recruiters[2].user,
      jobType: JobType.INTERNSHIP,
      status: JobStatus.DRAFT,
      workMode: WorkMode.HYBRID,
      minCtc: 400000,
      maxCtc: 650000
    },
    {
      title: "UI Engineer",
      slug: "ui-engineer-designstudio",
      tenant: recruiters[2].tenant,
      profile: recruiters[2].profile,
      createdBy: recruiters[2].user,
      jobType: JobType.FULL_TIME,
      status: JobStatus.PAUSED,
      workMode: WorkMode.REMOTE,
      minCtc: 1000000,
      maxCtc: 1500000
    }
  ];

  const jobs = [];
  for (const jobInfo of jobsPayload) {
    const job = await prisma.job.upsert({
      where: { slug: jobInfo.slug },
      update: {
        tenantId: jobInfo.tenant.id,
        recruiterProfileId: jobInfo.profile.id,
        createdByUserId: jobInfo.createdBy.id,
        title: jobInfo.title,
        description: `${jobInfo.title} role with structured hiring pipeline and measurable outcomes.`,
        jobType: jobInfo.jobType,
        status: jobInfo.status,
        workMode: jobInfo.workMode,
        minCtc: jobInfo.minCtc,
        maxCtc: jobInfo.maxCtc,
        currency: "INR",
        openings: 3,
        isPublished: jobInfo.status === JobStatus.ACTIVE,
        screeningQuestions: [
          {
            question: "Describe one project relevant to this role.",
            required: true
          },
          {
            question: "What is your expected joining timeline?",
            required: true
          },
          {
            question: "Which core tools or frameworks are you strongest in?",
            required: true
          }
        ],
        skillsRequired: ["Communication", "Problem Solving", "Team Collaboration"]
      },
      create: {
        tenantId: jobInfo.tenant.id,
        recruiterProfileId: jobInfo.profile.id,
        createdByUserId: jobInfo.createdBy.id,
        title: jobInfo.title,
        slug: jobInfo.slug,
        description: `${jobInfo.title} role with structured hiring pipeline and measurable outcomes.`,
        jobType: jobInfo.jobType,
        status: jobInfo.status,
        workMode: jobInfo.workMode,
        minCtc: jobInfo.minCtc,
        maxCtc: jobInfo.maxCtc,
        currency: "INR",
        openings: 3,
        isPublished: jobInfo.status === JobStatus.ACTIVE,
        screeningQuestions: [
          {
            question: "Describe one project relevant to this role.",
            required: true
          },
          {
            question: "What is your expected joining timeline?",
            required: true
          },
          {
            question: "Which core tools or frameworks are you strongest in?",
            required: true
          }
        ],
        skillsRequired: ["Communication", "Problem Solving", "Team Collaboration"],
        referralCommissionType: CommissionType.PCT_OF_CTC,
        referralCommissionValue: 8,
        referralCommissionTrigger: CommissionTrigger.ON_JOINING,
        isFreelanceReferralAllowed: true
      }
    });
    jobs.push(job);
    logEntity(`Job(${job.title})`, job.id);
  }

  const activeJobs = jobs.filter((job) => job.status === JobStatus.ACTIVE);
  const applicationStatuses: ApplicationStatus[] = [
    ApplicationStatus.APPLIED,
    ApplicationStatus.SCREENING,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW_R1,
    ApplicationStatus.INTERVIEW_R2,
    ApplicationStatus.OFFERED,
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.ON_HOLD
  ];

  for (let i = 0; i < 8; i += 1) {
    const candidate = studentUsers[i];
    const job = activeJobs[i % activeJobs.length];
    const status = applicationStatuses[i];
    const application = await prisma.application.upsert({
      where: {
        jobId_candidateUserId: {
          jobId: job.id,
          candidateUserId: candidate.id
        }
      },
      update: {
        tenantId: job.tenantId,
        status,
        source: "college_portal",
        coverLetter: `Interested in ${job.title} and aligned with required skills.`,
        screeningAnswers: {
          q1: "Worked on production-ready full stack projects.",
          q2: "Available to join within four weeks."
        }
      },
      create: {
        tenantId: job.tenantId,
        jobId: job.id,
        candidateUserId: candidate.id,
        status,
        source: "college_portal",
        coverLetter: `Interested in ${job.title} and aligned with required skills.`,
        screeningAnswers: {
          q1: "Worked on production-ready full stack projects.",
          q2: "Available to join within four weeks."
        }
      }
    });
    logEntity(`Application(${candidate.email} -> ${job.slug})`, application.id);
  }

  const freelanceTenant = await prisma.tenant.upsert({
    where: { slug: "freelance-bridge" },
    update: { name: "Freelance Bridge", plan: Plan.BASIC, isActive: true },
    create: { name: "Freelance Bridge", slug: "freelance-bridge", plan: Plan.BASIC, isActive: true }
  });
  logEntity("Tenant(Freelance Bridge)", freelanceTenant.id);

  const freelanceUser = await prisma.user.upsert({
    where: { email: "freelance@campushire.in" },
    update: {
      tenantId: freelanceTenant.id,
      firstName: "Freelance",
      lastName: "Recruiter",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.FREELANCE_RECRUITER,
      tin: makeTin(UserRole.FREELANCE_RECRUITER, "freelance@campushire.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: freelanceTenant.id,
      email: "freelance@campushire.in",
      firstName: "Freelance",
      lastName: "Recruiter",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.FREELANCE_RECRUITER,
      tin: makeTin(UserRole.FREELANCE_RECRUITER, "freelance@campushire.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("User(Freelance Recruiter)", freelanceUser.id);

  const freelanceProfile = await prisma.freelanceRecruiterProfile.upsert({
    where: { userId: freelanceUser.id },
    update: {
      tenantId: freelanceTenant.id,
      agencyName: "Freelance Bridge",
      isAgency: true,
      isVerified: true,
      commissionPreference: CommissionType.PCT_OF_CTC,
      defaultCommissionValue: 10
    },
    create: {
      userId: freelanceUser.id,
      tenantId: freelanceTenant.id,
      agencyName: "Freelance Bridge",
      isAgency: true,
      isVerified: true,
      commissionPreference: CommissionType.PCT_OF_CTC,
      defaultCommissionValue: 10
    }
  });
  logEntity("FreelanceRecruiterProfile", freelanceProfile.id);

  const vendorTenant = await prisma.tenant.upsert({
    where: { slug: "docsure-verification" },
    update: { name: "DocSure Verification", plan: Plan.BASIC, isActive: true },
    create: { name: "DocSure Verification", slug: "docsure-verification", plan: Plan.BASIC, isActive: true }
  });
  logEntity("Tenant(DocSure Verification)", vendorTenant.id);

  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@docsure.in" },
    update: {
      tenantId: vendorTenant.id,
      firstName: "DocSure",
      lastName: "Vendor",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.VENDOR,
      tin: makeTin(UserRole.VENDOR, "vendor@docsure.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: vendorTenant.id,
      email: "vendor@docsure.in",
      firstName: "DocSure",
      lastName: "Vendor",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.VENDOR,
      tin: makeTin(UserRole.VENDOR, "vendor@docsure.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("User(Vendor)", vendorUser.id);

  const vendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {
      tenantId: vendorTenant.id,
      vendorType: VendorType.DOCUMENT_VERIFIER,
      businessName: "DocSure Verification",
      pricingModel: PricingModel.PER_REQUEST,
      basePrice: 499,
      isVerified: true,
      isActive: true
    },
    create: {
      userId: vendorUser.id,
      tenantId: vendorTenant.id,
      vendorType: VendorType.DOCUMENT_VERIFIER,
      businessName: "DocSure Verification",
      pricingModel: PricingModel.PER_REQUEST,
      basePrice: 499,
      isVerified: true,
      isActive: true
    }
  });
  logEntity("VendorProfile", vendorProfile.id);

  const trainingTenant = await prisma.tenant.upsert({
    where: { slug: "skillforge-academy" },
    update: { name: "SkillForge Academy", plan: Plan.BASIC, isActive: true },
    create: { name: "SkillForge Academy", slug: "skillforge-academy", plan: Plan.BASIC, isActive: true }
  });
  logEntity("Tenant(SkillForge Academy)", trainingTenant.id);

  const trainingUser = await prisma.user.upsert({
    where: { email: "partner@skillforge.in" },
    update: {
      tenantId: trainingTenant.id,
      firstName: "SkillForge",
      lastName: "Partner",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.TRAINING_PARTNER,
      tin: makeTin(UserRole.TRAINING_PARTNER, "partner@skillforge.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    },
    create: {
      tenantId: trainingTenant.id,
      email: "partner@skillforge.in",
      firstName: "SkillForge",
      lastName: "Partner",
      passwordHash: defaultUserPasswordHash,
      role: UserRole.TRAINING_PARTNER,
      tin: makeTin(UserRole.TRAINING_PARTNER, "partner@skillforge.in"),
      isApproved: true,
      isEmailVerified: true,
      isActive: true
    }
  });
  logEntity("User(Training Partner)", trainingUser.id);

  const trainingProfile = await prisma.trainingPartnerProfile.upsert({
    where: { userId: trainingUser.id },
    update: {
      tenantId: trainingTenant.id,
      organizationName: "SkillForge Academy",
      website: "https://www.skillforge.in",
      isVerified: true,
      platformFeePct: 15
    },
    create: {
      userId: trainingUser.id,
      tenantId: trainingTenant.id,
      organizationName: "SkillForge Academy",
      website: "https://www.skillforge.in",
      isVerified: true,
      platformFeePct: 15
    }
  });
  logEntity("TrainingPartnerProfile", trainingProfile.id);

  console.log(
    `INVITE CODES FOR TESTING: college1: [${iitInviteCodes.join(", ")}], college2: [${iimInviteCodes.join(", ")}]`
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
