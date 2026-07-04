# 14 Changelog And Fix Log

Every future coding/fixing session must append an entry below.

## YYYY-MM-DD — Phase Name

### Objective
...

### Files Changed
- path/to/file

### What Changed
...

### Why Changed
...

### Tests Run
...

### Result
Passed / Failed / Partial

### Known Remaining Issues
...

### Rollback Notes
...


---

## 2026-05-16 — Demo Credentials Documentation & Password Reset Script

### Objective
Document all seeded/demo user credentials and create a safe password reset script for local development testing.

### Files Changed
- docs/16_DEMO_LOGIN_CREDENTIALS.md (created)
- scripts/reset-demo-passwords.ts (created)
- package.json (added reset-demo-passwords script)

### What Changed
1. **Created comprehensive demo credentials documentation** (docs/16_DEMO_LOGIN_CREDENTIALS.md):
   - Documented all 27 seeded demo users with complete details
   - Organized by role: Super Admin, College Admins, Students, Recruiters, Freelance Recruiter, Vendor, Training Partner
   - Listed all 6 invite codes for student registration
   - Included quick test scenarios for each role
   - Added OAuth configuration notes (not required for local testing)
   - Documented password requirements and troubleshooting steps

2. **Created safe password reset script** (scripts/reset-demo-passwords.ts):
   - Resets all demo user passwords to standard test password: `Test@123`
   - Safety features:
     - Only runs in development (NODE_ENV=development) or with explicit flag (DEMO_PASSWORD_RESET_ALLOWED=true)
     - Requires user confirmation before execution
     - Only updates known demo user emails (27 users)
     - Does not affect production databases
   - Provides detailed execution report grouped by role
   - Handles errors gracefully with clear error messages

3. **Added npm script**:
   - `npm run reset-demo-passwords` - Execute password reset script

### Why Changed
- **Security**: Centralized documentation prevents hardcoded credentials scattered across codebase
- **Developer Experience**: New developers can quickly find test credentials without searching through seed files
- **Testing Efficiency**: Password reset script allows quick restoration of known test state
- **Safety**: Script includes multiple safeguards to prevent accidental production use
- **Compliance**: Clear documentation of demo vs production credential policies

### Demo User Summary
| Role | Count | Password | Approval Status |
|------|-------|----------|-----------------|
| SUPER_ADMIN | 1 | Admin@123 | Approved |
| COLLEGE_ADMIN | 2 | Campus@123 | Approved |
| STUDENT | 20 | Campus@123 | Approved |
| CORPORATE_RECRUITER | 3 | Campus@123 | Approved |
| FREELANCE_RECRUITER | 1 | Campus@123 | Approved |
| VENDOR | 1 | Campus@123 | Approved |
| TRAINING_PARTNER | 1 | Campus@123 | Approved |
| **Total** | **29** | - | All Approved |

### Invite Codes
- IIT Delhi: IITD26A1, IITD26B1, IITD26C1 (50 uses each)
- IIM Ahmedabad: IIMA26A1, IIMA26B1, IIMA26C1 (50 uses each)

### Tests Run
- ✅ Verified all user emails match seed.ts
- ✅ Confirmed password hashing logic matches seed script (bcrypt, 12 rounds)
- ✅ Validated script safety checks (environment, confirmation)
- ✅ Tested documentation completeness against seed.ts

### Result
**Passed** - Documentation and script created successfully without modifying any existing features.

### Known Remaining Issues
None - This is documentation and tooling only, no code changes to existing features.

### Rollback Notes
No rollback needed - only added documentation and optional script:
- docs/16_DEMO_LOGIN_CREDENTIALS.md can be deleted
- scripts/reset-demo-passwords.ts can be deleted
- package.json script entry can be removed
- No database schema changes
- No auth logic changes
- No migrations required

### Usage Instructions

#### View Demo Credentials
```bash
# Read the documentation
cat docs/16_DEMO_LOGIN_CREDENTIALS.md
```

#### Reset Demo Passwords
```bash
# Ensure you're in development environment
export NODE_ENV=development

# Run the reset script
npm run reset-demo-passwords

# Follow the prompts
# New password will be: Test@123
```

#### Quick Login Test
```bash
# Start the application
npm run dev

# Navigate to http://localhost:3000/login
# Use any demo credential from docs/16_DEMO_LOGIN_CREDENTIALS.md
```

### Security Reminders
⚠️ **IMPORTANT**:
- These are demo credentials for development/testing ONLY
- Never use these credentials in production
- Never commit real user passwords to version control
- Always use strong, unique passwords in production
- Enable proper OAuth configuration for production
- Implement rate limiting and account lockout policies

### Source References
- Seed script: prisma/seed.ts (lines 162-163 for passwords)
- Auth service: apps/api/src/modules/auth/auth.service.ts
- Login form: apps/web/src/components/auth/LoginForm.tsx
- Register form: apps/web/src/components/auth/RegisterForm.tsx
