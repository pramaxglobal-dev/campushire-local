# CampusHire Repository Standards

**Generated**: 2026-07-03  
**Purpose**: Document repository hygiene, standards, and conventions to maintain codebase quality

---

## Executive Summary

This document defines the coding standards, naming conventions, file organization, and development practices for the CampusHire repository. These standards ensure consistency, maintainability, and quality across the codebase.

**Repository Type**: Monorepo (npm workspaces + Turbo)  
**Primary Languages**: TypeScript (API/Web/Mobile), Python (AI Service)  
**Package Manager**: npm@10.8.2

---

## 1. Repository Structure

### 1.1 Monorepo Organization

```
campushire/
├── apps/                    # Applications
│   ├── api/                # Express.js API
│   ├── web/                # Next.js web app
│   ├── mobile/             # Expo mobile app
│   └── ai/                 # FastAPI AI service
├── packages/               # Shared packages
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Shared utilities
│   ├── ui/                 # Shared UI components
│   └── config/             # Shared configuration
├── prisma/                 # Database schema
│   ├── schema.prisma      # Prisma schema
│   ├── migrations/        # Migration history
│   └── seed.ts            # Seed data
├── scripts/                # Operational scripts
├── docs/                   # Documentation
│   └── archive/           # Historical documents
├── .github/                # GitHub configuration
│   └── workflows/         # CI/CD workflows
├── package.json            # Root package.json
├── turbo.json              # Turbo configuration
├── docker-compose.yml      # Docker Compose
└── .env.example            # Environment template
```

**Status**: ✅ Correctly organized

---

## 2. Naming Conventions

### 2.1 TypeScript/JavaScript

#### Files and Directories
- **Components**: PascalCase (e.g., `LoginForm.tsx`, `JobCard.tsx`)
- **Utilities**: kebab-case (e.g., `auth-utils.ts`, `date-helpers.ts`)
- **API Routes**: kebab-case (e.g., `auth.routes.ts`, `jobs.routes.ts`)
- **Services**: kebab-case (e.g., `auth.service.ts`, `jobs.service.ts`)
- **Types**: PascalCase (e.g., `UserTypes.ts`, `ApiTypes.ts`)

#### Code
- **Variables**: camelCase (e.g., `const userName = "John"`)
- **Functions**: camelCase (e.g., `function getUserById() {}`)
- **Classes**: PascalCase (e.g., `class UserService {}`)
- **Interfaces**: PascalCase with "I" prefix optional (e.g., `interface User {}` or `interface IUser {}`)
- **Types**: PascalCase (e.g., `type UserId = string`)
- **Enums**: PascalCase for enum name, UPPER_SNAKE_CASE for values (e.g., `enum UserRole { SUPER_ADMIN = "SUPER_ADMIN" }`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `const API_BASE_URL = "..."`)

### 2.2 Python (AI Service)

#### Files and Directories
- **Modules**: snake_case (e.g., `matching.py`, `scoring.py`)
- **Packages**: snake_case (e.g., `routers/`, `services/`)

#### Code
- **Variables**: snake_case (e.g., `user_name = "John"`)
- **Functions**: snake_case (e.g., `def get_user_by_id():`)
- **Classes**: PascalCase (e.g., `class UserService:`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL = "..."`)

### 2.3 Database (Prisma)

- **Models**: PascalCase singular (e.g., `model User {}`)
- **Fields**: camelCase (e.g., `email String`, `passwordHash String`)
- **Enums**: PascalCase (e.g., `enum UserRole {}`)
- **Relations**: camelCase (e.g., `applications Application[]`)

### 2.4 API Endpoints

- **Routes**: kebab-case with HTTP verbs (e.g., `GET /api/jobs`, `POST /api/jobs/:id/apply`)
- **Query parameters**: camelCase (e.g., `?sortBy=createdAt&order=desc`)
- **Path parameters**: camelCase (e.g., `/api/users/:userId`)

**Status**: ✅ Standards documented

---

## 3. Code Organization

### 3.1 API Module Structure

Each API module follows this structure:

```
apps/api/src/modules/{module}/
├── {module}.routes.ts       # Express routes
├── {module}.controller.ts   # Request handlers
├── {module}.service.ts      # Business logic
├── {module}.schema.ts       # Zod validation schemas
└── {module}.types.ts        # TypeScript types (optional)
```

**Pattern**: Routes → Controller → Service → Database

### 3.2 Web Application Structure

```
apps/web/src/
├── app/                     # Next.js App Router
│   ├── (dashboard)/        # Protected routes
│   ├── (public)/           # Public routes
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── auth/               # Auth components
│   ├── layout/             # Layout components
│   └── ui/                 # UI components
├── lib/                     # Utilities
│   ├── api/                # API clients
│   ├── store/              # Zustand stores
│   └── utils/              # Utility functions
└── types/                   # Type definitions
```

### 3.3 Import Order

```typescript
// 1. External dependencies
import React from "react";
import { useForm } from "react-hook-form";

// 2. Internal packages
import { Button } from "@campushire/ui";
import { formatDate } from "@campushire/utils";

// 3. Relative imports (parents first)
import { AuthLayout } from "../../components/layout/AuthLayout";
import { LoginForm } from "./LoginForm";

// 4. Types
import type { User } from "@campushire/types";
```

**Status**: ✅ Standards documented

---

## 4. Git Standards

### 4.1 .gitignore

Required patterns:
```
# Dependencies
node_modules/
**/node_modules/

# Build output
dist/
.next/
coverage/
turbo/

# Environment files
.env
.env.local
.env.*.local

# Logs
*.log

# OS/editor
.DS_Store
Thumbs.db
.vscode/
.idea/

# Python
__pycache__/
*.py[cod]
.mypy_cache/

# TypeScript
*.tsbuildinfo

# Generated files
audit_*.json
```

### 4.2 Commit Messages

Follow Conventional Commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD changes

Examples:
```
feat(auth): add remember me functionality
fix(jobs): resolve job expiration bug
docs(api): update API documentation
```

### 4.3 Branch Naming

```
<type>/<short-description>
```

Examples:
- `feat/offer-management`
- `fix/token-storage`
- `docs/api-docs`
- `refactor/error-handling`

**Status**: ✅ Standards documented

---

## 5. TypeScript Configuration

### 5.1 Compiler Options

- **Target**: ES2020 or higher
- **Strict**: true (enable all strict type checking)
- **Module**: ESNext
- **Module Resolution**: bundler or node
- **JSX**: preserve (for React)
- **esModuleInterop**: true
- **skipLibCheck**: true
- **forceConsistentCasingInFileNames**: true

### 5.2 Path Aliases

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@campushire/types": ["../../packages/types/src"],
      "@campushire/utils": ["../../packages/utils/src"],
      "@campushire/ui": ["../../packages/ui/src"]
    }
  }
}
```

**Status**: ✅ Configured

---

## 6. Linting and Formatting

### 6.1 ESLint

Configuration at `apps/*/eslintrc.cjs`:
- Extend `@typescript-eslint/recommended`
- Enable React/Next.js rules where appropriate
- Consistent rules across all TypeScript packages

### 6.2 Prettier (Recommended)

Not currently configured. Recommend adding:
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Status**: ⚠️ ESLint configured, Prettier not configured

---

## 7. Environment Variables

### 7.1 Naming

- Use UPPER_SNAKE_CASE
- Prefix with service name if ambiguous (e.g., `API_PORT`, `WEB_PORT`)
- Group related variables with common prefixes (e.g., `AWS_*`, `SMTP_*`)

### 7.2 Validation

All services should validate environment variables at startup using Zod:

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  // ...
});

export const env = envSchema.parse(process.env);
```

### 7.3 .env.example

Always provide `.env.example` with:
- All required variables
- Strong placeholder examples
- Comments explaining each variable

**Status**: ✅ Validation implemented

---

## 8. Database Standards

### 8.1 Prisma Migrations

- Use `prisma migrate dev` in development
- Use `prisma migrate deploy` in production
- Never use `prisma db push` except for prototyping
- Always commit migration files
- Write descriptive migration names

### 8.2 Schema Organization

```prisma
// 1. Generator and datasource
generator client { ... }
datasource db { ... }

// 2. Enums
enum UserRole { ... }

// 3. Models (grouped logically)
// User models
model User { ... }
model UserProfile { ... }

// Job models
model Job { ... }
model Application { ... }
```

### 8.3 Naming

- Models: PascalCase singular
- Fields: camelCase
- Relations: Descriptive and camelCase
- Enums: PascalCase

**Status**: ⚠️ Currently using db push, needs migration baseline

---

## 9. API Standards

### 9.1 Response Format

Consistent envelope:
```typescript
{
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}
```

### 9.2 Status Codes

- 200: Success (GET, PUT, PATCH)
- 201: Created (POST)
- 204: No Content (DELETE)
- 400: Bad Request (validation errors)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate resource)
- 500: Internal Server Error

### 9.3 Error Messages

- User-friendly messages for client errors (4xx)
- Generic messages for server errors (5xx)
- Include error codes for programmatic handling
- Log detailed errors server-side

**Status**: ✅ Standards implemented

---

## 10. Testing Standards

### 10.1 File Naming

- Unit tests: `{filename}.test.ts`
- Integration tests: `{filename}.integration.test.ts`
- E2E tests: `{feature}.e2e.ts`

### 10.2 Test Organization

```
src/
├── modules/
│   └── auth/
│       ├── auth.service.ts
│       ├── auth.service.test.ts           # Unit tests
│       └── auth.integration.test.ts       # Integration tests
└── __tests__/
    └── e2e/
        └── auth.e2e.ts                     # E2E tests
```

### 10.3 Coverage Requirements

- **Target**: 80% code coverage
- **Critical paths**: 100% coverage
- **Edge cases**: Cover error conditions

**Status**: ❌ No tests currently, needs implementation

---

## 11. Documentation Standards

### 11.1 Code Comments

- Use JSDoc for public APIs
- Explain "why" not "what"
- Comment complex business logic
- Keep comments up to date

### 11.2 README Files

Each application/package should have:
```markdown
# Package Name

## Description
Brief description of the package

## Installation
Installation instructions

## Usage
Usage examples

## Configuration
Configuration options

## Scripts
Available scripts and their purpose
```

### 11.3 Documentation Files

- Use numbered prefixes (00_, 01_, etc.)
- Keep documentation current
- Archive outdated documentation
- Use markdown for all documentation

**Status**: ✅ Documentation structure established

---

## 12. Security Standards

### 12.1 Authentication

- Use HttpOnly cookies for tokens (not localStorage)
- Implement refresh token rotation
- Validate tokens on every request
- Expire tokens appropriately

### 12.2 Authorization

- Check permissions at route level
- Validate user owns resource
- Use role-based access control
- Log authorization failures

### 12.3 Input Validation

- Validate all inputs with Zod
- Sanitize user inputs
- Escape outputs
- Use parameterized queries

### 12.4 Secrets Management

- Never commit secrets
- Use environment variables
- Rotate secrets regularly
- Use secrets manager in production

**Status**: ⚠️ Needs hardening (token storage, file uploads)

---

## 13. Performance Standards

### 13.1 Database Queries

- Use selective fields (Prisma select)
- Avoid N+1 queries
- Use database indexes
- Cache frequent queries

### 13.2 API Responses

- Implement pagination
- Use compression
- Cache responses
- Limit response size

### 13.3 Frontend

- Code splitting
- Lazy loading
- Image optimization
- Tree shaking

**Status**: ⚠️ Needs caching implementation

---

## 14. Deployment Standards

### 14.1 Environments

- **Development**: Local development
- **Staging**: Production-like testing
- **Production**: Live environment

### 14.2 Environment Configuration

Each environment should have:
- Separate databases
- Separate Redis instances
- Separate S3 buckets
- Separate API keys

### 14.3 Deployment Process

1. Build in CI
2. Run tests
3. Deploy to staging
4. Run E2E tests
5. Manual QA
6. Deploy to production
7. Smoke tests
8. Monitor

**Status**: ⚠️ Staging and production not configured

---

## 15. Monitoring Standards

### 15.1 Logging

- Use structured logging (Pino)
- Log levels: error, warn, info, debug
- Include context (user ID, request ID)
- Don't log secrets

### 15.2 Error Tracking

- Use error tracking service (Sentry)
- Include stack traces
- Include user context
- Set up alerts

### 15.3 Performance Monitoring

- Use APM (DataDog/New Relic)
- Monitor database queries
- Monitor API response times
- Monitor cache hit rates

**Status**: ❌ Not implemented

---

## Summary

### Established Standards ✅
- Repository structure
- Naming conventions
- Code organization
- Import order
- TypeScript configuration
- Environment variable validation
- API response format
- Documentation structure

### Needs Implementation ⚠️
- Prettier configuration
- Prisma migrations
- Testing infrastructure
- Security hardening
- Caching strategy
- Production deployment
- Monitoring

### Not Started ❌
- Test coverage
- Error tracking
- Performance monitoring

---

**Repository Standards Status**: Documented  
**Prepared By**: Repository Recovery  
**Date**: 2026-07-03
