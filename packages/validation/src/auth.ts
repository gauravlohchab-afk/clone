import { z } from 'zod';
import { email, password, username } from './common.js';

export const platform = z.enum(['web', 'ios', 'android']).default('web');

const deviceFields = {
  platform,
  deviceName: z.string().trim().max(80).optional(),
};

export const registerSchema = z.object({
  email,
  password,
  /** Self-declared date of birth for minimum-age enforcement (YYYY-MM-DD). */
  dateOfBirth: z.iso.date('Enter a valid date'),
  acceptTerms: z.literal(true, { error: 'You must accept the Terms and Privacy Policy' }),
  ...deviceFields,
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  /** Email address or username. */
  identifier: z.string().trim().toLowerCase().min(1, 'Required').max(254),
  password: z.string().min(1, 'Required').max(128),
  ...deviceFields,
});
export type LoginInput = z.input<typeof loginSchema>;

export const mfaLoginSchema = z.object({
  mfaToken: z.string().min(1).max(2000),
  code: z.string().trim().min(6).max(20),
  ...deviceFields,
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(10).max(5000),
  dateOfBirth: z.iso.date().optional(),
  ...deviceFields,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(500).optional(),
});

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });
export const resendVerificationSchema = z.object({ email });

export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: password,
});

export const usernameAvailabilitySchema = z.object({ username: z.string().max(60) });
export const setUsernameSchema = z.object({ username });

export const mfaCodeSchema = z.object({ code: z.string().trim().min(6).max(20) });
export const mfaDisableSchema = z.object({
  code: z.string().trim().min(6).max(20),
  password: z.string().max(128).optional(),
});

export const confirmWithPasswordSchema = z.object({
  password: z.string().max(128).optional(),
  code: z.string().trim().max(20).optional(),
});
