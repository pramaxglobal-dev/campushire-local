"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { useAuth } from "@/lib/hooks/useAuth";
import { NotificationBell } from "@/components/common/NotificationBell";
import { useTenant } from "@/lib/hooks/useTenant";

export const Header = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { tenant } = useTenant();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src={tenant?.logoUrl ?? "/logo.svg"} alt="Brand" className="h-8 w-8 rounded-md" />
          <span className="hidden text-sm font-bold text-slate-900 sm:block">
            {tenant?.brandName ?? "CampusHire"}
          </span>
        </Link>

        <div className="hidden flex-1 md:block">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input aria-label="Search jobs, companies" className="pl-9" />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
              {user?.firstName?.slice(0, 1)}{user?.lastName?.slice(0, 1)}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>
      <div className="px-4 pb-2 text-xs text-slate-500 md:hidden">{pathname}</div>
    </header>
  );
};
