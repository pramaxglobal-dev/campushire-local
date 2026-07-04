import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your CampusHire account to continue your hiring workflow."
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl overflow-hidden rounded-none md:grid-cols-5 md:rounded-none">
        <section className="order-2 bg-white px-5 py-10 md:order-1 md:col-span-3 md:px-16 md:py-14">
          <div className="mx-auto w-full max-w-xl">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">Sign in to continue your CampusHire journey.</p>
            <div className="mt-8">
              <LoginForm />
            </div>
          </div>
        </section>

        <aside className="order-1 bg-gradient-to-br from-primary to-primary-700 px-6 py-10 text-white md:order-2 md:col-span-2 md:px-10 md:py-14">
          <div className="flex h-full flex-col justify-between">
            <div>
              <img src="/logo.svg" alt="CampusHire" className="h-10 w-10 rounded bg-white p-1" />
              <h2 className="mt-6 text-3xl font-bold tracking-tight">Hiring that feels effortless.</h2>
              <p className="mt-3 text-sm text-slate-100">
                CampusHire brings colleges, students, and recruiters into one secure and intelligent hiring system.
              </p>
            </div>
            <blockquote className="mt-10 rounded-xl border border-white/20 bg-white/10 p-4 text-sm italic text-slate-100">
              "CampusHire helped us reduce screening effort by over 40% while improving offer conversion quality."
              <footer className="mt-3 text-xs font-medium not-italic text-slate-200">Placement Lead, Partner Institute</footer>
            </blockquote>
          </div>
        </aside>
      </div>
    </main>
  );
}
