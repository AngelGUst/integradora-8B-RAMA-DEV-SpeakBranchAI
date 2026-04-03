import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '../schemas/authSchemas';
import Button from '@/shared/components/ui/Button';
import Input from '@/shared/components/ui/Input';

// ── Password strength helper ─────────────────────────────────

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score === 3) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score === 4) return { score, label: 'Good', color: 'bg-teal-500' };
  return { score, label: 'Strong', color: 'bg-violet-500' };
}

// ── Props ────────────────────────────────────────────────────

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  serverError?: string | null;
  serverSuccess?: string | null;
}

// ── Component ────────────────────────────────────────────────

export default function RegisterForm({ onSubmit, serverError, serverSuccess }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password') ?? '';
  const strength = getPasswordStrength(passwordValue);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Server success banner */}
      {serverSuccess && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3"
        >
          <p className="text-sm text-emerald-200">{serverSuccess}</p>
        </div>
      )}

      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
          <p className="text-sm text-red-300">{serverError}</p>
        </div>
      )}

      {/* Full name */}
      <Input
        label="Full name"
        type="text"
        placeholder="Jane Smith"
        autoComplete="name"
        required
        leadingIcon={<User className="h-4 w-4" />}
        error={errors.first_name?.message}
        {...register('first_name')}
      />

      {/* Email */}
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        leadingIcon={<Mail className="h-4 w-4" />}
        error={errors.email?.message}
        {...register('email')}
      />

      {/* Password + strength meter */}
      <div className="space-y-2">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          required
          leadingIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          trailingIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('password')}
        />

        {/* Strength meter */}
        {passwordValue && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className={[
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    bar <= strength.score ? strength.color : 'bg-white/[0.08]',
                  ].join(' ')}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Strength:{' '}
              <span
                className={
                  strength.score <= 2
                    ? 'text-red-400'
                    : strength.score === 3
                      ? 'text-amber-400'
                      : 'text-violet-400'
                }
              >
                {strength.label}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <Input
        label="Confirm password"
        type={showConfirm ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="new-password"
        required
        leadingIcon={<Lock className="h-4 w-4" />}
        error={errors.confirmPassword?.message}
        trailingIcon={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors"
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...register('confirmPassword')}
      />

      {/* Optional fields: age + gender */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Age"
          type="number"
          placeholder="e.g. 22"
          min={6}
          max={120}
          hint="Optional"
          error={errors.age?.message}
          {...register('age', {
            setValueAs: (v: unknown) =>
              v === '' || v === null || v === undefined
                ? undefined
                : Number(v),
          })}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="gender"
            className="text-sm font-medium text-slate-400 select-none"
          >
            Gender
            <span className="ml-1.5 text-xs font-normal text-slate-500">
              (optional)
            </span>
          </label>
          <select
            id="gender"
            className="h-[52px] w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-slate-100 transition-all duration-200 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
            {...register('gender')}
          >
            <option value="">Select…</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.gender && (
            <p className="text-xs text-red-400">{errors.gender.message}</p>
          )}
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" loading={isSubmitting} fullWidth size="lg" className="mt-2">
        {isSubmitting ? 'Creating account…' : (
          <>
            Create account
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
