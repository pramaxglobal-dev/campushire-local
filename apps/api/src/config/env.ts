import { z } from "zod";

const optionalNonEmpty = z.string().trim().min(1).optional();

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  REDIS_URL: z.string().trim().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1),
  GOOGLE_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_SECRET: optionalNonEmpty,
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  LINKEDIN_CLIENT_ID: optionalNonEmpty,
  LINKEDIN_CLIENT_SECRET: optionalNonEmpty,
  LINKEDIN_CALLBACK_URL: z.string().url().optional(),
  AWS_ACCESS_KEY_ID: optionalNonEmpty,
  AWS_SECRET_ACCESS_KEY: optionalNonEmpty,
  AWS_REGION: optionalNonEmpty,
  AWS_S3_BUCKET: optionalNonEmpty,
  SMTP_HOST: optionalNonEmpty,
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: optionalNonEmpty,
  SMTP_PASS: optionalNonEmpty,
  EMAIL_FROM: z.string().email().optional(),
  TWILIO_ACCOUNT_SID: optionalNonEmpty,
  TWILIO_AUTH_TOKEN: optionalNonEmpty,
  TWILIO_WHATSAPP_FROM: optionalNonEmpty,
  FIREBASE_PROJECT_ID: optionalNonEmpty,
  FIREBASE_PRIVATE_KEY: optionalNonEmpty,
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  RAZORPAY_KEY_ID: optionalNonEmpty,
  RAZORPAY_KEY_SECRET: optionalNonEmpty,
  AI_SERVICE_URL: z.string().url().optional(),
  AI_SERVICE_KEY: z.string().min(32).optional(),
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
  FIREBASE_PRIVATE_KEY: data.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
};

export type Env = typeof env;
