import { useCallback } from "react";
import { useRouter } from "expo-router";
import { UserRole } from "@campushire/types";
import { login as loginApi, logout as logoutApi, register as registerApi, type MobileLoginDto, type MobileRegisterDto } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { Routes } from "@/constants/routes";

export const useAuth = () => {
  const router = useRouter();
  const store = useAuthStore();

  const login = useCallback(
    async (dto: MobileLoginDto) => {
      const data = await loginApi(dto);
      await store.setTokens(data.accessToken, data.refreshToken);
      store.setUser(data.user);
      router.replace(Routes.tabs);
    },
    [router, store]
  );

  const register = useCallback(async (dto: MobileRegisterDto) => {
    const data = await registerApi(dto);
    return data;
  }, []);

  const logout = useCallback(async () => {
    if (store.refreshToken) {
      try {
        await logoutApi(store.refreshToken);
      } catch {
        // Ignore logout API failures during client-side session clear.
      }
    }
    await store.clearSession();
    router.replace(Routes.login);
  }, [router, store]);

  const defaultRole = useCallback((role: UserRole): UserRole => role, []);

  return {
    user: store.user,
    accessToken: store.accessToken,
    refreshToken: store.refreshToken,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    initialize: store.initialize,
    login,
    register,
    logout,
    defaultRole
  };
};
