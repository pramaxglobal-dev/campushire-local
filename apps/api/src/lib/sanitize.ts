import { sanitizeInput } from "@campushire/utils";

const sanitizeStringValue = (value: string): string => {
  return sanitizeInput(value.replace(/\0/g, "").trim());
};

const sanitizeUnknown = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeStringValue(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeUnknown(entry));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = sanitizeUnknown(nestedValue);
    }
    return output;
  }

  return value;
};

export function sanitizeBody(obj: Record<string, unknown>): Record<string, unknown> {
  return sanitizeUnknown(obj) as Record<string, unknown>;
}

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 100);
}

export function sanitizeSql(input: string): string {
  return input
    .replace(/\0/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/"/g, '\\"')
    .trim();
}
