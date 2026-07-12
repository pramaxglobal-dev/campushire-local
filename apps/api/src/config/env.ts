import "dotenv/config";
import { z } from "zod";

// Coerce empty / whitespace-only strings to undefined so dotenv blank values
// (e.g. GOOGLE_CLIENT_ID=) don't fail optional integration validation.
const optionalNonEmpty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().min(1).optional());

// Same treatment for optional URL fields that can be left blank in .env
const optionalUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().url().optional());

// Same treatment for optional email fields
const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().email().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  REDIS_URL: z.string().trim().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1),
  GOOGLE_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_SECRET: optionalNonEmpty,
  GOOGLE_CALLBACK_URL: optionalUrl,
  LINKEDIN_CLIENT_ID: optionalNonEmpty,
  LINKEDIN_CLIENT_SECRET: optionalNonEmpty,
  LINKEDIN_CALLBACK_URL: optionalUrl,
  AWS_ACCESS_KEY_ID: optionalNonEmpty,
  AWS_SECRET_ACCESS_KEY: optionalNonEmpty,
  AWS_REGION: optionalNonEmpty,
  AWS_S3_BUCKET: optionalNonEmpty,
  SMTP_HOST: optionalNonEmpty,
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: optionalNonEmpty,
  SMTP_PASS: optionalNonEmpty,
  EMAIL_FROM: optionalEmail,
  TWILIO_ACCOUNT_SID: optionalNonEmpty,
  TWILIO_AUTH_TOKEN: optionalNonEmpty,
  TWILIO_WHATSAPP_FROM: optionalNonEmpty,
  FIREBASE_PROJECT_ID: optionalNonEmpty,
  FIREBASE_PRIVATE_KEY: optionalNonEmpty,
  FIREBASE_CLIENT_EMAIL: optionalEmail,
  RAZORPAY_KEY_ID: optionalNonEmpty,
  RAZORPAY_KEY_SECRET: optionalNonEmpty,
  AI_SERVICE_URL: optionalUrl,
  AI_SERVICE_KEY: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().min(32).optional()),
  // Frontend origin used to build clickable links in emails.
  // Falls back to http://localhost:3000 when not set so existing local
  // installs work without any .env changes.
  FRONTEND_URL: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().url().optional()),
  API_PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().trim().min(1),
  NEXT_PUBLIC_API_URL: z.string().url()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

const data = parsed.data;

export const env = {
  ...data,
  // Provide a reliable FRONTEND_URL at runtime. When the env var is not set
  // (e.g. local development without a full .env) we fall back to the local
  // dev origin so email links still work during testing.
  FRONTEND_URL: data.FRONTEND_URL ?? "http://localhost:3000",
  FIREBASE_PRIVATE_KEY: data.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
};

export type Env = typeof env;
