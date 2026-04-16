import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,63}(?:\.[^\s@]{1,63})+$/;
const NAME_PATTERN = /^[a-zA-ZÀ-ÿ' -]{1,100}$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const NUMBER_PATTERN = /\d/;

// ── Login schema ─────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((value) => EMAIL_PATTERN.test(value), 'Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  // Plain boolean — input equals output, no resolver type mismatch.
  // Default (false) is set in the form's defaultValues instead.
  rememberMe: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ── Register schema ──────────────────────────────────────────

export const registerSchema = z
  .object({
    first_name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be less than 50 characters')
      .refine((value) => NAME_PATTERN.test(value), 'Name contains invalid characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .refine((value) => EMAIL_PATTERN.test(value), 'Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((value) => UPPERCASE_PATTERN.test(value), 'Must include at least one uppercase letter')
      .refine((value) => NUMBER_PATTERN.test(value), 'Must include at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    // react-hook-form's setValueAs converts the empty string to undefined before
    // Zod sees the value, so z.number().optional() is sufficient here.
    age: z
      .number()
      .int()
      .min(6, 'Minimum age is 6')
      .max(120, 'Enter a valid age')
      .optional(),
    gender: z.enum(['M', 'F', 'OTHER']).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
