# 16 Demo Login Credentials

## Login URL
- **Web Application**: http://localhost:3000/login
- **API Base URL**: http://localhost:4000

## Demo User Credentials

All demo users are seeded via `prisma/seed.ts` and are available after running:
```bash
npm run db:seed
```

### Password Information
- **Super Admin Password**: `Admin@123`
- **All Other Users Password**: `Campus@123`

---

## 1. Super Admin

| Field | Value |
|-------|-------|
| **Role** | SUPER_ADMIN |
| **Name** | Campus Admin |
| **Email** | admin@campushire.in |
| **Password** | Admin@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | None (Platform-level) |

**Capabilities**: Full platform administration, manage all tenants, users, and system settings.

---

## 2. College Admins

### IIT Delhi Admin
| Field | Value |
|-------|-------|
| **Role** | COLLEGE_ADMIN |
| **Name** | Placement IITD |
| **Email** | admin@iitd.ac.in |
| **Password** | Campus@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | IIT Delhi (iit-delhi) |
| **College** | IIT Delhi |

### IIM Ahmedabad Admin
| Field | Value |
|-------|-------|
| **Role** | COLLEGE_ADMIN |
| **Name** | Placement IIMA |
| **Email** | admin@iima.ac.in |
| **Password** | Campus@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | IIM Ahmedabad (iim-ahmedabad) |
| **College** | IIM Ahmedabad |

---

## 3. Students (20 Total)

### IIT Delhi Students (10 students)
All students use password: **Campus@123**

| # | Name | Email | Tenant | College | Program | Invite Code Used |
|---|------|-------|--------|---------|---------|------------------|
| 1 | Aarav Sharma | aarav.sharma@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26A1 |
| 2 | Ishita Gupta | ishita.gupta@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26B1 |
| 3 | Rohan Verma | rohan.verma@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26C1 |
| 4 | Priya Nair | priya.nair@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26A1 |
| 5 | Kartik Reddy | kartik.reddy@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26B1 |
| 6 | Meera Iyer | meera.iyer@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26C1 |
| 7 | Aditya Mishra | aditya.mishra@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26A1 |
| 8 | Sneha Kapoor | sneha.kapoor@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26B1 |
| 9 | Yash Joshi | yash.joshi@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26C1 |
| 10 | Naina Saxena | naina.saxena@student.campushire.in | IIT Delhi | IIT Delhi | B.Tech | IITD26A1 |

### IIM Ahmedabad Students (10 students)
All students use password: **Campus@123**

| # | Name | Email | Tenant | College | Program | Invite Code Used |
|---|------|-------|--------|---------|---------|------------------|
| 11 | Vikram Bhatia | vikram.bhatia@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26B1 |
| 12 | Ananya Menon | ananya.menon@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26C1 |
| 13 | Kabir Dubey | kabir.dubey@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26A1 |
| 14 | Ritika Chopra | ritika.chopra@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26B1 |
| 15 | Dev Mehta | dev.mehta@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26C1 |
| 16 | Sanya Malhotra | sanya.malhotra@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26A1 |
| 17 | Harsh Pillai | harsh.pillai@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26B1 |
| 18 | Pooja Singh | pooja.singh@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26C1 |
| 19 | Arjun Agarwal | arjun.agarwal@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26A1 |
| 20 | Tanvi Kulkarni | tanvi.kulkarni@student.campushire.in | IIM Ahmedabad | IIM Ahmedabad | MBA | IIMA26B1 |

**Note**: All students are approved, email verified, and active.

---

## 4. Corporate Recruiters (3 Total)

### TechCorp Recruiter
| Field | Value |
|-------|-------|
| **Role** | CORPORATE_RECRUITER |
| **Name** | Rahul Khanna |
| **Email** | recruiter@techcorp.in |
| **Password** | Campus@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | TechCorp (techcorp) |
| **Company** | TechCorp |
| **Hiring Now** | Yes |

### FinanceHub Recruiter
| Field | Value |
|-------|-------|
| **Role** | CORPORATE_RECRUITER |
| **Name** | Neha Kapadia |
| **Email** | recruiter@financehub.in |
| **Password** | Campus@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | FinanceHub (financehub) |
| **Company** | FinanceHub |
| **Hiring Now** | No |

### DesignStudio Recruiter
| Field | Value |
|-------|-------|
| **Role** | CORPORATE_RECRUITER |
| **Name** | Amit Bose |
| **Email** | recruiter@designstudio.in |
| **Password** | Campus@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | DesignStudio (designstudio) |
| **Company** | DesignStudio |
| **Hiring Now** | No |

---

## 5. Freelance Recruiter

| Field | Value |
|-------|-------|
| **Role** | FREELANCE_RECRUITER |
| **Name** | Freelance Recruiter |
| **Email** | freelance@campushire.in |
| **Password** | Campus@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | Freelance Bridge (freelance-bridge) |
| **Agency Name** | Freelance Bridge |
| **Verified** | Yes |

---

## 6. Vendor

| Field | Value |
|-------|-------|
| **Role** | VENDOR |
| **Name** | DocSure Vendor |
| **Email** | vendor@docsure.in |
| **Password** | Campus@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | DocSure Verification (docsure-verification) |
| **Business Name** | DocSure Verification |
| **Vendor Type** | DOCUMENT_VERIFIER |
| **Verified** | Yes |

---

## 7. Training Partner

| Field | Value |
|-------|-------|
| **Role** | TRAINING_PARTNER |
| **Name** | SkillForge Partner |
| **Email** | partner@skillforge.in |
| **Password** | Campus@123 |
| **Approval Status** | Approved |
| **Email Verified** | Yes |
| **Active** | Yes |
| **Tenant** | SkillForge Academy (skillforge-academy) |
| **Organization** | SkillForge Academy |
| **Verified** | Yes |

---

## Invite Codes for Student Registration

### IIT Delhi Invite Codes
- **IITD26A1** (Max uses: 50)
- **IITD26B1** (Max uses: 50)
- **IITD26C1** (Max uses: 50)

### IIM Ahmedabad Invite Codes
- **IIMA26A1** (Max uses: 50)
- **IIMA26B1** (Max uses: 50)
- **IIMA26C1** (Max uses: 50)

All invite codes are active and can be used for testing student registration.

---

## OAuth Providers (Google/LinkedIn)

**For Local Development Testing:**
- OAuth providers (Google, LinkedIn) are **NOT required** for local testing
- All demo users can log in directly using email/password authentication
- OAuth configuration is optional and only needed if testing social login features

To test OAuth features, configure the following in `.env`:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:4000/api/auth/linkedin/callback
```

---

## Quick Test Scenarios

### Scenario 1: Super Admin Login
1. Navigate to http://localhost:3000/login
2. Email: `admin@campushire.in`
3. Password: `Admin@123`
4. Access: Full platform administration

### Scenario 2: College Admin Login
1. Navigate to http://localhost:3000/login
2. Email: `admin@iitd.ac.in` or `admin@iima.ac.in`
3. Password: `Campus@123`
4. Access: College-specific administration

### Scenario 3: Student Login
1. Navigate to http://localhost:3000/login
2. Email: Any student email from the list above
3. Password: `Campus@123`
4. Access: Student dashboard, job applications

### Scenario 4: Recruiter Login
1. Navigate to http://localhost:3000/login
2. Email: `recruiter@techcorp.in` (or other recruiter emails)
3. Password: `Campus@123`
4. Access: Job posting, candidate management

### Scenario 5: New Student Registration
1. Navigate to http://localhost:3000/register
2. Select role: Student
3. Use invite code: `IITD26A1` or any other valid code
4. Complete registration form
5. Password must meet requirements: uppercase, lowercase, number, symbol

---

## Password Reset Script

If you need to reset all demo passwords to a standard value, use:
```bash
npm run reset-demo-passwords
```

See `scripts/reset-demo-passwords.ts` for details.

---

## Security Notes

⚠️ **IMPORTANT**: These are demo credentials for development/testing only.

- **Never use these credentials in production**
- **Never commit real user passwords to version control**
- **Always use strong, unique passwords in production**
- **Enable proper OAuth configuration for production**
- **Implement rate limiting and account lockout policies**

---

## Source Files

- **Seed Script**: `prisma/seed.ts` (lines 162-163 for passwords)
- **Password Hashing**: bcrypt with 12 rounds
- **Auth Service**: `apps/api/src/modules/auth/auth.service.ts`
- **Login Form**: `apps/web/src/components/auth/LoginForm.tsx`
- **Register Form**: `apps/web/src/components/auth/RegisterForm.tsx`

---

## Troubleshooting

### Cannot Login
1. Ensure database is seeded: `npm run db:seed`
2. Check API is running: http://localhost:4000
3. Check web app is running: http://localhost:3000
4. Verify `.env` configuration matches `.env.example`

### Invite Code Invalid
1. Ensure database is seeded
2. Check invite code spelling (case-sensitive)
3. Verify invite code hasn't exceeded max uses (50)

### Password Requirements Not Met
Password must contain:
- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

**Last Updated**: Generated from seed.ts analysis
**Maintained By**: Development Team
