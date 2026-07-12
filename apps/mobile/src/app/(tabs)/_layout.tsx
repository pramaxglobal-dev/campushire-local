import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "@/constants/colors";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { UserRole } from "@campushire/types";
import { useAuthStore } from "@/lib/store/auth.store";

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{ color: focused ? Colors.accent : "#FFFFFF", fontSize: 12 }}>{label}</Text>
);

export default function TabsLayout() {
  const { unreadCount } = useNotifications();
  const role = useAuthStore((state) => state.user?.role);
  const isCandidate = role === UserRole.STUDENT || role === UserRole.JOB_SEEKER;
  const usesInterviews = isCandidate || role === UserRole.CORPORATE_RECRUITER;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.primary, borderTopWidth: 0 },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: "#FFFFFF"
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Home" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: "Applications",
          href: isCandidate ? undefined : null,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Apps" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="interviews"
        options={{
          title: "Interviews",
          href: usesInterviews ? undefined : null,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Calls" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="role"
        options={{
          title: role === UserRole.SUPER_ADMIN ? "Manage" : "Workspace",
          href: isCandidate ? null : undefined,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Work" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Bell" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Me" focused={focused} />
          )
        }}
      />
    </Tabs>
  );
}
