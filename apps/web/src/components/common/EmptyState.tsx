"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-8 text-center shadow-card">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-600">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {action ? (
        action.href ? (
          <Link href={action.href} className="mt-4">
            <Button>{action.label}</Button>
          </Link>
        ) : (
          <Button className="mt-4" onClick={action.onClick}>{action.label}</Button>
        )
      ) : null}
    </div>
  );
};