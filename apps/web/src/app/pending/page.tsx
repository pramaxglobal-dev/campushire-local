"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { getMe } from "@/lib/api/auth.api";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/store/auth.store";
import { getDashboardPathForRole } from "@/lib/utils/routes";
import { getRoleLabel, formatDate } from "@campushire/utils";
import type { UserRole } from "@campushire/types";

export default function PendingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();

  useEffect(() => {
    const timer = window.setInterval(() => {
      void getMe()
        .then((profile) => {
          if (profile.isApproved) {
            router.replace(getDashboardPathForRole(profile.role as UserRole));
          }
        })
        .catch(() => undefined);
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <svg viewBox="0 0 160 160" className="mx-auto h-24 w-24 text-primary" aria-hidden="true">
          <path fill="currentColor" d="M50 20h60v16H96v26.6c16.5 6 28 21.8 28 40.4 0 24-20 44-44 44s-44-20-44-44c0-18.6 11.5-34.4 28-40.4V36H50V20Zm30 52c-17.1 0-31 13.9-31 31s13.9 31 31 31 31-13.9 31-31S97.1 72 80 72Zm-9 15h18v15H71V87Z" />
        </svg>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Your account is under review</h1>
        <p className="mt-3 text-sm text-slate-600">
          Our team reviews all accounts within 24 to 48 hours. You&apos;ll receive email and WhatsApp updates once approved.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700">
          <p><span className="font-semibold">Role:</span> {user ? getRoleLabel(user.role as UserRole) : "Pending"}</p>
          <p className="mt-1"><span className="font-semibold">Email:</span> {user?.email ?? ""}</p>
          <p className="mt-1"><span className="font-semibold">Submitted:</span> {user ? formatDate(new Date(user.createdAt)) : ""}</p>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="mailto:support@campushire.in">
            <Button variant="outline">Contact Support</Button>
          </Link>
          <Button onClick={() => void logout()}>Logout</Button>
        </div>
      </div>
    </main>
  );
}
