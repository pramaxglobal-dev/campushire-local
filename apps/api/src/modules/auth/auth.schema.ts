import { z } from "zod";
import { UserRole } from "@campushire/types";

const passwordRule =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]{8,}$/;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      passwordRule,
      "Password must include uppercase, lowercase, number, and special character."
    ),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  role: z.nativeEnum(UserRole),
  inviteCode: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(10).max(20).optional()
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1)
});

export const VerifyEmailSchema = z.object({
  token: z.string().trim().min(1)
});

export const ResendVerificationSchema = z.object({
  email: z.string().email()
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email()
});

export const ResetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(
      passwordRule,
      "Password must include uppercase, lowercase, number, and special character."
    )
});

export const OAuthCallbackStateSchema = z.object({
  role: z.nativeEnum(UserRole),
  inviteCode: z.string().trim().min(1).optional()
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type OAuthCallbackStateDto = z.infer<typeof OAuthCallbackStateSchema>;
