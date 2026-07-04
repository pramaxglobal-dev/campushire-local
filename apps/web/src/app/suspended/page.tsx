"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/hooks/useAuth";

export default function SuspendedPage() {
  const { logout } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-rose-50 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-rose-700">Account Suspended</h1>
        <p className="mt-3 text-sm text-slate-700">
          Your account has been suspended. Please contact support for assistance.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="mailto:support@campushire.in">
            <Button variant="outline">support@campushire.in</Button>
          </Link>
          <Button variant="destructive" onClick={() => void logout()}>
            Logout
          </Button>
        </div>
      </div>
    </main>
  );
}
