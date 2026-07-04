"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { resendVerification, verifyEmail } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { useUser } from "@/lib/hooks/useUser";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { refresh } = useUser();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("your registered email");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") ?? "your registered email");
    setToken(params.get("token"));
  }, []);

  useEffect(() => {
    if (!token || isVerifyingToken) return;

    let active = true;

    const run = async () => {
      setIsVerifyingToken(true);
      try {
        await verifyEmail(token);
        if (active) {
          setStatus("Email verified successfully. Redirecting to onboarding...");
          router.replace("/onboarding");
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "Unable to verify email token.";
          setStatus(message);
        }
      } finally {
        if (active) {
          setIsVerifyingToken(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [isVerifyingToken, router, token]);

  useEffect(() => {
    if (!accessToken) return;

    const timer = window.setInterval(() => {
      void refresh()
        .then((profile) => {
          if (profile.isEmailVerified) {
            router.replace("/onboarding");
          }
        })
        .catch(() => undefined);
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [accessToken, refresh, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const resendText = useMemo(() => {
    if (cooldown > 0) {
      return `Retry in ${cooldown}s`;
    }
    return "Resend verification email";
  }, [cooldown]);

  const handleResend = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || normalizedEmail === "your registered email") {
      setStatus("Missing email. Please return to register and try again.");
      return;
    }

    setIsResending(true);
    setStatus("");
    try {
      await resendVerification(normalizedEmail);
      setCooldown(60);
      setStatus("Verification email sent. Check inbox and spam folder.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resend verification email.";
      setStatus(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-card">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Check your inbox</h1>
          <p className="mt-3 text-sm text-slate-600">
            We sent a verification link to <span className="font-semibold text-slate-800">{email}</span>.
          </p>
          <p className="mt-2 text-xs text-slate-500">Didn&apos;t get it? Check your spam folder.</p>

          {status ? <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{status}</p> : null}

          <Button
            className="mt-5 w-full"
            variant="outline"
            disabled={cooldown > 0 || isVerifyingToken || isResending}
            onClick={() => void handleResend()}
          >
            {isResending ? "Sending..." : resendText}
          </Button>

          <a href="mailto:support@campushire.in" className="mt-4 inline-block text-xs font-medium text-accent hover:text-accent-600">
            Contact support
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
