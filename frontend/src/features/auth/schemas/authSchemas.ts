import { z } from 'zod';

// ── Login schema ─────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
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
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Name contains invalid characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[0-9]/, 'Must include at least one number'),
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
