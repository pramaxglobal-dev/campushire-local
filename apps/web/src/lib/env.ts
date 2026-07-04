const PROD_API_FALLBACK_URL = "https://campushire-api-iv3e.onrender.com";
const LOCAL_DEV_API_URL = "http://localhost:4000";
const requiredEnvVars = ["NEXT_PUBLIC_API_URL"] as const;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const nodeEnv = process.env.NODE_ENV ?? "development";
const isDev = nodeEnv === "development";
const isProd = nodeEnv === "production";

const normalizeUrl = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  const withoutTrailingSlash = normalized.replace(/\/+$/, "");
  return withoutTrailingSlash.replace(/\/api$/i, "");
};

const configuredApiUrl = normalizeUrl(process.env.NEXT_PUBLIC_API_URL);

for (const key of requiredEnvVars) {
  if (!process.env[key] && !isBuildPhase && isDev) {
    console.warn(`Missing required environment variable: ${key}`);
  }
}

const resolvedApiUrl = configuredApiUrl ?? (isDev ? LOCAL_DEV_API_URL : PROD_API_FALLBACK_URL);

export const env = {
  apiUrl: resolvedApiUrl,
  nodeEnv,
  isDev,
  isProd
};
