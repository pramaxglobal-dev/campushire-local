# Demo User Credentials - Quick Reference

## Summary Table

| Role | Name | Email/User ID | Password | Approval Status | Tenant/Organization | Invite Code | Source File |
|------|------|---------------|----------|-----------------|---------------------|-------------|-------------|
| **SUPER_ADMIN** | Campus Admin | admin@campushire.in | Admin@123 | Approved | Platform-level (no tenant) | N/A | prisma/seed.ts:162,237-260 |
| **COLLEGE_ADMIN** | Placement IITD | admin@iitd.ac.in | Campus@123 | Approved | IIT Delhi (iit-delhi) | N/A | prisma/seed.ts:163,318-340 |
| **COLLEGE_ADMIN** | Placement IIMA | admin@iima.ac.in | Campus@123 | Approved | IIM Ahmedabad (iim-ahmedabad) | N/A | prisma/seed.ts:163,342-364 |
| **STUDENT** | Aarav Sharma | aarav.sharma@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26A1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Ishita Gupta | ishita.gupta@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26B1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Rohan Verma | rohan.verma@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26C1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Priya Nair | priya.nair@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26A1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Kartik Reddy | kartik.reddy@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26B1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Meera Iyer | meera.iyer@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26C1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Aditya Mishra | aditya.mishra@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26A1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Sneha Kapoor | sneha.kapoor@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26B1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Yash Joshi | yash.joshi@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26C1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Naina Saxena | naina.saxena@student.campushire.in | Campus@123 | Approved | IIT Delhi | IITD26A1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Vikram Bhatia | vikram.bhatia@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26B1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Ananya Menon | ananya.menon@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26C1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Kabir Dubey | kabir.dubey@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26A1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Ritika Chopra | ritika.chopra@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26B1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Dev Mehta | dev.mehta@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26C1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Sanya Malhotra | sanya.malhotra@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26A1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Harsh Pillai | harsh.pillai@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26B1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Pooja Singh | pooja.singh@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26C1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Arjun Agarwal | arjun.agarwal@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26A1 | prisma/seed.ts:163,485-540 |
| **STUDENT** | Tanvi Kulkarni | tanvi.kulkarni@student.campushire.in | Campus@123 | Approved | IIM Ahmedabad | IIMA26B1 | prisma/seed.ts:163,485-540 |
| **CORPORATE_RECRUITER** | Rahul Khanna | recruiter@techcorp.in | Campus@123 | Approved | TechCorp (techcorp) | N/A | prisma/seed.ts:163,585-650 |
| **CORPORATE_RECRUITER** | Neha Kapadia | recruiter@financehub.in | Campus@123 | Approved | FinanceHub (financehub) | N/A | prisma/seed.ts:163,585-650 |
| **CORPORATE_RECRUITER** | Amit Bose | recruiter@designstudio.in | Campus@123 | Approved | DesignStudio (designstudio) | N/A | prisma/seed.ts:163,585-650 |
| **FREELANCE_RECRUITER** | Freelance Recruiter | freelance@campushire.in | Campus@123 | Approved | Freelance Bridge (freelance-bridge) | N/A | prisma/seed.ts:163,875-920 |
| **VENDOR** | DocSure Vendor | vendor@docsure.in | Campus@123 | Approved | DocSure Verification (docsure-verification) | N/A | prisma/seed.ts:163,928-970 |
| **TRAINING_PARTNER** | SkillForge Partner | partner@skillforge.in | Campus@123 | Approved | SkillForge Academy (skillforge-academy) | N/A | prisma/seed.ts:163,978-1020 |

## Invite Codes

| Code | College | Max Uses | Status | Created By | Source File |
|------|---------|----------|--------|------------|-------------|
| IITD26A1 | IIT Delhi | 50 | Active | admin@iitd.ac.in | prisma/seed.ts:408-425 |
| IITD26B1 | IIT Delhi | 50 | Active | admin@iitd.ac.in | prisma/seed.ts:408-425 |
| IITD26C1 | IIT Delhi | 50 | Active | admin@iitd.ac.in | prisma/seed.ts:408-425 |
| IIMA26A1 | IIM Ahmedabad | 50 | Active | admin@iima.ac.in | prisma/seed.ts:427-444 |
| IIMA26B1 | IIM Ahmedabad | 50 | Active | admin@iima.ac.in | prisma/seed.ts:427-444 |
| IIMA26C1 | IIM Ahmedabad | 50 | Active | admin@iima.ac.in | prisma/seed.ts:427-444 |

## Password Information

| Password Type | Value | Hash Rounds | Used By | Source |
|---------------|-------|-------------|---------|--------|
| Super Admin | Admin@123 | 12 (bcrypt) | admin@campushire.in | prisma/seed.ts:162 |
| Default Users | Campus@123 | 12 (bcrypt) | All other demo users | prisma/seed.ts:163 |
| Reset Script | Test@123 | 12 (bcrypt) | Optional reset script | scripts/reset-demo-passwords.ts:23 |

## Quick Access

### Login URL
- **Web**: http://localhost:3000/login
- **API**: http://localhost:4000

### Quick Test Commands
```bash
# Seed database with demo users
npm run db:seed

# Reset all demo passwords to Test@123
npm run reset-demo-passwords

# View full documentation
cat docs/16_DEMO_LOGIN_CREDENTIALS.md
```

## Password Requirements
All passwords must contain:
- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Notes
- ✅ All users are pre-approved and email verified
- ✅ All users are active
- ✅ OAuth (Google/LinkedIn) is NOT required for local testing
- ⚠️ These are demo credentials for development/testing ONLY
- ⚠️ Never use these credentials in production

## Related Documentation
- **Full Credentials Guide**: docs/16_DEMO_LOGIN_CREDENTIALS.md
- **Password Reset Script**: scripts/reset-demo-passwords.ts
- **Seed Script**: prisma/seed.ts
- **Changelog**: docs/14_CHANGELOG_AND_FIX_LOG.md (2026-05-16 entry)
