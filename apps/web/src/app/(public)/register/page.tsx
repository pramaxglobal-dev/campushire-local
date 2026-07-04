import { RegisterForm } from "@/components/auth/RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your CampusHire account and unlock role-specific hiring journeys."
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Join CampusHire</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create your account and unlock role-specific hiring workflows.
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
