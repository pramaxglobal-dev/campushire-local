"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";
import { getMe } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { getDashboardPathForRole } from "@/lib/utils/routes";
import type { UserRole } from "@campushire/types";

export default function AuthCallbackPage() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const isNew = params.get("isNew") === "true";
    const error = params.get("error");

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=Missing%20auth%20tokens");
      return;
    }

    const run = async () => {
      try {
        setTokens(accessToken, refreshToken);
        const profile = await getMe();
        setUser(profile);

        if (isNew) {
          router.replace("/onboarding");
          return;
        }

        router.replace(getDashboardPathForRole(profile.role as UserRole));
      } catch {
        clearSession();
        router.replace("/login?error=Authentication%20failed");
      }
    };

    void run();
  }, [clearSession, router, setTokens, setUser]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-xl border border-slate-200 bg-white px-8 py-6 text-center shadow-card">
        <Spinner size="lg" className="mx-auto" />
        <p className="mt-3 text-sm font-medium text-slate-700">Finalizing your sign-in...</p>
      </div>
    </main>
  );
}
