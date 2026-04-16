import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { loginSchema, type LoginFormData } from '../schemas/authSchemas';
import Button from '@/shared/components/ui/Button';
import Input from '@/shared/components/ui/Input';

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  serverError?: string | null;
}

export default function LoginForm({ onSubmit, serverError }: Readonly<LoginFormProps>) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

      {/* Password */}
      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
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

      {/* Remember me + Forgot password */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 group">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/20 bg-[#06060A] accent-violet-500 focus:ring-1 focus:ring-violet-500 focus:ring-offset-0"
            {...register('rememberMe')}
          />
          <span className="text-sm text-slate-400 transition-colors group-hover:text-slate-300">
            Remember me
          </span>
        </label>

        <Link
          to="/forgot-password"
          className="text-sm font-medium text-violet-400 transition-colors hover:text-violet-300"
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit */}
      <Button type="submit" loading={isSubmitting} fullWidth size="lg">
        {isSubmitting ? 'Signing in…' : (
          <>
            Sign in
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
