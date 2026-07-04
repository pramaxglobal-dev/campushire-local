"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { UserRole } from "@campushire/types";
import { useAuthStore } from "@/lib/store/auth.store";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { getDashboardPathForRole, needsApproval, ROUTES } from "@/lib/utils/routes";

interface AuthProviderProps {
  children: ReactNode;
}

interface ProtectedRouteProps {
  children: ReactNode;
}

const isSuspendedAccount = (
  isActive: boolean,
  explicitSuspended: boolean | undefined,
  metadata: unknown
): boolean => {
  if (!isActive) return true;
  if (explicitSuspended === true) return true;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).isSuspended === true;
};

const withRedirectPath = (target: string, fromPath: string): string => {
  if (!fromPath || fromPath === target) {
    return target;
  }

  const param = encodeURIComponent(fromPath);
  return `${target}?from=${param}`;
};

const approvalRoles: UserRole[] = [
  UserRole.CORPORATE_RECRUITER,
  UserRole.COLLEGE_ADMIN,
  UserRole.FREELANCE_RECRUITER,
  UserRole.VENDOR,
  UserRole.TRAINING_PARTNER
];

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const initialize = useAuthStore((state) => state.initialize);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void initialize();
  }, [initialize]);

  return <>{children}</>;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace(withRedirectPath(ROUTES.LOGIN, pathname));
      return;
    }

    const suspended = isSuspendedAccount(user.isActive, user.isSuspended, user.metadata);
    if (suspended && pathname !== ROUTES.SUSPENDED) {
      router.replace(ROUTES.SUSPENDED);
      return;
    }

    const roleNeedsApproval = approvalRoles.includes(user.role as UserRole) || needsApproval(user.role as UserRole);
    if (roleNeedsApproval && !user.isApproved && pathname !== ROUTES.PENDING) {
      router.replace(ROUTES.PENDING);
      return;
    }

    if (pathname === ROUTES.DASHBOARD_ROOT) {
      router.replace(getDashboardPathForRole(user.role as UserRole));
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="profile" count={1} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
};
