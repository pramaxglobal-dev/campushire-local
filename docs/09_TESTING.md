# 09 Testing Master Plan

Use this sheet manually. For each test, fill Actual Result, Status, and Screenshot/Notes.

| Test ID | Feature | Role | Steps | Expected Result | Actual Result | Status | Screenshot/Notes |
|---|---|---|---|---|---|---|---|
| T-001 | Super Admin login | SUPER_ADMIN | Open /login -> login with admin creds -> verify redirect | Redirect to /dashboard/admin and data loads | Pending | Pending | |
| T-002 | College login | COLLEGE_ADMIN | Login as seeded college admin | Redirect to /dashboard/college | Pending | Pending | |
| T-003 | Student login | STUDENT | Login as seeded student | Redirect to /dashboard/student | Pending | Pending | |
| T-004 | Recruiter login | CORPORATE_RECRUITER | Login as recruiter user | Redirect to /dashboard/recruiter | Pending | Pending | |
| T-005 | Job post | CORPORATE_RECRUITER | Create job draft -> submit for approval | Job appears in recruiter lists and ATS overview | Pending | Pending | |
| T-006 | Job apply | STUDENT/JOB_SEEKER | Open job detail -> apply with answers | Application created and visible in My Applications | Pending | Pending | |
| T-007 | ATS move stage | CORPORATE_RECRUITER | Open ATS board -> move candidate stage | Candidate appears in new stage and history updates | Pending | Pending | |
| T-008 | Student application status | STUDENT/JOB_SEEKER | Open My Applications after ATS move | Updated status visible | Pending | Pending | |
| T-009 | Notifications | Any authenticated role | Trigger event (application/interview) and open notifications page | New notification appears; mark as read works | Pending | Pending | |
| T-010 | Profile update | Any authenticated role | Update profile fields and save | Data persists and reload shows updated values | Pending | Pending | |
| T-011 | Dashboard data | Each role dashboard | Open role dashboard and verify API-backed cards | Cards load without fallback-only errors | Pending | Pending | |
| T-012 | Logout/session | Any authenticated role | Logout then refresh protected route | Session cleared and redirected to login | Pending | Pending | |
| T-013 | Error handling | Any role | Force invalid API request (e.g., missing required field) | User sees friendly error state/toast; app does not crash | Pending | Pending | |

Evidence references for test targets:
- apps/web/src/app/(dashboard)/dashboard/*
- apps/api/src/modules/*
- apps/web/src/components/auth/*
