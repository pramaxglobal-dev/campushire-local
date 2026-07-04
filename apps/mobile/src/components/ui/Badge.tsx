import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: "#E2E8F0", text: Colors.textSecondary },
  success: { bg: "#DCFCE7", text: "#166534" },
  warning: { bg: "#FEF3C7", text: "#92400E" },
  danger: { bg: "#FEE2E2", text: "#991B1B" },
  info: { bg: "#E0F2FE", text: "#075985" }
};

export function Badge({ label, variant = "default" }: BadgeProps) {
  const variantStyle = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: variantStyle.bg }]}>
      <Text style={[styles.label, { color: variantStyle.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  label: {
    fontSize: 12,
    fontWeight: "600"
  }
});
