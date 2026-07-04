import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

interface TabBarProps {
  label: string;
}

export function TabBar({ label }: TabBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    alignItems: "center"
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12
  }
});
