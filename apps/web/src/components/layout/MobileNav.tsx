"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Folder,
  MessageCircle,
  PlusCircle,
  Settings,
  User,
  Users
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { UserRole } from "@campushire/types";
import { ROUTES } from "@/lib/utils/routes";

const navByRole: Record<UserRole, Array<{ href: string; label: string; icon: ComponentType<{ className?: string }> }>> = {
  STUDENT: [
    { href: ROUTES.dashboard.student, label: "Home", icon: Briefcase },
    { href: ROUTES.jobs.list, label: "Jobs", icon: Briefcase },
    { href: ROUTES.documents, label: "Docs", icon: Folder },
    { href: ROUTES.courses.list, label: "Courses", icon: BookOpen },
    { href: ROUTES.chat, label: "Chat", icon: MessageCircle }
  ],
  JOB_SEEKER: [
    { href: ROUTES.dashboard.student, label: "Home", icon: Briefcase },
    { href: ROUTES.jobs.list, label: "Jobs", icon: Briefcase },
    { href: ROUTES.documents, label: "Docs", icon: Folder },
    { href: ROUTES.courses.list, label: "Courses", icon: BookOpen },
    { href: ROUTES.chat, label: "Chat", icon: MessageCircle }
  ],
  CORPORATE_RECRUITER: [
    { href: ROUTES.dashboard.recruiter, label: "Home", icon: Briefcase },
    { href: ROUTES.jobs.new, label: "Post", icon: PlusCircle },
    { href: ROUTES.ats.root, label: "ATS", icon: Users },
    { href: ROUTES.connections, label: "Connect", icon: Building2 },
    { href: ROUTES.chat, label: "Chat", icon: MessageCircle }
  ],
  COLLEGE_ADMIN: [
    { href: ROUTES.dashboard.college, label: "Home", icon: Building2 },
    { href: ROUTES.dashboard.college, label: "Students", icon: Users },
    { href: ROUTES.connections, label: "Connect", icon: Building2 },
    { href: ROUTES.documents, label: "Docs", icon: Folder },
    { href: ROUTES.events.list, label: "Events", icon: Calendar },
    { href: ROUTES.chat, label: "Chat", icon: MessageCircle },
    { href: ROUTES.whitelabel, label: "Brand", icon: Settings },
    { href: ROUTES.settings, label: "Settings", icon: Settings }
  ].slice(0, 5),
  SUPER_ADMIN: [
    { href: ROUTES.dashboard.admin, label: "Home", icon: Users },
    { href: ROUTES.dashboard.admin, label: "Users", icon: Users },
    { href: ROUTES.whitelabel, label: "Brand", icon: Building2 },
    { href: ROUTES.dashboard.admin, label: "Stats", icon: BarChart3 },
    { href: ROUTES.settings, label: "Settings", icon: Settings }
  ],
  FREELANCE_RECRUITER: [
    { href: ROUTES.dashboard.freelance, label: "Home", icon: Briefcase },
    { href: ROUTES.jobs.list, label: "Jobs", icon: Briefcase },
    { href: ROUTES.dashboard.freelance, label: "Referrals", icon: FileText },
    { href: ROUTES.chat, label: "Chat", icon: MessageCircle },
    { href: ROUTES.settings, label: "Settings", icon: Settings }
  ],
  VENDOR: [
    { href: ROUTES.dashboard.vendor, label: "Home", icon: Briefcase },
    { href: ROUTES.dashboard.vendor, label: "Requests", icon: FileText },
    { href: ROUTES.vendors, label: "Vendors", icon: Building2 },
    { href: ROUTES.chat, label: "Chat", icon: MessageCircle },
    { href: ROUTES.profile, label: "Profile", icon: User }
  ],
  TRAINING_PARTNER: [
    { href: ROUTES.dashboard.training, label: "Home", icon: Briefcase },
    { href: ROUTES.dashboard.training, label: "My Courses", icon: Folder },
    { href: ROUTES.courses.list, label: "Catalog", icon: BookOpen },
    { href: ROUTES.chat, label: "Chat", icon: MessageCircle },
    { href: ROUTES.settings, label: "Settings", icon: Settings }
  ]
};

export const MobileNav = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;
  const items = navByRole[user.role] ?? navByRole.STUDENT;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 text-[11px] ${
                active ? "text-accent" : "text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
