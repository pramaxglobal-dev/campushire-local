"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { resetPassword } from "@/lib/api/auth.api";
import { getPasswordStrength, passwordRegex } from "@/lib/utils/validators";

const strengthWidth: Record<"weak" | "fair" | "good" | "strong", string> = {
  weak: "25%",
  fair: "50%",
  good: "75%",
  strong: "100%"
};

const strengthColor: Record<"weak" | "fair" | "good" | "strong", string> = {
  weak: "bg-rose-500",
  fair: "bg-amber-500",
  good: "bg-sky-500",
  strong: "bg-emerald-500"
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (!passwordRegex.test(password)) {
      setError("Password must include uppercase, lowercase, number, and symbol.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess("Password reset successful. Redirecting to sign in...");
      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Unable to reset password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-card">
        <CardContent className="p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Reset password</h1>
              <p className="text-sm text-slate-600">Set a new secure password for your account.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="New password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Password strength</span>
                <span className="font-medium capitalize">{strength}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className={`h-2 rounded-full ${strengthColor[strength]}`} style={{ width: strengthWidth[strength] }} />
              </div>
            </div>
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset password
            </Button>
          </form>

          <Link href="/login" className="mt-5 inline-block text-sm font-medium text-accent hover:text-accent-600">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
