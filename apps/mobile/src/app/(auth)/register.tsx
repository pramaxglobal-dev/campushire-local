import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { UserRole } from "@campushire/types";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/hooks/useAuth";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name required"),
    lastName: z.string().min(1, "Last name required"),
    email: z.string().email("Valid email required"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password"),
    inviteCode: z.string().optional()
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

type RegisterForm = z.infer<typeof registerSchema>;

const roleOptions: Array<{ role: UserRole; label: string }> = [
  { role: UserRole.STUDENT, label: "Student" },
  { role: UserRole.JOB_SEEKER, label: "Job Seeker" },
  { role: UserRole.CORPORATE_RECRUITER, label: "Corporate Recruiter" },
  { role: UserRole.COLLEGE_ADMIN, label: "College Admin" },
  { role: UserRole.FREELANCE_RECRUITER, label: "Freelance Recruiter" },
  { role: UserRole.VENDOR, label: "Vendor" },
  { role: UserRole.TRAINING_PARTNER, label: "Training Partner" }
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors }, watch, trigger } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      inviteCode: ""
    }
  });

  const isStudent = useMemo(
    () => role === UserRole.STUDENT,
    [role]
  );

  const goNext = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    const valid = await trigger(["firstName", "lastName", "email", "password", "confirmPassword"]);
    if (valid) setStep(3);
  };

  const submit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      await register({
        role,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        inviteCode: isStudent ? values.inviteCode : undefined
      });
      Toast.success("Registration successful. Please verify your email.");
      router.replace("/(auth)/login");
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : "Unable to register.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Join CampusHire</Text>
      <Text style={styles.step}>Step {step} of 3</Text>

      {step === 1 ? (
        <View style={styles.roleGrid}>
          {roleOptions.map((option) => (
            <TouchableOpacity
              key={option.role}
              style={[styles.roleCard, role === option.role ? styles.roleCardActive : null]}
              onPress={() => setRole(option.role)}
            >
              <Text style={[styles.roleLabel, role === option.role ? styles.roleLabelActive : null]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {step >= 2 ? (
        <View style={styles.form}>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { value, onChange } }) => (
              <Input label="First Name" value={value} onChangeText={onChange} error={errors.firstName?.message} />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { value, onChange } }) => (
              <Input label="Last Name" value={value} onChangeText={onChange} error={errors.lastName?.message} />
            )}
          />
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
              <Input label="Password" secureTextEntry value={value} onChangeText={onChange} error={errors.password?.message} />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Confirm Password"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </View>
      ) : null}

      {step === 3 && isStudent ? (
        <Controller
          control={control}
          name="inviteCode"
          render={({ field: { value, onChange } }) => (
            <Input label="College Invite Code" value={value} onChangeText={onChange} error={errors.inviteCode?.message} />
          )}
        />
      ) : null}

      <View style={styles.actions}>
        {step > 1 ? (
          <Button label="Back" variant="outline" onPress={() => setStep((current) => current - 1)} />
        ) : null}
        {step < 3 ? (
          <Button label="Next" onPress={() => void goNext()} />
        ) : (
          <Button
            label={loading ? "Creating..." : "Create Account"}
            loading={loading}
            onPress={() => void submit()}
            disabled={isStudent && !watch("inviteCode")}
          />
        )}
      </View>

      <Link href="/(auth)/login" style={styles.loginLink}>
        Already have an account? Sign in
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary
  },
  step: {
    color: Colors.textSecondary,
    fontSize: 13
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  roleCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  roleCardActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.sky50
  },
  roleLabel: {
    color: Colors.textSecondary,
    fontWeight: "600"
  },
  roleLabelActive: {
    color: Colors.primary
  },
  form: {
    gap: 10
  },
  actions: {
    flexDirection: "row",
    gap: 8
  },
  loginLink: {
    color: Colors.accent,
    textAlign: "center",
    marginTop: 4
  }
});
