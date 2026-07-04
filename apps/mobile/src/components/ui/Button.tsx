import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { Colors } from "@/constants/colors";

type Variant = "primary" | "secondary" | "outline";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const styleForVariant =
    variant === "secondary"
      ? styles.secondary
      : variant === "outline"
        ? styles.outline
        : styles.primary;
  const textForVariant =
    variant === "outline"
      ? styles.outlineLabel
      : variant === "secondary"
        ? styles.secondaryLabel
        : styles.primaryLabel;

  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.base, styleForVariant, isDisabled ? styles.disabled : null]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? Colors.primary : "#FFFFFF"} />
      ) : (
        <Text style={[styles.label, textForVariant]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  primary: {
    backgroundColor: Colors.primary
  },
  secondary: {
    backgroundColor: Colors.accent
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: "#FFFFFF"
  },
  disabled: {
    opacity: 0.6
  },
  label: {
    fontSize: 15,
    fontWeight: "600"
  },
  primaryLabel: {
    color: "#FFFFFF"
  },
  secondaryLabel: {
    color: "#FFFFFF"
  },
  outlineLabel: {
    color: Colors.primary
  }
});
