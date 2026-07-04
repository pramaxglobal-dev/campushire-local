import Link from "next/link";
import type { Metadata } from "next";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  GraduationCap,
  Handshake,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow
} from "lucide-react";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Campus Hiring Platform",
  description:
    "Explore CampusHire, the intelligent ecosystem for students, colleges, and recruiters to scale campus hiring."
};

const roleCards = [
  {
    icon: GraduationCap,
    title: "Student",
    points: ["Get matched with relevant roles", "Track applications in one place", "Receive interview alerts instantly"]
  },
  {
    icon: Building2,
    title: "College Admin",
    points: ["Manage invite-based onboarding", "Monitor placement performance", "Run placement drives with ease"]
  },
  {
    icon: Briefcase,
    title: "Corporate Recruiter",
    points: ["Source from trusted talent pools", "Use ATS with fast collaboration", "Close roles with structured workflows"]
  },
  {
    icon: Handshake,
    title: "Freelance Recruiter",
    points: ["Track referral pipelines", "Manage commissions transparently", "Coordinate with multiple recruiters"]
  },
  {
    icon: ShieldCheck,
    title: "Vendor",
    points: ["Handle verification requests", "Deliver SLA-backed services", "Operate with secure data controls"]
  },
  {
    icon: Network,
    title: "Training Partner",
    points: ["Launch demand-aligned courses", "Monitor learner outcomes", "Connect training to placements"]
  }
];

const featureCards = [
  {
    icon: Sparkles,
    title: "Smart Job Matching",
    copy: "AI-guided matching that maps candidate strengths to the right roles quickly."
  },
  {
    icon: Workflow,
    title: "ATS Pipeline",
    copy: "Stage-wise hiring workflow with real-time updates, notes, and collaboration."
  },
  {
    icon: CheckCircle2,
    title: "WhatsApp Notifications",
    copy: "Keep stakeholders informed with timely updates across interview and offer milestones."
  },
  {
    icon: Building2,
    title: "White Label",
    copy: "Tenant-level theming and domain flexibility to present your hiring brand with confidence."
  },
  {
    icon: Handshake,
    title: "Freelance Referrals",
    copy: "Structured referral tracking, commission triggers, and transparent payout visibility."
  },
  {
    icon: ShieldCheck,
    title: "Document Vault",
    copy: "Secure candidate documents with verification status, lifecycle tracking, and access control."
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-700 to-accent py-20 text-white">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.12em]">
              Talentor Edge Private Limited
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              The Future of Hiring, Today
            </h1>
            <p className="mt-5 text-base text-slate-100 md:text-lg">
              India&apos;s most intelligent campus hiring ecosystem. Connect colleges, students, and
              recruiters on one powerful platform.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button className="h-11 bg-accent px-6 text-white hover:bg-accent-600">Get Started Free</Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="h-11 border-white/60 bg-transparent px-6 text-white hover:bg-white/10">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur md:grid-cols-4">
            {[
              "10M+ Talent Pool",
              "500+ Colleges",
              "10K+ Companies",
              "95% Placement Rate"
            ].map((stat) => (
              <div key={stat} className="rounded-lg bg-white/10 px-3 py-4 text-center">
                <p className="text-sm font-semibold tracking-wide">{stat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Built for Every Hiring Stakeholder</h2>
          <p className="mt-2 text-slate-600">One ecosystem, role-specific workflows, shared outcomes.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="rounded-xl border border-slate-100 transition duration-150 hover:-translate-y-1 hover:border-accent/50 hover:shadow-card-hover">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-accent-50 p-2 text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {card.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-4 inline-block text-sm font-semibold text-accent hover:text-accent-600">
                    Get Started
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">How It Works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", title: "Register & Verify", copy: "Create your account and verify email to activate secure access." },
              { n: "2", title: "Complete Profile", copy: "Share skills, preferences, and organization details for better matching." },
              { n: "3", title: "Get Hired", copy: "Apply, collaborate, interview, and close outcomes with complete visibility." }
            ].map((step) => (
              <div key={step.n} className="relative rounded-xl border border-slate-100 bg-slate-50 p-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {step.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Platform Features</h2>
          <p className="mt-2 text-slate-600">Designed for scale, reliability, and speed across hiring journeys.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="rounded-xl border border-slate-100">
                <CardContent className="p-6">
                  <span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.copy}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="CampusHire" className="h-9 w-9" />
              <p className="text-lg font-bold text-slate-900">CampusHire</p>
            </div>
            <p className="mt-3 max-w-sm text-sm text-slate-600">
              Unified hiring platform connecting campuses, candidates, and recruiters.
            </p>
            <p className="mt-4 text-xs text-slate-500">Powered by Talentor Edge Private Limited</p>
          </div>

          <div className="grid grid-cols-3 gap-8 text-sm">
            <div>
              <p className="font-semibold text-slate-900">Product</p>
              <ul className="mt-2 space-y-2 text-slate-600">
                <li><Link href="/register">Get Started</Link></li>
                <li><Link href="/login">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Company</p>
              <ul className="mt-2 space-y-2 text-slate-600">
                <li><a href="mailto:support@campushire.in">Support</a></li>
                <li><a href="mailto:hello@campushire.in">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Legal</p>
              <ul className="mt-2 space-y-2 text-slate-600">
                <li><span>Privacy</span></li>
                <li><span>Terms</span></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
