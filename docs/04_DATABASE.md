# 05 Database Inventory

## Prisma model inventory summary
- Total Prisma models: 45
- Source of truth: prisma/schema.prisma

Evidence:
- prisma/schema.prisma
- audit_prisma_models.json
- audit_model_usage_counts.json
- audit_service_models.json

## All models, relationships, and usage signals
| Model | Field Count | Relation Summary | Index / Unique Summary | Tenant Linkage | Usage Signal |
|---|---|---|---|---|---|
| ActivityLog | 12 | tenant      Tenant?  @relation(fields: [tenantId], references: [id], onDelete: SetNull) ; user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull) | @@index([tenantId]) ; @@index([userId]) ; @@index([entityType]) ; @@index([entityId]) ; @@index([createdAt]) | Yes | apps/api/src/lib/activity.ts, apps/api/src/middleware/request-logger.ts, apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/users/users.service.ts |
| AIMatchScore | 16 | tenant           Tenant?   @relation(fields: [tenantId], references: [id], onDelete: SetNull) ; job              Job       @relation(fields: [jobId], references: [id], onDelete: Cascade) ; application      Application? @relation(fields: [applicationId], references: [id], onDelete: SetNull) | @@index([tenantId]) ; @@index([jobId]) ; @@index([applicationId]) ; @@index([candidateUserId]) ; @@index([score]) ; @@unique([jobId, candidateUserId]) | Yes | apps/api/src/lib/ai.ts, apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/applications/applications.service.ts, apps/api/src/modules/ats/ats.service.ts, apps/api/src/modules/jobs/jobs.service.ts |
| Application | 22 | status              ApplicationStatus  @default(APPLIED) ; tenant              Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade) ; job                 Job                @relation(fields: [jobId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([jobId]) ; @@index([candidateUserId]) ; @@index([status]) ; @@index([appliedAt]) ; @@unique([jobId, candidateUserId]) | Yes | apps/api/src/docs/swagger.ts, apps/api/src/lib/ai.ts, apps/api/src/lib/mailer.ts, apps/api/src/lib/notification.ts, apps/api/src/lib/whatsapp.ts |
| ApplicationStatusHistory | 9 | fromStatus    ApplicationStatus? @map("from_status") ; toStatus      ApplicationStatus @map("to_status") ; application   Application       @relation(fields: [applicationId], references: [id], onDelete: Cascade) | @@index([applicationId]) ; @@index([changedByUserId]) ; @@index([toStatus]) | No | apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/applications/applications.service.ts, apps/api/src/modules/ats/ats.service.ts, apps/api/src/modules/freelance/freelance.service.ts, apps/api/src/modules/interviews/interviews.service.ts |
| CandidateCertification | 12 | user             User      @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) ; @@index([expiryDate]) | No | apps/web/src/lib/utils/profile-types.ts |
| CandidateEducation | 12 | user         User      @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) ; @@index([endDate]) | No | apps/web/src/lib/utils/profile-types.ts |
| CandidateExperience | 13 | user             User      @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) ; @@index([isCurrent]) | No | apps/web/src/lib/utils/profile-types.ts |
| CandidateProject | 12 | user             User      @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) | No | apps/web/src/lib/utils/profile-types.ts |
| ChatMessage | 16 | messageType   MessageType  @map("message_type") ; tenant        Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade) ; thread        ChatThread   @relation(fields: [threadId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([threadId]) ; @@index([senderUserId]) ; @@index([readByUserId]) ; @@index([messageType]) ; @@index([createdAt]) | Yes | apps/api/src/modules/chat/chat.service.ts, apps/web/src/components/chat/ChatWindow.tsx, apps/web/src/components/chat/MessageBubble.tsx, apps/web/src/lib/api/chat.api.ts |
| ChatThread | 20 | contextType                 ChatContextType   @map("context_type") ; tenant                      Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade) ; application                 Application?      @relation(fields: [applicationId], references: [id], onDelete: SetNull) | @@index([tenantId]) ; @@index([applicationId]) ; @@index([referralId]) ; @@index([serviceRequestId]) ; @@index([collegeRecruiterConnectionId]) ; @@index([createdByUserId]) ; @@index([contextType]) ; @@index([isClosed]) | Yes | apps/api/src/lib/socket.ts, apps/api/src/modules/chat/chat.service.ts, apps/web/src/lib/api/chat.api.ts |
| CollegeProfile | 27 | tenant           Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade) ; adminUser        User                        @relation("college_admin_user", fields: [adminUserId], references: [id], onDelete: Cascade) ; students         StudentProfile[] | @@index([tenantId]) ; @@index([openForPlacement]) | Yes | apps/api/src/lib/notification.ts, apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/ats/ats.service.ts, apps/api/src/modules/auth/auth.service.ts |
| CollegeRecruiterConnection | 17 | status            ConnectionStatus @default(PENDING) ; tenant            Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade) ; collegeProfile    CollegeProfile   @relation(fields: [collegeProfileId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([status]) ; @@index([initiatedByUserId]) ; @@index([respondedByUserId]) ; @@unique([collegeProfileId, recruiterProfileId]) | Yes | apps/api/src/modules/chat/chat.service.ts, apps/api/src/modules/connections/connections.service.ts |
| Course | 22 | level                   CourseLevel ; mode                    CourseMode ; tenant                  Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([trainingPartnerProfileId]) ; @@index([createdByUserId]) ; @@index([level]) ; @@index([mode]) ; @@index([isActive]) | Yes | apps/ai/app/services/recommendations.py, apps/api/src/modules/payments/payments.routes.ts, apps/api/src/modules/payments/payments.service.ts, apps/api/src/modules/training/training.controller.ts, apps/api/src/modules/training/training.service.ts |
| CourseEnrollment | 13 | status          EnrollmentStatus @default(ENROLLED) ; course          Course          @relation(fields: [courseId], references: [id], onDelete: Cascade) ; user            User            @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([courseId]) ; @@index([userId]) ; @@index([status]) ; @@unique([courseId, userId]) | No | apps/api/src/modules/payments/payments.service.ts, apps/api/src/modules/training/training.service.ts, apps/web/src/lib/api/payments.api.ts, apps/web/src/lib/api/training.api.ts |
| CourseRevenue | 15 | paymentStatus            PaymentStatus   @default(PENDING) @map("payment_status") ; course                   Course          @relation(fields: [courseId], references: [id], onDelete: Cascade) ; enrollment               CourseEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade) | @@index([courseId]) ; @@index([enrollmentId]) ; @@index([trainingPartnerProfileId]) ; @@index([paymentStatus]) | No | apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/payments/payments.service.ts, apps/api/src/modules/training/training.service.ts |
| DocumentVerification | 16 | status            VerificationStatus @default(REQUESTED) ; serviceRequest    ServiceRequest     @relation(fields: [serviceRequestId], references: [id], onDelete: Cascade) ; vendorProfile     VendorProfile      @relation(fields: [vendorProfileId], references: [id], onDelete: Cascade) | @@index([serviceRequestId]) ; @@index([vendorProfileId]) ; @@index([userDocumentId]) ; @@index([requesterUserId]) ; @@index([reviewerUserId]) ; @@index([status]) | No | apps/api/src/modules/documents/documents.service.ts |
| EmailVerification | 7 | user       User     @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) ; @@index([expiresAt]) | No | apps/api/src/modules/auth/auth.service.ts |
| EventParticipant | 9 | status       ParticipantStatus @default(REGISTERED) ; event        PlacementEvent    @relation(fields: [eventId], references: [id], onDelete: Cascade) ; user         User              @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([eventId]) ; @@index([userId]) ; @@index([status]) ; @@unique([eventId, userId]) | No | apps/api/src/modules/events/events.service.ts, apps/web/src/app/(dashboard)/dashboard/events/[id]/page.tsx, apps/web/src/lib/api/events.api.ts |
| FeatureFlag | 9 | plan        Plan ; tenant      Tenant?  @relation(fields: [tenantId], references: [id], onDelete: SetNull) | @@index([tenantId]) ; @@index([plan]) ; @@index([isEnabled]) ; @@unique([tenantId, key, plan]) | Yes | apps/api/src/modules/admin/admin.controller.ts, apps/api/src/modules/admin/admin.service.ts, apps/web/src/lib/api/admin.api.ts, prisma/seed.ts |
| FreelanceRecruiterProfile | 15 | commissionPreference    CommissionType?  @map("commission_preference") ; user                    User             @relation(fields: [userId], references: [id], onDelete: Cascade) ; tenant                  Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([isVerified]) | Yes | apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/auth/auth.service.ts, apps/api/src/modules/freelance/freelance.service.ts, apps/api/src/modules/users/users.schema.ts |
| FreelanceReferral | 25 | status                      ReferralStatus    @default(ACTIVE) ; commissionType              CommissionType    @map("commission_type") ; commissionTrigger           CommissionTrigger @map("commission_trigger") | @@index([tenantId]) ; @@index([jobId]) ; @@index([recruiterProfileId]) ; @@index([freelanceRecruiterProfileId]) ; @@index([candidateUserId]) ; @@index([referredByUserId]) ; @@index([status]) ; @@unique([jobId, candidateUserId, freelanceRecruiterProfileId]) | Yes | apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/chat/chat.service.ts, apps/api/src/modules/freelance/freelance.service.ts, apps/web/src/lib/api/freelance.api.ts |
| InterviewSlot | 24 | round             InterviewRound ; mode              InterviewMode ; status            InterviewStatus   @default(SCHEDULED) | @@index([applicationId]) ; @@index([jobId]) ; @@index([candidateUserId]) ; @@index([interviewerUserId]) ; @@index([createdByUserId]) ; @@index([status]) ; @@index([scheduledStartAt]) | No | apps/api/src/lib/notification.ts, apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/interviews/interviews.service.ts, apps/web/src/app/(dashboard)/dashboard/interviews/page.tsx, apps/web/src/app/(dashboard)/dashboard/recruiter/page.tsx |
| Invite | 15 | tenant           Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade) ; collegeProfile   CollegeProfile? @relation(fields: [collegeProfileId], references: [id], onDelete: SetNull) ; createdBy        User           @relation("invite_creator", fields: [createdByUserId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([collegeProfileId]) ; @@index([createdByUserId]) ; @@index([isActive]) | Yes | apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/auth/auth.service.ts, apps/api/src/modules/invites/invites.controller.ts, apps/api/src/modules/invites/invites.service.ts, apps/mobile/src/app/(auth)/register.tsx |
| InviteUse | 7 | invite      Invite   @relation(fields: [inviteId], references: [id], onDelete: Cascade) ; usedBy      User     @relation(fields: [usedByUserId], references: [id], onDelete: Cascade) | @@index([inviteId]) ; @@index([usedByUserId]) ; @@unique([inviteId, usedByUserId]) | No | apps/api/src/modules/auth/auth.service.ts, apps/api/src/modules/invites/invites.service.ts, prisma/seed.ts |
| Invoice | 22 | status           InvoiceStatus @default(DRAFT) ; tenant           Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade) ; referral         FreelanceReferral? @relation(fields: [referralId], references: [id], onDelete: SetNull) | @@index([tenantId]) ; @@index([referralId]) ; @@index([serviceRequestId]) ; @@index([issuerUserId]) ; @@index([billedToUserId]) ; @@index([status]) ; @@index([dueDate]) | Yes | apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/freelance/freelance.controller.ts, apps/api/src/modules/freelance/freelance.service.ts, apps/web/src/app/(dashboard)/dashboard/freelance/page.tsx, apps/web/src/lib/api/freelance.api.ts |
| Job | 44 | workMode                   WorkMode           @default(ANY) @map("work_mode") ; jobType                    JobType            @map("job_type") ; status                     JobStatus          @default(DRAFT) | @@index([tenantId]) ; @@index([recruiterProfileId]) ; @@index([createdByUserId]) ; @@index([collegeProfileId]) ; @@index([status]) ; @@index([status, createdAt]) ; @@index([jobType]) ; @@index([workMode]) ; @@index([title]) ; @@index([locationCity, locationState]) ; @@index([isFeatured, status]) ; @@index([applicationDeadline]) | Yes | apps/ai/app/routers/matching.py, apps/ai/app/services/matching.py, apps/api/src/docs/swagger.ts, apps/api/src/lib/ai.ts, apps/api/src/lib/mailer.ts |
| JobSeekerProfile | 16 | preferredWorkMode  WorkMode   @default(ANY) @map("preferred_work_mode") ; user               User       @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([careerScore]) ; @@index([isProfileComplete]) | No | apps/api/src/lib/ai.ts, apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/ats/ats.service.ts, apps/api/src/modules/auth/auth.service.ts |
| ManpowerCandidate | 15 | status           ApplicationStatus  @default(APPLIED) ; serviceRequest   ServiceRequest     @relation(fields: [serviceRequestId], references: [id], onDelete: Cascade) ; candidateUser    User?              @relation("manpower_candidate_user", fields: [candidateUserId], references: [id], onDelete: SetNull) | @@index([serviceRequestId]) ; @@index([candidateUserId]) ; @@index([status]) | No | Schema-only signal |
| Notification | 14 | type        NotificationType ; channel     NotificationChannel ; tenant      Tenant?             @relation(fields: [tenantId], references: [id], onDelete: SetNull) | @@index([tenantId]) ; @@index([userId]) ; @@index([type]) ; @@index([channel]) ; @@index([isRead]) ; @@index([createdAt]) | Yes | apps/api/src/lib/firebase.ts, apps/api/src/lib/notification.ts, apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/applications/applications.service.ts, apps/api/src/modules/ats/ats.service.ts |
| NotificationPreference | 10 | type      NotificationType ; channel   NotificationChannel ; tenant    Tenant?             @relation(fields: [tenantId], references: [id], onDelete: SetNull) | @@index([tenantId]) ; @@index([userId]) ; @@index([isEnabled]) ; @@unique([userId, type, channel]) | Yes | apps/api/src/lib/notification.ts, apps/api/src/modules/notifications/notifications.service.ts, apps/api/src/modules/users/users.service.ts, apps/web/src/app/(dashboard)/settings/page.tsx, apps/web/src/lib/api/notifications.api.ts |
| OAuthAccount | 12 | provider          OAuthProvider ; user              User          @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) ; @@index([provider]) ; @@unique([provider, providerAccountId]) | No | apps/api/src/modules/auth/auth.service.ts |
| PasswordReset | 7 | user       User     @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) ; @@index([expiresAt]) | No | apps/api/src/modules/auth/auth.service.ts |
| PlacementEvent | 22 | eventType          EventType    @map("event_type") ; status             EventStatus  @default(UPCOMING) ; tenant             Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([collegeProfileId]) ; @@index([recruiterProfileId]) ; @@index([createdByUserId]) ; @@index([eventType]) ; @@index([status]) ; @@index([isOpenToAll]) ; @@index([startAt]) | Yes | apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/events/events.service.ts, apps/web/src/app/(dashboard)/dashboard/college/page.tsx, apps/web/src/app/(dashboard)/dashboard/events/page.tsx, apps/web/src/lib/api/events.api.ts |
| PlatformSetting | 8 | tenant      Tenant?   @relation(fields: [tenantId], references: [id], onDelete: SetNull) | @@index([tenantId]) | Yes | apps/api/src/lib/notification.ts, apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/freelance/freelance.service.ts, apps/web/src/lib/api/admin.api.ts, prisma/seed.ts |
| RecruiterProfile | 24 | companySize         CompanySize                 @default(SIZE_1_10) @map("company_size") ; user                User                        @relation(fields: [userId], references: [id], onDelete: Cascade) ; tenant              Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([companyName]) ; @@index([hiringNow]) ; @@index([isVerified]) | Yes | apps/api/src/lib/notification.ts, apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/applications/applications.service.ts, apps/api/src/modules/auth/auth.service.ts |
| RefreshToken | 9 | user       User     @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) ; @@index([expiresAt]) | No | apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/auth/auth.controller.ts, apps/api/src/modules/auth/auth.schema.ts, apps/api/src/modules/auth/auth.service.ts, apps/mobile/src/lib/api/auth.api.ts |
| SavedJob | 6 | candidate       User     @relation(fields: [candidateUserId], references: [id], onDelete: Cascade) ; job             Job      @relation(fields: [jobId], references: [id], onDelete: Cascade) | @@index([candidateUserId]) ; @@index([jobId]) ; @@unique([candidateUserId, jobId]) | No | apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/jobs/jobs.service.ts |
| ServiceRequest | 30 | type              ServiceRequestType ; status            ServiceRequestStatus @default(PENDING) ; tenant            Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([requesterUserId]) ; @@index([assignedToUserId]) ; @@index([vendorProfileId]) ; @@index([recruiterProfileId]) ; @@index([jobId]) ; @@index([type]) ; @@index([status]) ; @@index([dueDate]) | Yes | apps/api/src/modules/chat/chat.service.ts, apps/api/src/modules/documents/documents.service.ts, apps/api/src/modules/vendors/vendors.service.ts, apps/web/src/app/(dashboard)/dashboard/vendor/page.tsx, apps/web/src/lib/api/vendors.api.ts |
| StudentProfile | 26 | preferredWorkMode     WorkMode      @default(ANY) @map("preferred_work_mode") ; user                  User          @relation(fields: [userId], references: [id], onDelete: Cascade) ; tenant                Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([collegeProfileId]) ; @@index([careerScore]) ; @@index([isProfileComplete]) | Yes | apps/api/src/lib/ai.ts, apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/analytics/analytics.service.ts, apps/api/src/modules/applications/applications.service.ts, apps/api/src/modules/ats/ats.service.ts |
| Tenant | 40 | plan                        Plan                        @default(FREE) ; users                       User[] ; invites                     Invite[] | @@index([plan]) ; @@index([isActive]) | No | apps/api/src/app.ts, apps/api/src/lib/socket.ts, apps/api/src/middleware/error-handler.ts, apps/api/src/middleware/request-logger.ts, apps/api/src/middleware/tenant-resolver.ts |
| TrainingPartnerProfile | 15 | user              User          @relation(fields: [userId], references: [id], onDelete: Cascade) ; tenant            Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade) ; courses           Course[] | @@index([tenantId]) ; @@index([isVerified]) | Yes | apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/auth/auth.service.ts, apps/api/src/modules/training/training.service.ts, apps/api/src/modules/users/users.schema.ts, apps/api/src/modules/users/users.service.ts |
| User | 71 | role                          UserRole ; subRole                       SubRole?                    @map("sub_role") ; profileVisibility             ProfileVisibility           @default(PRIVATE) @map("profile_visibility") | @@index([tenantId]) ; @@index([role]) ; @@index([subRole]) ; @@index([isApproved]) ; @@index([isActive]) ; @@index([profileVisibility]) | Yes | apps/api/src/docs/swagger.ts, apps/api/src/lib/ai.ts, apps/api/src/lib/mailer.ts, apps/api/src/lib/notification.ts, apps/api/src/lib/socket.ts |
| UserDocument | 17 | documentType     DocumentType       @map("document_type") ; verificationStatus VerificationStatus @default(UNVERIFIED) @map("verification_status") ; user             User               @relation("user_documents", fields: [userId], references: [id], onDelete: Cascade) | @@index([userId]) ; @@index([tenantId]) ; @@index([documentType]) ; @@index([verificationStatus]) ; @@index([verifiedByUserId]) | Yes | apps/api/src/modules/documents/documents.service.ts, apps/web/src/app/(dashboard)/dashboard/documents/page.tsx, apps/web/src/lib/api/documents.api.ts |
| VendorProfile | 18 | vendorType      VendorType     @map("vendor_type") ; pricingModel    PricingModel   @map("pricing_model") ; user            User           @relation(fields: [userId], references: [id], onDelete: Cascade) | @@index([tenantId]) ; @@index([vendorType]) ; @@index([isVerified]) ; @@index([isActive]) | Yes | apps/api/src/modules/admin/admin.service.ts, apps/api/src/modules/auth/auth.service.ts, apps/api/src/modules/chat/chat.service.ts, apps/api/src/modules/documents/documents.service.ts, apps/api/src/modules/users/users.schema.ts |
| WhiteLabelConfig | 15 | tenant         Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade) | @@index([customDomain]) | Yes | apps/api/src/modules/whitelabel/whitelabel.controller.ts, apps/api/src/modules/whitelabel/whitelabel.service.ts, apps/web/src/lib/api/whitelabel.api.ts |

## Tenant/org linkage
Models with explicit tenantId field (26):
- `User`
- `CollegeProfile`
- `StudentProfile`
- `RecruiterProfile`
- `FreelanceRecruiterProfile`
- `VendorProfile`
- `TrainingPartnerProfile`
- `Invite`
- `CollegeRecruiterConnection`
- `Job`
- `Application`
- `FreelanceReferral`
- `Invoice`
- `ServiceRequest`
- `PlacementEvent`
- `Course`
- `UserDocument`
- `ChatThread`
- `ChatMessage`
- `Notification`
- `NotificationPreference`
- `WhiteLabelConfig`
- `ActivityLog`
- `AIMatchScore`
- `PlatformSetting`
- `FeatureFlag`

Evidence:
- prisma/schema.prisma

## User-role linkage
- Role system is enum-driven through User.role with UserRole enum.
- Sub-role field exists: User.subRole with SubRole enum.
- Multiple role-specific profile tables link back to User.

Evidence:
- prisma/schema.prisma (enum UserRole, model User, role profile models)

## Seed data status
- Seed file exists and is extensive.
- Predictable demo credentials present:
  - Admin@123
  - Campus@123
- Seeded invite codes and demo users are present.

Evidence:
- prisma/seed.ts (password hashes and seeded users/invites)

## Migration status
- No prisma/migrations directory found.
- CI currently uses prisma db push instead of migration history playback.

Evidence:
- prisma/
- .github/workflows/ci.yml
- package.json scripts

## Missing index signals
Tenant-scoped models without explicit tenantId index (1):
- `WhiteLabelConfig`

Needs Manual Verification: some models may rely on compound or foreign-key index behavior depending on PostgreSQL planner and workload.

## Data isolation risks
1. Multi-tenant isolation relies on service-layer query discipline; not all routes enforce tenant filters uniformly at middleware level.
   - apps/api/src/middleware/tenant-resolver.ts
   - apps/api/src/modules/*/*.service.ts
2. Several models are not obviously service-used from static scan and may drift stale.
   - `EmailVerification`, `PasswordReset`, `OAuthAccount`, `CandidateEducation`, `CandidateExperience`, `CandidateCertification`, `CandidateProject`, `ManpowerCandidate`, `DocumentVerification`

## Models that appear unused or low-signal
- `EmailVerification` (Needs Manual Verification)
- `PasswordReset` (Needs Manual Verification)
- `OAuthAccount` (Needs Manual Verification)
- `CandidateEducation` (Needs Manual Verification)
- `CandidateExperience` (Needs Manual Verification)
- `CandidateCertification` (Needs Manual Verification)
- `CandidateProject` (Needs Manual Verification)
- `ManpowerCandidate` (Needs Manual Verification)
- `DocumentVerification` (Needs Manual Verification)
