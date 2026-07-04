import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Colors } from "@/constants/colors";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          focused ? styles.focused : null,
          error ? styles.errorInput : null,
          style
        ]}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: "#FFFFFF"
  },
  focused: {
    borderColor: Colors.accent
  },
  errorInput: {
    borderColor: Colors.danger
  },
  error: {
    color: Colors.danger,
    fontSize: 12
  }
});
