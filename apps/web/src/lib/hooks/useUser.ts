"use client";

import { useCallback } from "react";
import { getProfile } from "@/lib/api/users.api";
import { useAuthStore } from "@/lib/store/auth.store";

export const useUser = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const refresh = useCallback(async () => {
    const profile = await getProfile();
    const suspended =
      !profile.isActive ||
      (profile.metadata &&
        typeof profile.metadata === "object" &&
        !Array.isArray(profile.metadata) &&
        (profile.metadata as Record<string, unknown>).isSuspended === true);
    setUser({ ...profile, isSuspended: Boolean(suspended) });
    return profile;
  }, [setUser]);

  return {
    user,
    refresh
  };
};
