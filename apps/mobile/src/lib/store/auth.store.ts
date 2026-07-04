import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { getMe, type FullUserProfile } from "@/lib/api/auth.api";

const ACCESS_TOKEN_KEY = "campushire_access_token";
const REFRESH_TOKEN_KEY = "campushire_refresh_token";

interface AuthState {
  user: FullUserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: FullUserProfile | null) => void;
  clearSession: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  setTokens: async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    set({
      accessToken,
      refreshToken,
      isAuthenticated: true
    });
  },
  setUser: (user: FullUserProfile | null) => {
    set({ user, isAuthenticated: Boolean(user) });
  },
  clearSession: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false
    });
  },
  initialize: async () => {
    set({ isLoading: true });
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!accessToken || !refreshToken) {
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      return;
    }

    set({
      accessToken,
      refreshToken,
      isAuthenticated: true
    });

    try {
      const user = await getMe();
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch {
      await get().clearSession();
    }
  }
}));
