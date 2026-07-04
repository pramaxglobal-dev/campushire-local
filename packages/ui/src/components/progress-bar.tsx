import * as React from "react";
import { cn } from "./lib";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
}

export const ProgressBar = ({ value, max = 100, className, ...props }: ProgressBarProps) => {
  const safeMax = max <= 0 ? 100 : max;
  const normalizedValue = Math.min(Math.max(value, 0), safeMax);
  const percentage = (normalizedValue / safeMax) * 100;

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)} {...props}>
      <div
        className="h-full rounded-full bg-accent-500 transition-all"
        style={{ width: `${percentage}%` }}
        aria-valuenow={normalizedValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        role="progressbar"
      />
    </div>
  );
};
