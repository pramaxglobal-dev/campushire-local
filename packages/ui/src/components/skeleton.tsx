import * as React from "react";
import { cn } from "./lib";

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} {...props} />;
};
