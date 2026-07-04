import { z } from "zod";

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]{8,}$/;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required")
});

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(10).max(20).optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(passwordRegex, "Use uppercase, lowercase, number, and symbol"),
    confirmPassword: z.string(),
    inviteCode: z.string().optional(),
    organizationName: z.string().optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email")
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(passwordRegex, "Use uppercase, lowercase, number, and symbol"),
    confirmPassword: z.string()
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const emailSchema = z.object({
  email: z.string().email("Enter a valid email")
});

export const getPasswordStrength = (value: string): "weak" | "fair" | "good" | "strong" => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z\d]/.test(value)) score += 1;

  if (score <= 2) return "weak";
  if (score === 3) return "fair";
  if (score === 4) return "good";
  return "strong";
};