import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary
  }
});
