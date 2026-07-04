"use client";

import { Skeleton } from "@/components/ui";

type SkeletonVariant = "card" | "list" | "table" | "profile" | "feed";

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
}

export const LoadingSkeleton = ({ variant = "card", count = 3 }: LoadingSkeletonProps) => {
  if (variant === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-card">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="mb-2 h-10 w-full" />
        ))}
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "feed") {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <Skeleton className="mt-4 h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-slate-100 bg-white p-4 shadow-card">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-2 h-3 w-3/4" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      ))}
    </div>
  );
};