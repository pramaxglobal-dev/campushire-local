import { create } from "zustand";
import type { UserRole } from "@campushire/types";
import { getMe } from "@/lib/api/auth.api";
import type { FullUserProfile } from "@/lib/utils/profile-types";

const ACCESS_KEY = "campushire_access_token";
const REFRESH_KEY = "campushire_refresh_token";

const setCookie = (key: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7): void => {
  if (typeof document === "undefined") return;
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
};

const removeCookie = (key: string): void => {
  if (typeof document === "undefined") return;
  document.cookie = `${key}=; path=/; max-age=0; samesite=lax`;
};

const getSuspendedState = (user: FullUserProfile): boolean => {
  if (!user.isActive) return true;
  if (!user.metadata || typeof user.metadata !== "object") return false;
  if (Array.isArray(user.metadata)) return false;
  return (user.metadata as Record<string, unknown>).isSuspended === true;
};

const persistUserStatusCookies = (user: FullUserProfile): void => {
  const suspended = getSuspendedState(user);
  setCookie("campushire_user_role", user.role as string);
  setCookie("campushire_user_approved", user.isApproved ? "1" : "0");
  setCookie("campushire_user_suspended", suspended ? "1" : "0");
};

const readStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
};

const writeStorage = (key: string, value: string | null, persistent = true): void => {
  if (typeof window === "undefined") return;
  const selected = persistent ? window.localStorage : window.sessionStorage;
  const other = persistent ? window.sessionStorage : window.localStorage;
  other.removeItem(key);
  if (value === null) {
    selected.removeItem(key);
    return;
  }
  selected.setItem(key, value);
};

export interface AuthState {
  user: FullUserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string, persistent?: boolean) => void;
  setUser: (user: FullUserProfile) => void;
  clearSession: () => void;
  logout: () => void;
  initialize: () => Promise<void>;
  getRole: () => UserRole | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: readStorage(ACCESS_KEY),
  refreshToken: readStorage(REFRESH_KEY),
  isAuthenticated: Boolean(readStorage(ACCESS_KEY)),
  isLoading: false,
  setTokens: (accessToken: string, refreshToken: string, persistent = true) => {
    writeStorage(ACCESS_KEY, accessToken, persistent);
    writeStorage(REFRESH_KEY, refreshToken, persistent);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },
  setUser: (user: FullUserProfile) => {
    persistUserStatusCookies(user);
    set({ user, isAuthenticated: true });
  },
  clearSession: () => {
    writeStorage(ACCESS_KEY, null);
    writeStorage(REFRESH_KEY, null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ACCESS_KEY);
      window.sessionStorage.removeItem(REFRESH_KEY);
    }
    removeCookie("campushire_user_role");
    removeCookie("campushire_user_approved");
    removeCookie("campushire_user_suspended");
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },
  logout: () => {
    get().clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
  initialize: async () => {
    const token = get().accessToken ?? readStorage(ACCESS_KEY);
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });

    try {
      const user = await getMe();
      const suspended = getSuspendedState(user);
      get().setUser({ ...user, isSuspended: suspended });
      set({ isAuthenticated: true, isLoading: false });
    } catch {
      get().clearSession();
      set({ isLoading: false });
    }
  },
  getRole: () => get().user?.role ?? null
}));
