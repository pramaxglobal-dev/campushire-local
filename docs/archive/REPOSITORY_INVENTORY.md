# CampusHire Repository Inventory

**Generated**: 2026-07-03  
**Purpose**: Complete repository verification and inventory for Phase 1: Repository Recovery

---

## Executive Summary

CampusHire is a TypeScript/Python monorepo with 4 applications and 4 shared packages. The repository uses npm workspaces with Turbo for orchestration. The codebase is well-structured but contains audit artifacts and build artifacts that should be cleaned.

**Repository Type**: Monorepo (npm workspaces + Turbo)  
**Package Manager**: npm@10.8.2  
**Primary Languages**: TypeScript, Python  
**Total Applications**: 4  
**Total Packages**: 4  
**Total Lines of Code**: ~50,000+ (estimated)

---

## 1. Applications

### 1.1 API Application

**Path**: `apps/api/`  
**Type**: Express.js REST API  
**Language**: TypeScript  
**Purpose**: Backend API service

**Structure**:
```
apps/api/
├── src/
│   ├── app.ts                    # Express app composition
│   ├── server.ts                 # Server entry point
│   ├── config/                   # Configuration
│   │   ├── database.ts          # Prisma client setup
│   │   └── env.ts               # Environment validation
│   ├── docs/                     # Swagger documentation
│   ├── jobs/                     # Cron jobs
│   │   └── interview-reminders.ts
│   ├── lib/                      # Library code
│   │   ├── jwt.ts
│   │   ├── logger.ts
│   │   ├── mailer.ts
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── s3.ts
│   │   ├── sanitize.ts
│   │   ├── socket.ts
│   │   ├── whatsapp.ts
│   │   └── firebase.ts
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts
│   │   ├── approval.ts
│   │   ├── error-handler.ts
│   │   ├── rate-limit.ts
│   │   ├── rbac.ts
│   │   ├── request-logger.ts
│   │   ├── tenant-resolver.ts
│   │   └── validate.ts
│   ├── modules/                  # API modules (20 total)
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── applications/
│   │   ├── ats/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── connections/
│   │   ├── documents/
│   │   ├── events/
│   │   ├── freelance/
│   │   ├── interviews/
│   │   ├── invites/
│   │   ├── jobs/
│   │   ├── notifications/
│   │   ├── payments/
│   │   ├── tenants/
│   │   ├── training/
│   │   ├── users/
│   │   ├── vendors/
│   │   └── whitelabel/
│   └── types/                    # Type definitions
├── .eslintrc.cjs
├── Dockerfile
├── package.json
├── tsconfig.json
└── dist/                        # Build output (empty)
```

**Key Dependencies**:
- Express 4.19.0
- Prisma Client 5.14.0
- Socket.IO 4.7.5
- Passport 0.7.0
- Zod 3.23.0
- Redis (ioredis 5.3.2)

**Scripts**:
- `dev`: tsx watch src/server.ts
- `build`: TypeScript compilation with tsc-alias
- `start`: node dist/server.js
- `typecheck`: tsc --noEmit
- `lint`: eslint src

**Status**: ✅ Functional

---

### 1.2 Web Application

**Path**: `apps/web/`  
**Type**: Next.js 14  
**Language**: TypeScript  
**Purpose**: Web frontend

**Structure**:
```
apps/web/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (dashboard)/         # Dashboard routes
│   │   │   ├── admin/
│   │   │   ├── applications/
│   │   │   ├── ats/
│   │   │   ├── chat/
│   │   │   ├── college/
│   │   │   ├── connections/
│   │   │   ├── courses/
│   │   │   ├── documents/
│   │   │   ├── events/
│   │   │   ├── freelance/
│   │   │   ├── interviews/
│   │   │   ├── jobs/
│   │   │   ├── notifications/
│   │   │   ├── profile/
│   │   │   ├── recruiter/
│   │   │   ├── saved-jobs/
│   │   │   ├── settings/
│   │   │   ├── student/
│   │   │   ├── training/
│   │   │   ├── vendor/
│   │   │   ├── vendors/
│   │   │   └── whitelabel/
│   │   ├── (public)/            # Public routes
│   │   │   ├── forgot-password/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── reset-password/
│   │   │   └── verify-email/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── pending/
│   │   ├── suspended/
│   │   ├── error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── components/              # React components
│   │   ├── auth/
│   │   ├── layout/
│   │   └── ui/
│   ├── lib/                     # Utilities
│   │   ├── api/
│   │   ├── env.ts
│   │   ├── store/
│   │   └── utils/
│   └── types/
├── public/                      # Static assets
│   ├── favicon.ico
│   └── logo.svg
├── middleware.ts                # Next.js middleware
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.ts
├── .eslintrc.cjs
├── Dockerfile
├── package.json
├── tsconfig.json
├── tsconfig.tsbuildinfo        # Build artifact (should be ignored)
└── .next/                       # Build output (empty)
```

**Key Dependencies**:
- Next.js 14.2.3
- React 18.3.0
- Zustand 4.5.0
- React Hook Form 7.51.0
- Zod 3.23.0
- Radix UI components
- Tailwind CSS 3.4.0
- Socket.IO Client 4.7.5

**Scripts**:
- `dev`: next dev -p 3000
- `build`: next build
- `start`: next start
- `typecheck`: tsc --noEmit
- `lint`: next lint

**Status**: ✅ Functional

---

### 1.3 Mobile Application

**Path**: `apps/mobile/`  
**Type**: Expo React Native  
**Language**: TypeScript  
**Purpose**: Mobile frontend

**Structure**:
```
apps/mobile/
├── src/
│   ├── app/                     # Expo Router
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── jobs.tsx
│   │   │   ├── applications.tsx
│   │   │   ├── profile.tsx
│   │   │   └── settings.tsx
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── components/              # React Native components
│   ├── constants/
│   ├── lib/                     # Utilities
│   │   ├── api/
│   │   └── store/
│   └── types/
├── assets/                      # Assets (empty)
├── app.json
├── babel.config.js
├── expo-env.d.ts
├── package.json
└── tsconfig.json
```

**Key Dependencies**:
- Expo 51.0.0
- Expo Router 3.5.0
- React Native 0.74.1
- Zustand 4.5.0
- React Hook Form 7.51.0
- Zod 3.23.0
- Socket.IO Client 4.7.5
- Expo Secure Store 13.0.0
- Expo Notifications 0.28.0

**Scripts**:
- `start`: expo start
- `android`: expo start --android
- `ios`: expo start --ios
- `typecheck`: tsc --noEmit

**Status**: ✅ Functional

---

### 1.4 AI Service

**Path**: `apps/ai/`  
**Type**: FastAPI  
**Language**: Python  
**Purpose**: AI matching and scoring service

**Structure**:
```
apps/ai/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app
│   ├── config.py                # Configuration
│   ├── database.py              # Database connection
│   ├── models/                  # Pydantic models
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── routers/                 # API routes
│   │   ├── health.py
│   │   ├── matching.py
│   │   └── scoring.py
│   ├── services/                # Business logic
│   │   ├── matching.py
│   │   ├── scoring.py
│   │   └── recommendations.py
│   └── utils/                   # Utilities
│       ├── __init__.py
│       └── skills.py
├── .env                         # Environment (local)
├── .env.example                 # Environment template
├── .mypy_cache/                 # Type checking cache (should be ignored)
├── Dockerfile
├── requirements.txt
└── __pycache__/                 # Python cache (should be ignored)
    ├── app/
    ├── models/
    ├── routers/
    └── services/
```

**Key Dependencies**:
- FastAPI 0.111.0
- Uvicorn 0.29.0
- Pydantic 2.7.1
- SQLAlchemy 2.0.30
- AsyncPG 0.29.0
- Scikit-learn 1.4.2
- NumPy 1.26.4

**Status**: ✅ Functional

---

## 2. Packages

### 2.1 Types Package

**Path**: `packages/types/`  
**Type**: TypeScript library  
**Purpose**: Shared type definitions

**Structure**:
```
packages/types/
├── src/
│   └── index.ts                 # Type exports
├── dist/                        # Build output (empty)
├── package.json
└── tsconfig.json
```

**Dependencies**:
- @prisma/client 5.14.0

**Scripts**:
- `build`: tsc -p tsconfig.json
- `typecheck`: tsc --noEmit

**Status**: ✅ Functional

---

### 2.2 Utils Package

**Path**: `packages/utils/`  
**Type**: TypeScript library  
**Purpose**: Shared utility functions

**Structure**:
```
packages/utils/
├── src/
│   └── index.ts                 # Utility exports
├── dist/                        # Build output (empty)
├── package.json
└── tsconfig.json
```

**Dependencies**:
- @campushire/types 1.0.0
- date-fns 3.6.0
- nanoid 3.3.7

**Scripts**:
- `build`: npm run build --prefix ../types && tsc -p tsconfig.json
- `typecheck`: tsc --noEmit

**Status**: ✅ Functional

---

### 2.3 UI Package

**Path**: `packages/ui/`  
**Type**: React component library  
**Purpose**: Shared UI components

**Structure**:
```
packages/ui/
├── src/
│   └── index.ts                 # Component exports
├── node_modules/                # Dependencies (empty)
├── package.json
└── tsconfig.json
```

**Dependencies**:
- class-variance-authority 0.7.0
- clsx 2.1.1
- lucide-react 0.462.0
- react 18.3.1
- react-dom 18.3.1
- tailwind-merge 2.4.0

**Scripts**:
- `typecheck`: tsc --noEmit

**Status**: ✅ Functional

---

### 2.4 Config Package

**Path**: `packages/config/`  
**Type**: Configuration sharing  
**Purpose**: Shared ESLint, TypeScript, Tailwind configs

**Structure**:
```
packages/config/
├── eslint/
│   └── index.js                 # ESLint config
├── tailwind/
│   └── index.js                 # Tailwind config
├── tsconfig/
│   ├── base.json                # Base TypeScript config
│   ├── nextjs.json              # Next.js TypeScript config
│   └── react-native.json        # React Native TypeScript config
└── package.json
```

**Status**: ✅ Functional

---

## 3. Database

### 3.1 Prisma Schema

**Path**: `prisma/`  
**Type**: Database schema and seed

**Structure**:
```
prisma/
├── schema.prisma                # Database schema (45 models, 30+ enums)
├── seed.ts                      # Seed data script
└── tsconfig.json
```

**Models**: 45 total  
**Enums**: 30+ total  
**Database**: PostgreSQL

**Key Models**:
- User, Tenant, Invite
- StudentProfile, JobSeekerProfile
- Job, Application
- InterviewSlot
- CollegeProfile, RecruiterProfile
- Document, DocumentVerification
- Notification, NotificationPreference
- ChatThread, ChatMessage
- And 30+ more

**Status**: ✅ Complete schema, no migrations folder

---

## 4. Configuration

### 4.1 Root Configuration

**Path**: Root directory

**Files**:
- `package.json` - Root package.json with workspace config
- `turbo.json` - Turbo build orchestration
- `.gitignore` - Git ignore patterns
- `.gitattributes` - Git attributes
- `.github/workflows/ci.yml` - CI/CD pipeline
- `docker-compose.yml` - Docker Compose for local development
- `.env` - Local environment (not tracked)
- `.env.example` - Environment template

**Package Manager**: npm@10.8.2

**Root Scripts**:
- `build`: turbo run build
- `dev`: turbo run dev
- `lint`: turbo run lint
- `typecheck`: turbo run typecheck
- `db:generate`: prisma generate
- `db:push`: prisma db push
- `db:migrate`: prisma migrate deploy
- `db:seed`: ts-node prisma/seed.ts
- `db:studio`: prisma studio
- `reset-demo-passwords`: ts-node scripts/reset-demo-passwords.ts

**Status**: ✅ Configured

---

### 4.2 Environment Templates

**Root `.env.example`**:
- Database URL
- Redis URL
- JWT secrets
- OAuth credentials (Google, LinkedIn)
- AWS S3 credentials
- SMTP credentials
- Twilio credentials
- Firebase credentials
- Razorpay credentials
- AI service URL and key
- API port
- CORS origins

**AI Service `.env.example`**:
- Database URL
- API service key

**Status**: ✅ Complete templates

---

## 5. Docker

### 5.1 Docker Compose

**Path**: `docker-compose.yml`

**Services**:
- `postgres` - PostgreSQL 16-alpine
- `redis` - Redis 7-alpine
- `api` - API service (builds from apps/api/Dockerfile)
- `web` - Web service (builds from apps/web/Dockerfile)
- `ai` - AI service (builds from apps/ai/Dockerfile)

**Volumes**:
- postgres-data
- redis-data

**Networks**:
- campushire-network

**Status**: ✅ Configured

---

### 5.2 Dockerfiles

**API Dockerfile** (`apps/api/Dockerfile`):
- Node.js base image
- Copy package.json
- Install dependencies
- Copy source
- Build TypeScript
- Expose port 4000
- Start with tsx

**Web Dockerfile** (`apps/web/Dockerfile`):
- Node.js base image
- Copy package.json
- Install dependencies
- Copy source
- Build Next.js
- Expose port 3000
- Start with next start

**AI Dockerfile** (`apps/ai/Dockerfile`):
- Python base image
- Copy requirements.txt
- Install Python dependencies
- Copy source
- Expose port 8000
- Start with紫外icorn

**Status**: ✅ All Dockerfiles present

---

## 6. CI/CD

### 6.1 GitHub Actions

**Path**: `.github/workflows/ci.yml`

**Workflow**:
- Runs on push to main
- Checks out code
- Sets up Node.js
- Installs dependencies
- Runs typecheck
- Runs lint
- Validates Prisma schema
- Runs Python linting (mypy, flake8)

**Status**: ✅ Configured

---

## 7. Scripts

### 7.1 Root Scripts

**Path**: `scripts/`

**Files**:
- `reset-demo-passwords.ts` - Reset all demo passwords to standard value

**Purpose**: Demo password management

**Status**: ✅ Functional

---

## 8. Documentation

### 8.1 Root Documentation

**Path**: Root directory

**Files**:
- `CAMPUSHIRE_AUDIT.md` (37KB) - Previous comprehensive audit
- `CAMPUSHIRE_CLEANUP_PLAN.md` (12KB) - Cleanup plan (newly created)
- `CAMPUSHIRE_CODE_AUDIT.md` (24KB) - Code quality audit (newly created)
- `CAMPUSHIRE_GAP_ANALYSIS.md` (29KB) - Gap analysis (newly created)
- `CAMPUSHIRE_MODULE_STATUS.md` (35KB) - Module status (newly created)
- `CAMPUSHIRE_RECOVERY_ROADMAP.md` (26KB) - Recovery roadmap (newly created)
- `DEMO_CREDENTIALS_SUMMARY.md` (7KB) - Demo credentials
- `PRODUCTION_LAUNCH_PLAN.md` (5KB) - Production launch plan
- `RUNTIME_AUDIT.md` (6KB) - Runtime audit findings
- `SECRETS_ROTATION_CHECKLIST.md` (11KB) - Secrets rotation checklist

**Status**: ⚠️ Mix of new and old audit documents

---

### 8.2 Docs Directory

**Path**: `docs/`

**Files**:
- `00_PROJECT_OVERVIEW.md` (4KB) - Project overview
- `00_PROJECT_OVERVIEW - Copy.md` (4KB) - Duplicate
- `01_VISION_TO_CODE_MAPPING.md` (7KB) - Vision mapping
- `01_VISION_TO_CODE_MAPPING - Copy.md` (7KB) - Duplicate
- `02_SYSTEM_ARCHITECTURE.md` (5KB) - System architecture
- `03_CODEBASE_INVENTORY.md` (3KB) - Codebase inventory
- `04_API_INVENTORY.md` (93KB) - API inventory
- `05_DATABASE_INVENTORY.md` (26KB) - Database inventory
- `06_UI_PAGE_INVENTORY.md` (27KB) - UI page inventory
- `07_AUTH_ROLE_PERMISSION_AUDIT.md` (4KB) - Auth audit
- `08_DEPLOYMENT_AUDIT.md` (3KB) - Deployment audit
- `09_TESTING_MASTER_PLAN.md` (2KB) - Testing plan
- `10_LIMITATIONS_AND_KNOWN_ISSUES.md` (3KB) - Known issues
- `11_DEVELOPMENT_RULES.md` (2KB) - Development rules
- `12_MVP_SCOPE_LOCK.md` (1KB) - MVP scope
- `13_FIX_PHASE_PLAN.md` (3KB) - Fix phase plan
- `14_CHANGELOG_AND_FIX_LOG.md` (5KB) - Changelog
- `15_HANDOVER_FOR_NEXT_AI.md` (2KB) - Handover document
- `16_DEMO_LOGIN_CREDENTIALS.md` (11KB) - Demo credentials

**Status**: ⚠️ Contains duplicates, needs reorganization

---

## 9. Tools

**Path**: `tools/`

**Status**: ❌ Directory does not exist

---

## 10. Assets

### 10.1 Web Assets

**Path**: `apps/web/public/`

**Files**:
- `favicon.ico` (455 bytes)
- `logo.svg` (372 bytes)

**Status**: ✅ Minimal assets present

---

### 10.2 Mobile Assets

**Path**: `apps/mobile/assets/`

**Status**: ⚠️ Directory exists but empty

---

## 11. Public Files

### 11.1 Root Public Files

**Path**: Root directory

**Files**:
- `.gitignore` - Git ignore patterns
- `.gitattributes` - Git attributes
- `.github/` - GitHub configuration
- `package.json` - Root package.json
- `package-lock.json` - Lock file
- `turbo.json` - Turbo configuration

**Status**: ✅ Standard public files

---

## 12. Output

### 12.1 Build Outputs

**API**:
- `apps/api/dist/` - Empty (build output)

**Web**:
- `apps/web/.next/` - Empty (build output)
- `apps/web/tsconfig.tsbuildinfo` - Build artifact (should be ignored)

**Types Package**:
- `packages/types/dist/` - Empty (build output)

**Utils Package**:
- `packages/utils/dist/` - Empty (build output)

**Status**: ⚠️ Build artifacts present (tsconfig.tsbuildinfo)

---

## 13. Generated Artifacts

### 13.1 Audit JSON Files

**Path**: Root directory

**Files**:
- `audit_api_client_calls.json` (26KB)
- `audit_api_routes.json` (87KB)
- `audit_api_routes_detailed.json` (149KB)
- `audit_api_routes_enriched.json` (99KB)
- `audit_controller_service_calls.json` (15KB)
- `audit_mobile_pages.json` (800B)
- `audit_model_usage_counts.json` (28KB)
- `audit_prisma_models.json` (215KB)
- `audit_schema_exports.json` (5KB)
- `audit_service_models.json` (5KB)
- `audit_web_page_usage.json` (52KB)
- `audit_web_pages.json` (35KB)

**Total Size**: ~720KB of generated audit data

**Status**: ⚠️ Should be removed (generated artifacts)

---

### 13.2 Cache Files

**Python Cache**:
- `apps/ai/__pycache__/` - Python bytecode cache
- `apps/ai/.mypy_cache/` - MyPy type checking cache

**TypeScript Cache**:
- `apps/web/tsconfig.tsbuildinfo` - TypeScript build info

**Status**: ⚠️ Should be ignored by .gitignore

---

## 14. API Modules

**Path**: `apps/api/src/modules/`

**Modules** (20 total):
1. `admin/` - Admin operations
2. `analytics/` - Analytics endpoints
3. `applications/` - Application management
4. `ats/` - ATS operations
5. `auth/` - Authentication
6. `chat/` - Chat functionality
7. `connections/` - College-recruiter connections
8. `documents/` - Document management
9. `events/` - Event management
10. `freelance/` - Freelance recruiter operations
11. `interviews/` - Interview management
12. `invites/` - Invite code management
13. `jobs/` - Job posting
14. `notifications/` - Notifications
15. `payments/` - Payment processing
16. `tenants/` - Tenant management
17. `training/` - Training partner operations
18. `users/` - User management
19. `vendors/` - Vendor operations
20. `whitelabel/` - White-label configuration

**Status**: ✅ All modules present with standard structure

---

## 15. Web Routes

**Path**: `apps/web/src/app/`

**Route Groups**:
- `(dashboard)/` - Protected dashboard routes (60 items)
- `(public)/` - Public routes (6 items)
- `auth/` - Auth routes
- `onboarding/` - Onboarding routes
- `pending/` - Pending approval page
- `suspended/` - Suspended account page

**Status**: ✅ Comprehensive route structure

---

## 16. Mobile Routes

**Path**: `apps/mobile/src/app/`

**Route Groups**:
- `(auth)/` - Auth routes (2 items)
- `(tabs)/` - Tab routes (6 items)

**Status**: ✅ Basic mobile routing

---

## 17. Shared Libraries

**Path**: `packages/`

**Libraries** (4 total):
1. `types/` - Shared TypeScript types
2. `utils/` - Shared utility functions
3. `ui/` - Shared React components
4. `config/` - Shared configuration

**Status**: ✅ All shared packages present

---

## 18. Workspace Configuration

**Path**: Root `package.json`

**Workspaces**:
- `apps/*` - All applications
- `packages/*` - All packages

**Status**: ✅ Correctly configured

---

## 19. Lock Files

**Path**: Root directory

**Files**:
- `package-lock.json` (1.1MB) - npm lock file

**Status**: ✅ Present

---

## 20. Summary Statistics

### File Counts
- **Applications**: 4
- **Packages**: 4
- **API Modules**: 20
- **Web Routes**: 67+
- **Mobile Routes**: 8
- **Prisma Models**: 45
- **Prisma Enums**: 30+
- **Documentation Files**: 26 (root + docs)
- **Audit JSON Files**: 12
- **Docker Services**: 5

### Code Estimates
- **TypeScript Files**: ~200+
- **Python Files**: ~20+
- **Total Lines of Code**: ~50,000+

### Dependency Counts
- **Root Dependencies**: 7
- **API Dependencies**: 40+
- **Web Dependencies**: 20+
- **Mobile Dependencies**: 15+
- **AI Dependencies**: 13
- **Types Dependencies**: 1
- **Utils Dependencies**: 3
- **UI Dependencies**: 6

---

## 21. Issues Identified

### Critical Issues
1. **No Prisma migrations folder** - Using db push instead of migrations
2. **Audit JSON files in root** - Generated artifacts should be removed
3. **Duplicate documentation** - Copy files in docs/
4. **Build artifacts in repo** - tsconfig.tsbuildinfo, Python cache
5. **Missing .gitignore patterns** - Python cache, TypeScript build info not ignored

### Medium Issues
1. **Empty tools directory** - Directory doesn't exist
2. **Empty mobile assets** - No mobile assets
3. **Documentation organization** - Needs reorganization
4. **Old audit reports in root** - Should be archived

### Low Issues
1. **Minimal web assets** - Only favicon and logo
2. **No .editorconfig** - Missing editor configuration
3. **No .prettierrc** - Missing Prettier configuration

---

## 22. Repository Health Score

**Cleanliness**: 6/10  
**Organization**: 8/10  
**Documentation**: 7/10  
**Configuration**: 9/10  
**Standards**: 7/10  

**Overall Score**: 7.4/10

---

## 23. Next Steps

1. Remove audit JSON files
2. Archive old audit reports
3. Remove duplicate documentation
4. Update .gitignore
5. Reorganize documentation
6. Remove build artifacts
7. Add missing configuration files

---

**Repository Inventory Status**: Complete  
**Prepared By**: Repository Recovery  
**Date**: 2026-07-03
