import { ApplicationStatus, InterviewMode, InterviewStatus, JobStatus } from "@campushire/types";
import { formatDistanceToNow } from "date-fns";

export const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const toTimeAgo = (value: string | Date | null | undefined): string => {
  const date = toDate(value);
  if (!date) return "N/A";
  return formatDistanceToNow(date, { addSuffix: true });
};

export const getApplicationStatusLabel = (status: ApplicationStatus): string => {
  return status.replaceAll("_", " ");
};

export const getJobStatusLabel = (status: JobStatus): string => {
  return status.replaceAll("_", " ");
};

export const getInterviewModeLabel = (mode: InterviewMode): string => {
  if (mode === InterviewMode.IN_PERSON) return "In-Person";
  return mode.charAt(0) + mode.slice(1).toLowerCase();
};

export const getInterviewStatusLabel = (status: InterviewStatus): string => {
  return status.replaceAll("_", " ");
};

export const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

export const asArray = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) return [];
  return value;
};

export const getString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

export const getNumber = (value: unknown, fallback = 0): number => {
  return typeof value === "number" ? value : fallback;
};

export const getBoolean = (value: unknown, fallback = false): boolean => {
  return typeof value === "boolean" ? value : fallback;
};
