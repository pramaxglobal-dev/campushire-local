# CampusHire Secrets Rotation Checklist

Generated from:

- `apps/api/src/config/env.ts`
- `apps/ai/app/config.py`
- Source-wide scan for direct credential/env references
- Docker/Compose secret fallback review

No actual `.env` values are printed here. Rotate secrets in the provider console first, update deployment secret stores second, then redeploy API/AI/web/mobile as needed.

## Git Tracking Check

- `.env` is ignored by `.gitignore`.
- Evidence: `.gitignore` contains `.env`, `.env.local`, `.env.*.local`, `apps/ai/.env`, and `apps/ai/.env.local`.
- `git ls-files .env` returned no tracked path, so root `.env` is not tracked by Git.
- `git check-ignore -v .env` confirmed `.env` is ignored by `.gitignore`.

## Docker/Compose Credential Cleanup

Changed `docker-compose.yml` so Compose now fails loudly if `POSTGRES_PASSWORD` is missing:

- `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}`
- API `DATABASE_URL` now uses `${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}`
- AI `DATABASE_URL` now uses `${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}`

No hardcoded credential fallback was found in `apps/api/Dockerfile`, `apps/web/Dockerfile`, or `apps/ai/Dockerfile`.

## API Environment Variables

Source: `apps/api/src/config/env.ts`

| Env var | Required by schema | Service / integration | Where referenced | Rotation / generation source |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL / Prisma | `prisma/schema.prisma`, `apps/api/src/config/env.ts`, `docker-compose.yml` | Rotate DB user password in the Postgres host/provider. For local Compose set `POSTGRES_PASSWORD` and rebuild `DATABASE_URL`. |
| `REDIS_URL` | Yes | Redis / rate limit / cache | `apps/api/src/config/redis.ts`, `docker-compose.yml` | Rotate Redis password/token in Redis provider if auth is enabled; update URL. Local Compose Redis currently has no password. |
| `JWT_ACCESS_SECRET` | Yes | API JWT signing | `apps/api/src/lib/jwt.ts` | Generate new secret with `openssl rand -base64 48` or equivalent CSPRNG. Redeploy API and invalidate existing sessions. |
| `JWT_REFRESH_SECRET` | Yes | API refresh JWT signing | `apps/api/src/lib/jwt.ts` | Generate new secret with `openssl rand -base64 48`. Redeploy API and revoke/clear refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN` | Yes | JWT policy | `apps/api/src/lib/jwt.ts`, `apps/api/src/modules/auth/auth.service.ts` | Not a secret. Set policy value such as `15m`; review session risk. |
| `JWT_REFRESH_EXPIRES_IN` | Yes | JWT policy | `apps/api/src/lib/jwt.ts`, `apps/api/src/modules/auth/auth.service.ts` | Not a secret. Set policy value such as `7d`; review session risk. |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth | `apps/api/src/modules/auth/auth.routes.ts` | Rotate/replace OAuth client in Google Cloud Console. Client ID is not secret but should match callback domains. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth | `apps/api/src/modules/auth/auth.routes.ts` | Rotate in Google Cloud Console: APIs & Services -> Credentials -> OAuth client. |
| `GOOGLE_CALLBACK_URL` | Optional | Google OAuth | `apps/api/src/modules/auth/auth.routes.ts` | Not a secret. Update in Google Cloud Console authorized redirect URIs and env. |
| `LINKEDIN_CLIENT_ID` | Optional | LinkedIn OAuth | `apps/api/src/modules/auth/auth.routes.ts` | Rotate/replace in LinkedIn Developer Portal. Client ID is not secret. |
| `LINKEDIN_CLIENT_SECRET` | Optional | LinkedIn OAuth | `apps/api/src/modules/auth/auth.routes.ts` | Rotate in LinkedIn Developer Portal app Auth settings. |
| `LINKEDIN_CALLBACK_URL` | Optional | LinkedIn OAuth | `apps/api/src/modules/auth/auth.routes.ts` | Not a secret. Update in LinkedIn app redirect URLs and env. |
| `AWS_ACCESS_KEY_ID` | Optional | AWS S3 uploads | `apps/api/src/lib/s3.ts` | Create/rotate IAM access key in AWS IAM. Prefer scoped IAM role or least-privilege S3 key. |
| `AWS_SECRET_ACCESS_KEY` | Optional | AWS S3 uploads | `apps/api/src/lib/s3.ts` | Rotate IAM secret access key in AWS IAM; delete old key after deploy verification. |
| `AWS_REGION` | Optional | AWS S3 uploads | `apps/api/src/lib/s3.ts` | Not a secret. Set to bucket region such as `ap-south-1`. |
| `AWS_S3_BUCKET` | Optional | AWS S3 uploads | `apps/api/src/lib/s3.ts` | Not a secret. Verify bucket policy and CORS separately. |
| `SMTP_HOST` | Optional | Email / Nodemailer | `apps/api/src/lib/mailer.ts` | Not usually a secret. Use provider SMTP hostname. |
| `SMTP_PORT` | Optional | Email / Nodemailer | `apps/api/src/lib/mailer.ts` | Not a secret. Use provider SMTP port. |
| `SMTP_USER` | Optional | Email / Nodemailer | `apps/api/src/lib/mailer.ts` | Rotate SMTP username/API user in email provider if applicable. |
| `SMTP_PASS` | Optional | Email / Nodemailer | `apps/api/src/lib/mailer.ts` | Rotate SMTP password/API key in email provider console. |
| `EMAIL_FROM` | Optional | Email / Nodemailer | `apps/api/src/lib/mailer.ts` | Not a secret. Verify SPF/DKIM/DMARC for sender domain. |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio WhatsApp | `apps/api/src/lib/whatsapp.ts` | Account SID is identifier. Regenerate only if moving accounts/subaccounts. |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio WhatsApp | `apps/api/src/lib/whatsapp.ts` | Rotate in Twilio Console -> Account -> API credentials/Auth token. |
| `TWILIO_WHATSAPP_FROM` | Optional | Twilio WhatsApp | `apps/api/src/lib/whatsapp.ts` | Not a secret. Configure sender in Twilio WhatsApp/Sender settings. |
| `FIREBASE_PROJECT_ID` | Optional | Firebase Admin / FCM | `apps/api/src/lib/firebase.ts` | Not a secret. Use Firebase project settings. |
| `FIREBASE_PRIVATE_KEY` | Optional | Firebase Admin / FCM | `apps/api/src/lib/firebase.ts` | Generate a new service account private key in Firebase/Google Cloud IAM; delete old key. |
| `FIREBASE_CLIENT_EMAIL` | Optional | Firebase Admin / FCM | `apps/api/src/lib/firebase.ts` | Service account identity. Rotate by creating a new service account key or service account. |
| `RAZORPAY_KEY_ID` | Optional | Razorpay payments | `apps/api/src/lib/razorpay.ts`, `apps/api/src/modules/payments/payments.service.ts` | Rotate/generate API key in Razorpay Dashboard -> Account & Settings -> API Keys. |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay payments | `apps/api/src/lib/razorpay.ts` | Rotate/generate API secret in Razorpay Dashboard. Redeploy API before disabling old key. |
| `AI_SERVICE_URL` | Optional | Internal AI service | `apps/api/src/lib/ai.ts`, `docker-compose.yml` | Not a secret. Set to internal service URL. |
| `AI_SERVICE_KEY` | Optional | API-to-AI service auth | `apps/api/src/lib/ai.ts` | Generate with `openssl rand -base64 48`. Must match AI service `API_SERVICE_KEY`. |
| `API_PORT` | Yes | API runtime | `apps/api/src/server.ts` | Not a secret. Set deployment port. |
| `NODE_ENV` | Optional default | Runtime mode | multiple files | Not a secret. Use `development`, `test`, or `production`. |
| `CORS_ORIGIN` | Yes | API CORS / Socket.IO | `apps/api/src/app.ts`, `apps/api/src/lib/socket.ts` | Not a secret. Set exact trusted web origins. |
| `NEXT_PUBLIC_API_URL` | Yes | Web/API base URL and referral link helper | `apps/web/src/lib/env.ts`, `apps/api/src/modules/freelance/freelance.service.ts` | Public config, not a secret. Set to public API base URL. |

## AI Service Environment Variables

Source: `apps/ai/app/config.py`

Pydantic settings are case-insensitive, so these are typically supplied as uppercase env vars.

| Env var | Required by schema | Service / integration | Where referenced | Rotation / generation source |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Yes | AI PostgreSQL access | `apps/ai/app/database.py`, `docker-compose.yml` | Rotate DB password in Postgres provider. For local Compose set `POSTGRES_PASSWORD`; the AI `DATABASE_URL` is built from it. |
| `JWT_ACCESS_SECRET` | Yes | AI config parity with API JWT | `apps/ai/app/config.py` | Generate with `openssl rand -base64 48`. Keep aligned with API only if AI starts verifying JWTs. Current AI routes use service key auth. |
| `API_SERVICE_KEY` | Yes | API-to-AI service auth | `apps/ai/app/routers/matching.py`, `apps/ai/app/routers/scoring.py` | Generate with `openssl rand -base64 48`. Must match API `AI_SERVICE_KEY`. |
| `CORS_ORIGINS` | Optional default | AI CORS | `apps/ai/app/main.py` | Not a secret. Set allowed origins list for deployed web/API callers. |
| `DEBUG` | Optional default | AI runtime behavior | `apps/ai/app/config.py` | Not a secret. Keep false in production. |

## Additional Public Runtime Env References

These are not secret rotation items, but they are env values read directly outside the API/AI schemas.

| Env var | Source | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `apps/web/src/app/(dashboard)/dashboard/courses/[id]/page.tsx` | Public Razorpay checkout key fallback in browser. Use publishable key only. |
| `EXPO_PUBLIC_API_URL` | `apps/mobile/src/lib/api/client.ts` | Mobile API base URL. Public runtime config. |
| `DEMO_PASSWORD_RESET_ALLOWED` | `scripts/reset-demo-passwords.ts` | Safety switch for demo password reset script. Not a secret; do not enable in production. |

## Rotation Order

1. Inventory active deployments and secret stores: local `.env`, hosting provider env, Docker/Compose env, CI secrets, mobile build env.
2. Rotate provider-managed credentials first: Google, LinkedIn, AWS, SMTP, Twilio, Firebase, Razorpay, database, Redis.
3. Generate internal secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AI_SERVICE_KEY` / `API_SERVICE_KEY`.
4. Deploy AI with new `API_SERVICE_KEY`.
5. Deploy API with matching `AI_SERVICE_KEY`, new JWT secrets, and provider credentials.
6. Deploy web/mobile only for public config changes such as API URL or Razorpay public key.
7. Invalidate old sessions after JWT refresh-secret rotation.
8. Remove/deactivate old provider keys after smoke tests pass.
9. Verify no secrets are committed: `git ls-files .env apps/ai/.env` should return no paths.
10. Run smoke tests for login, OAuth, email, WhatsApp, file upload, payment order/verify, AI matching, and notifications.

## Source Evidence Snippets

```ts
// apps/api/src/config/env.ts
JWT_ACCESS_SECRET: z.string().min(32),
JWT_REFRESH_SECRET: z.string().min(32),
GOOGLE_CLIENT_SECRET: optionalNonEmpty,
AWS_SECRET_ACCESS_KEY: optionalNonEmpty,
SMTP_PASS: optionalNonEmpty,
TWILIO_AUTH_TOKEN: optionalNonEmpty,
FIREBASE_PRIVATE_KEY: optionalNonEmpty,
RAZORPAY_KEY_SECRET: optionalNonEmpty,
AI_SERVICE_KEY: z.string().min(32).optional(),
```

```py
# apps/ai/app/config.py
class Settings(BaseSettings):
    database_url: str
    jwt_access_secret: str
    api_service_key: str
```

```yaml
# docker-compose.yml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
DATABASE_URL=postgresql://campushire:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}@postgres:5432/campushire_db
```
