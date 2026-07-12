Schema model count verification: command `(rg -n "^model\s+\w+" prisma/schema.prisma | Measure-Object).Count` output `45`.

Model Name | Write evidence (file:line or "NONE") | Read evidence (file:line or "NONE") | Status | Self-check result
--- | --- | --- | --- | ---
Tenant | apps/api/src/modules/whitelabel/whitelabel.service.ts:186 | apps/api/src/middleware/tenant-resolver.ts:98 | ACTIVE | NOT SAMPLED
User | apps/api/src/lib/external-candidate.ts:53 | apps/api/src/lib/ai.ts:98 | ACTIVE | NOT SAMPLED
RefreshToken | apps/api/src/modules/auth/auth.service.ts:364 | apps/api/src/modules/auth/auth.service.ts:558 | ACTIVE | Confirmed ACTIVE: repo-wide CRUD self-check returned write/read output
EmailVerification | apps/api/src/modules/auth/auth.service.ts:459 | apps/api/src/modules/auth/auth.service.ts:681 | ACTIVE | NOT SAMPLED
PasswordReset | apps/api/src/modules/auth/auth.service.ts:786 | apps/api/src/modules/auth/auth.service.ts:808 | ACTIVE | NOT SAMPLED
OAuthAccount | apps/api/src/modules/auth/auth.service.ts:941 | apps/api/src/modules/auth/auth.service.ts:920 | ACTIVE | NOT SAMPLED
CollegeProfile | apps/api/src/modules/auth/auth.service.ts:329 | apps/api/src/modules/events/events.service.ts:27 | ACTIVE | NOT SAMPLED
StudentProfile | apps/api/src/modules/auth/auth.service.ts:228 | apps/api/src/modules/analytics/analytics.service.ts:758 | ACTIVE | NOT SAMPLED
RecruiterProfile | apps/api/src/modules/auth/auth.service.ts:259 | apps/api/src/modules/vendors/vendors.service.ts:177 | ACTIVE | NOT SAMPLED
FreelanceRecruiterProfile | apps/api/src/modules/auth/auth.service.ts:277 | apps/api/src/modules/analytics/analytics.service.ts:1231 | ACTIVE | NOT SAMPLED
VendorProfile | apps/api/src/modules/auth/auth.service.ts:292 | apps/api/src/modules/vendors/vendors.service.ts:86 | ACTIVE | NOT SAMPLED
TrainingPartnerProfile | apps/api/src/modules/auth/auth.service.ts:311 | apps/api/src/modules/training/training.service.ts:46 | ACTIVE | NOT SAMPLED
JobSeekerProfile | apps/api/src/lib/external-candidate.ts:76 | NONE | WRITE-ONLY | NOT SAMPLED
CandidateEducation | NONE | NONE | DEAD SCHEMA | Confirmed DEAD SCHEMA: repo-wide CRUD self-check returned NO OUTPUT
CandidateExperience | NONE | NONE | DEAD SCHEMA | Confirmed DEAD SCHEMA: repo-wide CRUD self-check returned NO OUTPUT
CandidateCertification | NONE | NONE | DEAD SCHEMA | Confirmed DEAD SCHEMA: repo-wide CRUD self-check returned NO OUTPUT
CandidateProject | NONE | NONE | DEAD SCHEMA | Confirmed DEAD SCHEMA: repo-wide CRUD self-check returned NO OUTPUT
Invite | apps/api/src/modules/auth/auth.service.ts:440 | apps/api/src/modules/analytics/analytics.service.ts:827 | ACTIVE | NOT SAMPLED
InviteUse | apps/api/src/modules/auth/auth.service.ts:449 | NONE | WRITE-ONLY | NOT SAMPLED
CollegeRecruiterConnection | apps/api/src/modules/connections/connections.service.ts:89 | apps/api/src/modules/connections/connections.service.ts:75 | ACTIVE | NOT SAMPLED
Job | apps/api/src/modules/freelance/freelance.service.ts:322 | apps/api/src/modules/ats/ats.service.ts:152 | ACTIVE | NOT SAMPLED
Application | apps/api/src/modules/freelance/freelance.service.ts:303 | apps/api/src/modules/chat/chat.service.ts:82 | ACTIVE | NOT SAMPLED
ApplicationStatusHistory | apps/api/src/lib/application-history.ts:56 | apps/api/src/modules/analytics/analytics.service.ts:378 | ACTIVE | NOT SAMPLED
InterviewSlot | apps/api/src/modules/interviews/interviews.service.ts:178 | apps/api/src/modules/interviews/interviews.service.ts:91 | ACTIVE | NOT SAMPLED
SavedJob | apps/api/src/modules/jobs/jobs.service.ts:1003 | apps/api/src/modules/jobs/jobs.service.ts:566 | ACTIVE | NOT SAMPLED
FreelanceReferral | apps/api/src/modules/freelance/freelance.service.ts:331 | apps/api/src/modules/chat/chat.service.ts:174 | ACTIVE | NOT SAMPLED
Invoice | apps/api/src/modules/freelance/freelance.service.ts:537 | apps/api/src/modules/analytics/analytics.service.ts:1270 | ACTIVE | NOT SAMPLED
ServiceRequest | apps/api/src/modules/vendors/vendors.service.ts:191 | apps/api/src/modules/vendors/vendors.service.ts:132 | ACTIVE | NOT SAMPLED
ManpowerCandidate | NONE | NONE | DEAD SCHEMA | Confirmed DEAD SCHEMA: repo-wide CRUD self-check returned NO OUTPUT
DocumentVerification | apps/api/src/modules/documents/documents.service.ts:286 | NONE | WRITE-ONLY | NOT SAMPLED
PlacementEvent | apps/api/src/modules/events/events.service.ts:55 | apps/api/src/modules/events/events.service.ts:38 | ACTIVE | NOT SAMPLED
EventParticipant | apps/api/src/modules/events/events.service.ts:265 | apps/api/src/modules/events/events.service.ts:242 | ACTIVE | NOT SAMPLED
Course | apps/api/src/modules/training/training.service.ts:203 | apps/api/src/modules/payments/payments.service.ts:23 | ACTIVE | NOT SAMPLED
CourseEnrollment | apps/api/src/modules/training/training.service.ts:382 | apps/api/src/modules/training/training.service.ts:367 | ACTIVE | Confirmed ACTIVE: repo-wide CRUD self-check returned write/read output
CourseRevenue | apps/api/src/modules/training/training.service.ts:396 | apps/api/src/modules/training/training.service.ts:558 | ACTIVE | Confirmed ACTIVE: repo-wide CRUD self-check returned write/read output
UserDocument | apps/api/src/modules/documents/documents.service.ts:110 | apps/api/src/modules/documents/documents.service.ts:143 | ACTIVE | Confirmed ACTIVE: repo-wide CRUD self-check returned write/read output
ChatThread | apps/api/src/modules/chat/chat.service.ts:254 | apps/api/src/lib/socket.ts:68 | ACTIVE | NOT SAMPLED
ChatMessage | apps/api/src/modules/chat/chat.service.ts:426 | apps/api/src/modules/chat/chat.service.ts:322 | ACTIVE | NOT SAMPLED
Notification | apps/api/src/modules/notifications/notifications.service.ts:135 | apps/api/src/modules/notifications/notifications.service.ts:66 | ACTIVE | NOT SAMPLED
NotificationPreference | apps/api/src/modules/users/users.service.ts:323 | apps/api/src/modules/users/users.service.ts:347 | ACTIVE | Confirmed ACTIVE: repo-wide CRUD self-check returned write/read output
WhiteLabelConfig | apps/api/src/modules/whitelabel/whitelabel.service.ts:75 | apps/api/src/modules/whitelabel/whitelabel.service.ts:103 | ACTIVE | NOT SAMPLED
ActivityLog | apps/api/src/lib/activity.ts:25 | apps/api/src/modules/users/users.service.ts:371 | ACTIVE | NOT SAMPLED
AIMatchScore | apps/api/src/lib/ai.ts:189 | apps/api/src/modules/analytics/analytics.service.ts:422 | ACTIVE | NOT SAMPLED
PlatformSetting | apps/api/src/modules/admin/admin.service.ts:444 | apps/api/src/lib/notification.ts:98 | ACTIVE | NOT SAMPLED
FeatureFlag | apps/api/src/modules/admin/admin.service.ts:487 | apps/api/src/modules/admin/admin.service.ts:474 | ACTIVE | NOT SAMPLED
