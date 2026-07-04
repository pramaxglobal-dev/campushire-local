import Link from "next/link";
import { cookies } from "next/headers";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFoundPage() {
  const hasSession = Boolean(cookies().get("campushire_access_token")?.value);
  const primaryHref = hasSession ? "/dashboard" : "/";
  const primaryLabel = hasSession ? "Back to Dashboard" : "Back to Home";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page you requested is not available right now.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={primaryHref}>
            <Button className="w-full sm:w-auto">{primaryLabel}</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
