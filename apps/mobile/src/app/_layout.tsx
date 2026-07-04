import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "@/lib/store/auth.store";
import { apiClient } from "@/lib/api/client";

const registerPushToken = async (): Promise<void> => {
  const permissions = await Notifications.getPermissionsAsync();
  const finalPermissions =
    permissions.status === "granted"
      ? permissions
      : await Notifications.requestPermissionsAsync();

  if (finalPermissions.status !== "granted") {
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  if (!tokenData?.data) {
    return;
  }

  try {
    await apiClient.put("/api/users/profile", { fcmToken: tokenData.data });
  } catch {
    // Push token sync is best-effort in mobile shell.
  }
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { initialize, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void registerPushToken();
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }
    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, router, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
