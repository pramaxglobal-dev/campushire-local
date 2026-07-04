import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

interface AvatarProps {
  name: string;
  size?: number;
}

const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() ?? "U";
  }
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
};

export function Avatar({ name, size = 40 }: AvatarProps) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.initials}>{initialsFromName(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navy50
  },
  initials: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 14
  }
});
