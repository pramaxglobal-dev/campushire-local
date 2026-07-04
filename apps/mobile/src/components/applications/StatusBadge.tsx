import { ApplicationStatus } from "@campushire/types";
import { Badge } from "@/components/ui/Badge";

const variantByStatus: Partial<Record<ApplicationStatus, "success" | "warning" | "danger" | "info">> = {
  APPLIED: "info",
  SCREENING: "warning",
  SHORTLISTED: "success",
  INTERVIEW_R1: "warning",
  INTERVIEW_R2: "warning",
  INTERVIEW_R3: "warning",
  OFFERED: "success",
  ACCEPTED: "success",
  HIRED: "success",
  REJECTED: "danger",
  WITHDRAWN: "danger",
  ON_HOLD: "warning"
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const variant = variantByStatus[status] ?? "default";
  return <Badge label={status.replaceAll("_", " ")} variant={variant} />;
}
