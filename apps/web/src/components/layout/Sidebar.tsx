"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Clock3,
  FileText,
  Folder,
  KeyRound,
  Kanban,
  Link2,
  MessageCircle,
  PlusCircle,
  Settings,
  ToggleLeft,
  User,
  Users
} from "lucide-react";
import type { ComponentType } from "react";
import { Badge, Button } from "@/components/ui";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUIStore } from "@/lib/store/ui.store";
import type { UserRole } from "@campushire/types";
import { ROUTES } from "@/lib/utils/routes";

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
}

const navByRole: Record<UserRole, NavItem[]> = {
  STUDENT: [
    { label: "Dashboard", href: ROUTES.dashboard.student, icon: Briefcase },
    { label: "Job Feed", href: ROUTES.jobs.list, icon: Briefcase },
    { label: "My Applications", href: ROUTES.applications.list, icon: FileText },
    { label: "Saved Jobs", href: ROUTES.savedJobs, icon: Bookmark },
    { label: "My Profile", href: ROUTES.profile, icon: User },
    { label: "Documents", href: ROUTES.documents, icon: Folder },
    { label: "Courses", href: ROUTES.courses.list, icon: BookOpen },
    { label: "Chat", href: ROUTES.chat, icon: MessageCircle },
    { label: "Events", href: ROUTES.events.list, icon: Calendar },
    { label: "Notifications", href: ROUTES.notifications, icon: Bell }
  ],
  JOB_SEEKER: [
    { label: "Dashboard", href: ROUTES.dashboard.student, icon: Briefcase },
    { label: "Job Feed", href: ROUTES.jobs.list, icon: Briefcase },
    { label: "My Applications", href: ROUTES.applications.list, icon: FileText },
    { label: "Saved Jobs", href: ROUTES.savedJobs, icon: Bookmark },
    { label: "My Profile", href: ROUTES.profile, icon: User },
    { label: "Documents", href: ROUTES.documents, icon: Folder },
    { label: "Courses", href: ROUTES.courses.list, icon: BookOpen },
    { label: "Chat", href: ROUTES.chat, icon: MessageCircle },
    { label: "Events", href: ROUTES.events.list, icon: Calendar },
    { label: "Notifications", href: ROUTES.notifications, icon: Bell }
  ],
  CORPORATE_RECRUITER: [
    { label: "Dashboard", href: ROUTES.dashboard.recruiter, icon: Briefcase },
    { label: "Post a Job", href: ROUTES.jobs.new, icon: PlusCircle },
    { label: "My Jobs", href: ROUTES.jobs.list, icon: Briefcase },
    { label: "ATS Pipeline", href: ROUTES.ats.root, icon: Kanban },
    { label: "Candidates", href: ROUTES.ats.root, icon: Users },
    { label: "Chat", href: ROUTES.chat, icon: MessageCircle },
    { label: "Connections", href: ROUTES.connections, icon: Link2 },
    { label: "Branding", href: ROUTES.whitelabel, icon: Building2 },
    { label: "Analytics", href: ROUTES.dashboard.recruiter, icon: BarChart3 },
    { label: "Settings", href: ROUTES.settings, icon: Settings }
  ],
  COLLEGE_ADMIN: [
    { label: "Dashboard", href: ROUTES.dashboard.college, icon: Building2 },
    { label: "Students", href: ROUTES.dashboard.college, icon: Users },
    { label: "Recruiters", href: ROUTES.dashboard.college, icon: Building2 },
    { label: "Invite Codes", href: ROUTES.dashboard.college, icon: KeyRound },
    { label: "Connections", href: ROUTES.connections, icon: Link2 },
    { label: "Documents", href: ROUTES.documents, icon: Folder },
    { label: "Events", href: ROUTES.events.list, icon: Calendar },
    { label: "Branding", href: ROUTES.whitelabel, icon: Building2 },
    { label: "Analytics", href: ROUTES.dashboard.college, icon: BarChart3 },
    { label: "Settings", href: ROUTES.settings, icon: Settings }
  ],
  SUPER_ADMIN: [
    { label: "Dashboard", href: `${ROUTES.dashboard.admin}?section=overview`, icon: BarChart3 },
    { label: "All Users", href: `${ROUTES.dashboard.admin}?section=users`, icon: Users },
    { label: "Pending Approvals", href: `${ROUTES.dashboard.admin}?section=pending-approvals`, icon: Clock3 },
    { label: "Tenants", href: `${ROUTES.dashboard.admin}/management#tenants`, icon: Building2 },
    { label: "Jobs", href: `${ROUTES.dashboard.admin}/management#jobs`, icon: Briefcase },
    { label: "White Label", href: ROUTES.whitelabel, icon: Building2 },
    { label: "Platform Settings", href: `${ROUTES.dashboard.admin}/management#platform-settings`, icon: Settings },
    { label: "Broadcast", href: `${ROUTES.dashboard.admin}/management#broadcast`, icon: MessageCircle },
    { label: "Audit Logs", href: `${ROUTES.dashboard.admin}/management#audit-logs`, icon: FileText },
    { label: "Feature Flags", href: `${ROUTES.dashboard.admin}?section=feature-flags`, icon: ToggleLeft },
    { label: "Analytics", href: `${ROUTES.dashboard.admin}?section=analytics`, icon: BarChart3 }
  ],
  FREELANCE_RECRUITER: [
    { label: "Dashboard", href: ROUTES.dashboard.freelance, icon: Briefcase },
    { label: "Candidates", href: ROUTES.dashboard.freelance, icon: Users },
    { label: "Referrals", href: ROUTES.dashboard.freelance, icon: Link2 },
    { label: "Chat", href: ROUTES.chat, icon: MessageCircle },
    { label: "Settings", href: ROUTES.settings, icon: Settings }
  ],
  VENDOR: [
    { label: "Dashboard", href: ROUTES.dashboard.vendor, icon: Briefcase },
    { label: "Requests", href: ROUTES.dashboard.vendor, icon: FileText },
    { label: "Marketplace", href: ROUTES.vendors, icon: Building2 },
    { label: "Chat", href: ROUTES.chat, icon: MessageCircle },
    { label: "Settings", href: ROUTES.settings, icon: Settings }
  ],
  TRAINING_PARTNER: [
    { label: "Dashboard", href: ROUTES.dashboard.training, icon: Briefcase },
    { label: "My Courses", href: ROUTES.dashboard.training, icon: Folder },
    { label: "Course Catalog", href: ROUTES.courses.list, icon: BookOpen },
    { label: "Chat", href: ROUTES.chat, icon: MessageCircle },
    { label: "Settings", href: ROUTES.settings, icon: Settings }
  ]
};

export const Sidebar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleCollapse = useUIStore((state) => state.collapseSidebar);

  if (!user) return null;

  const navItems = navByRole[user.role] ?? [];

  return (
    <aside
      className={`hidden md:flex h-screen shrink-0 flex-col bg-primary text-white transition-all duration-150 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="CampusHire" className="h-8 w-8 rounded-md bg-white p-1" />
          {!collapsed ? <span className="text-lg font-bold">CampusHire</span> : null}
        </div>
        <Button variant="ghost" size="sm" onClick={toggleCollapse} className="text-white hover:bg-primary-700">
          {collapsed ? ">" : "<"}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-4">
        {navItems.map((item) => {
          const [itemPath, itemQuery] = item.href.split("?");
          const sectionFromHref = itemQuery?.startsWith("section=") ? itemQuery.slice("section=".length) : null;
          const currentSection = searchParams.get("section");
          const isSectionRoute = sectionFromHref !== null;
          const isActive = isSectionRoute
            ? pathname === itemPath &&
              (currentSection === sectionFromHref || (sectionFromHref === "overview" && currentSection === null))
            : pathname === itemPath || pathname.startsWith(`${itemPath}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                isActive ? "bg-accent text-white shadow-nav" : "text-slate-100 hover:bg-primary-700"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4" />
              {!collapsed ? <span className="ml-3 flex-1">{item.label}</span> : null}
              {!collapsed && item.badge ? <Badge variant="warning">{item.badge}</Badge> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-primary-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-semibold text-white">
            {user.firstName.slice(0, 1)}
            {user.lastName.slice(0, 1)}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
              <p className="truncate text-xs text-slate-200">{user.role}</p>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <Button className="mt-3 w-full bg-white text-primary hover:bg-slate-100" onClick={logout}>
            Logout
          </Button>
        ) : null}
      </div>
    </aside>
  );
};
