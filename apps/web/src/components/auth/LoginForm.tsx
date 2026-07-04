"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/components/ui";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { useAuth } from "@/lib/hooks/useAuth";
import { loginSchema } from "@/lib/utils/validators";
import { ROUTES } from "@/lib/utils/routes";
import type { LoginDto } from "@/lib/api/auth.api";

export const LoginForm = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const isSubmitting = form.formState.isSubmitting;

  const submitLabel = useMemo(() => {
    return isSubmitting ? "Signing in..." : "Sign In";
  }, [isSubmitting]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      await login(values);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      setFormError(message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {formError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={form.formState.errors.email?.message}
        disabled={isSubmitting}
        {...form.register("email")}
      />

      <div className="space-y-2">
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            disabled={isSubmitting}
            className="pr-10"
            {...form.register("password")}
          />
          <button
            type="button"
            className="absolute right-3 top-[2.3rem] text-slate-500 transition hover:text-slate-700"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
            />
            Remember me
          </label>
          <Link href={ROUTES.FORGOT_PASSWORD} className="text-accent transition hover:text-accent-600">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        className="h-11 w-full bg-accent text-white hover:bg-accent-600"
        disabled={isSubmitting}
      >
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-slate-500">or continue with</span>
        </div>
      </div>

      <OAuthButtons mode="login" />

      <p className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link href={ROUTES.REGISTER} className="font-medium text-accent transition hover:text-accent-600">
          Register
        </Link>
      </p>
    </form>
  );
};
