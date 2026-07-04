import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "@/constants/colors";
import { useNotifications } from "@/lib/hooks/useNotifications";

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{ color: focused ? Colors.accent : "#FFFFFF", fontSize: 12 }}>{label}</Text>
);

export default function TabsLayout() {
  const { unreadCount } = useNotifications();

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
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Apps" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="interviews"
        options={{
          title: "Interviews",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Calls" focused={focused} />
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
