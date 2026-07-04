"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
          <p className="mt-1 text-sm text-rose-700">{message}</p>
          {onRetry ? (
            <Button variant="outline" size="sm" className="mt-3 border-rose-300 text-rose-700" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
