"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@campushire/types";
import {
  getMe,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  type LoginDto,
  type RegisterDto
} from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { getDashboardPathForRole, needsApproval, ROUTES } from "@/lib/utils/routes";
import { connectSocket, disconnectSocket } from "@/lib/socket";

const getSuspendedFlag = (metadata: Record<string, unknown> | null, isActive: boolean): boolean => {
  if (!isActive) return true;
  if (!metadata) return false;
  return metadata.isSuspended === true;
};

export const useAuth = () => {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    refreshToken,
    setTokens,
    setUser,
    clearSession
  } = useAuthStore();

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }

    connectSocket(accessToken);
  }, [accessToken]);

  const login = useCallback(
    async (dto: LoginDto) => {
      const result = await loginApi(dto);
      setTokens(result.accessToken, result.refreshToken);
      connectSocket(result.accessToken);
      let profile: Awaited<ReturnType<typeof getMe>>;
      try {
        profile = await getMe();
      } catch (profileError) {
        disconnectSocket();
        clearSession();
        throw profileError;
      }
      const suspended = getSuspendedFlag(
        (profile.metadata as Record<string, unknown> | null) ?? null,
        profile.isActive
      );

      setUser({ ...profile, isSuspended: suspended });

      if (suspended) {
        router.replace(ROUTES.SUSPENDED);
        return result;
      }

      if (needsApproval(profile.role) && !profile.isApproved) {
        router.replace(ROUTES.PENDING);
        return result;
      }

      router.replace(getDashboardPathForRole(profile.role));
      return result;
    },
    [clearSession, router, setTokens, setUser]
  );

  const register = useCallback(
    async (dto: RegisterDto) => {
      const result = await registerApi(dto);
      router.replace(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(dto.email)}`);
      return result;
    },
    [router]
  );

  const logout = useCallback(async () => {
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // Ignore logout transport errors and clear local session anyway.
      }
    }

    disconnectSocket();
    clearSession();
    router.replace(ROUTES.LOGIN);
  }, [clearSession, refreshToken, router]);

  const redirectForCurrentUser = useCallback(() => {
    if (!user) return;

    if (user.isSuspended) {
      router.replace(ROUTES.SUSPENDED);
      return;
    }

    if (needsApproval(user.role as UserRole) && !user.isApproved) {
      router.replace(ROUTES.PENDING);
      return;
    }

    router.replace(getDashboardPathForRole(user.role as UserRole));
  }, [router, user]);

  return {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    refreshToken,
    login,
    logout,
    register,
    redirectForCurrentUser
  };
};
