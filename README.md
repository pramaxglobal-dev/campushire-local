# CampusHire

> Enterprise campus hiring platform connecting students, recruiters, and educational institutions.

## Overview

CampusHire is a comprehensive TypeScript/Python monorepo providing end-to-end campus recruitment solutions with AI-powered matching, ATS capabilities, and multi-tenant architecture.

## Architecture

- **API** (`apps/api`) - Express.js REST API with Socket.IO
- **Web** (`apps/web`) - Next.js 14 web application
- **Mobile** (`apps/mobile`) - Expo React Native application
- **AI** (`apps/ai`) - FastAPI ML service for candidate matching

## Tech Stack

- **Languages**: TypeScript, Python
- **Frontend**: Next.js 14, React 18, React Native (Expo 51)
- **Backend**: Express.js, FastAPI
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Storage**: AWS S3
- **Real-time**: Socket.IO
- **Build**: Turbo (monorepo), TypeScript, ESBuild

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+
- Redis 7+
- Python 3.11+ (for AI service)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Seed database (development only)
npm run db:seed
```

### Development

```bash
# Start all services in development mode
npm run dev

# Or start individual services:
cd apps/api && npm run dev
cd apps/web && npm run dev
cd apps/mobile && npm start
cd apps/ai && uvicorn app.main:app --reload
```

### Build

```bash
# Build all packages
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Docker

```bash
# Start all services with Docker Compose
docker-compose up

# Build and start
docker-compose up --build
```

## Project Structure

```
campushire/
├── apps/
│   ├── api/          # Express API service
│   ├── web/          # Next.js web app
│   ├── mobile/       # Expo mobile app
│   └── ai/           # FastAPI AI service
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utilities
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configuration
├── prisma/           # Database schema and migrations
├── docs/             # Documentation
└── scripts/          # Operational scripts
```

## Key Features

### For Students
- Profile creation with education, experience, skills
- Job discovery and applications
- Resume management and document uploads
- Interview scheduling
- Real-time notifications
- Application tracking

### For Recruiters
- Job posting with approval workflows
- ATS kanban board for application management
- AI-powered candidate matching
- Interview scheduling and management
- College connections
- Analytics and reporting

### For Colleges
- Campus drive management
- Student placement tracking
- Recruiter relationship management
- Analytics and insights

### Platform Features
- Multi-tenant white-label support
- Role-based access control (8 roles)
- Email, WhatsApp, and push notifications
- Real-time chat
- Document verification
- Payment integration (Razorpay)
- OAuth support (Google, LinkedIn)

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- [Project Overview](docs/00_PROJECT_OVERVIEW.md)
- [Architecture](docs/02_ARCHITECTURE.md)
- [Database Schema](docs/04_DATABASE.md)
- [API Reference](docs/05_API.md)
- [Authentication](docs/07_AUTH.md)
- [Deployment Guide](docs/08_DEPLOYMENT.md)
- [Engineering Rules](docs/11_ENGINEERING_RULES.md)

## Environment Variables

Key environment variables (see `.env.example` for complete list):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `AWS_*` - AWS S3 credentials
- `SMTP_*` - Email service credentials
- `TWILIO_*` - WhatsApp/SMS credentials
- `FIREBASE_*` - Push notification credentials

## Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build all packages
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes (dev only)
- `npm run db:migrate` - Run migrations (production)
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio

## Testing

Testing infrastructure setup is in progress. See [Testing Master Plan](docs/09_TESTING.md).

## Contributing

1. Follow the [Engineering Rules](docs/11_ENGINEERING_RULES.md)
2. Use conventional commits
3. Ensure TypeScript type checking passes
4. Ensure lint passes
5. Test your changes thoroughly

## License

Proprietary - All Rights Reserved

## Support

For questions or issues, contact the development team.
