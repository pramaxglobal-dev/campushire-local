import * as React from "react";
import { cn } from "./lib";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]"
};

export const Spinner = ({ size = "md", className, ...props }: SpinnerProps) => {
  return (
    <div
      role="status"
      className={cn(
        "inline-block animate-spin rounded-full border-accent-500 border-t-transparent",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
};
