"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@campushire/types";
import { useAuthStore } from "@/lib/store/auth.store";
import { getDashboardPathForRole } from "@/lib/utils/routes";
import { Spinner } from "@/components/ui";

export default function DashboardHubPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;
    router.replace(getDashboardPathForRole(user.role as UserRole));
  }, [router, user]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto" />
        <p className="mt-3 text-sm text-slate-600">Preparing your dashboard...</p>
      </div>
    </div>
  );
}
