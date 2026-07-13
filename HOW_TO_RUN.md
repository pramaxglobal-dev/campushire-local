# How to Run CampusHire Locally

## Quick Start (Easiest Method)

### Option 1: Start Everything at Once

Open Command Prompt or PowerShell and run:

```cmd
cd "C:\Users\A\Desktop\CampusHire - Talentor Edge\campushire"
npm run dev
```

This will start both the API and Web servers automatically.

### Option 2: Start Services Separately

**Terminal 1 - API Server:**
```cmd
cd "C:\Users\A\Desktop\CampusHire - Talentor Edge\campushire\apps\api"
npm run dev
```

**Terminal 2 - Web Server:**
```cmd
cd "C:\Users\A\Desktop\CampusHire - Talentor Edge\campushire\apps\web"
npm run dev
```

---

## Access the Application

Once servers are running:

- **Web App:** http://localhost:3000
- **Login Page:** http://localhost:3000/login
- **API:** http://localhost:4000

---

## Demo Login Credentials

Use any of these to login:

**Password for all users:** `Talentor@123`

### Quick Test Credentials:
- **Super Admin:** superadmin.demo1@talentorx.local
- **College Admin:** collegeadmin.demo1@talentorx.local
- **Student:** student.demo1@talentorx.local
- **Recruiter:** corporaterecruiter.demo1@talentorx.local
- **Job Seeker:** jobseeker.demo1@talentorx.local
- **Freelance Recruiter:** freelancerecruiter.demo1@talentorx.local
- **Vendor:** vendor.demo1@talentorx.local
- **Training Partner:** trainingpartner.demo1@talentorx.local

(Replace `demo1` with `demo2` for the second user of each role)

---

## Stop the Application

Press `Ctrl+C` in each terminal window where services are running.

---

## Troubleshooting

### Port Already in Use

If you see "EADDRINUSE" error:

**For Port 3000 (Web):**
```cmd
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

**For Port 4000 (API):**
```cmd
netstat -ano | findstr :4000
taskkill /PID <process_id> /F
```

Then restart the servers.

### Redis Warnings

You'll see Redis connection warnings - this is normal. The app works fine without Redis in local development (rate limiting will use memory instead).

### Database Connection Issues

The app is configured to use Supabase PostgreSQL. Check the `.env` file if you have connection issues.

---

## First Time Setup (if needed)

If this is your first time or dependencies are missing:

```cmd
cd "C:\Users\A\Desktop\CampusHire - Talentor Edge\campushire"
npm install
npx prisma generate --schema=./prisma/schema.prisma
```

---

## Check Demo Users

To verify demo users exist:

```cmd
cd "C:\Users\A\Desktop\CampusHire - Talentor Edge\campushire"
npx ts-node --project prisma/tsconfig.json prisma/check-demo-users.ts
```

---

## Re-create Demo Users (if needed)

If demo users are missing or you want to reset them:

```cmd
cd "C:\Users\A\Desktop\CampusHire - Talentor Edge\campushire"
npx ts-node --project prisma/tsconfig.json prisma/seed-demo-users.ts
```

---

## What's Running?

When you start the application:

✅ **API Server** - Backend REST API (Port 4000)  
✅ **Web Server** - Next.js Frontend (Port 3000)  
⚠️ **Redis** - Not required for local dev  
⚠️ **AI Service** - Optional (matching/scoring features)

---

That's it! You're ready to test the application locally.
