# 12 MVP Scope Lock

## Locked MVP IN Scope
1. Super Admin
2. College Admin
3. Student
4. Corporate Recruiter
5. Auth (register/login/refresh/logout/me)
6. Role dashboards (for in-scope roles)
7. Basic college/student management
8. Job posting
9. Job application
10. ATS status tracking
11. Basic notifications/email (if env configured)
12. Basic reports/analytics already present

Evidence for current in-scope implementation:
- apps/web/src/app/(dashboard)/dashboard/{admin,college,student,recruiter}/*
- apps/api/src/modules/{auth,admin,invites,connections,jobs,applications,ats,interviews,notifications,analytics}/*

## Explicit OUT OF MVP
1. Mobile app launch
2. Full AI engine maturity
3. Vendor marketplace as core GTM pillar
4. Training partner module as core GTM pillar
5. Freelance commission engine depth
6. Advanced white label (custom domain SSL lifecycle automation etc.)
7. Payments platform-wide monetization
8. Full socket chat productization
9. Enterprise SSO
10. Predictive analytics

## Scope lock rule
Anything in OUT OF MVP cannot be implemented as a new feature until explicit approval and scope update in this file.
