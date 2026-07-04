import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/hooks/useAuth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type LoginFormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      await login(values);
      Toast.success("Welcome back.");
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>CampusHire</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange } }) => (
            <Input
              label="Password"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Button label="Sign In" onPress={() => void onSubmit()} loading={loading} />
        <Link href="/(auth)/register" style={styles.link}>
          New to CampusHire? Register
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 70,
    gap: 24
  },
  header: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 20
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800"
  },
  subtitle: {
    color: "#E2E8F0",
    marginTop: 4,
    fontSize: 14
  },
  form: {
    gap: 12
  },
  link: {
    color: Colors.accent,
    textAlign: "center",
    marginTop: 6
  }
});
