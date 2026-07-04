"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { forgotPassword } from "@/lib/api/auth.api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Unable to process request.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-card">
        <CardContent className="p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Forgot password</h1>
              <p className="text-sm text-slate-600">We&apos;ll send reset instructions to your email.</p>
            </div>
          </div>

          {sent ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Check your email for password reset instructions.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </form>
          )}

          <Link href="/login" className="mt-5 inline-block text-sm font-medium text-accent hover:text-accent-600">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
