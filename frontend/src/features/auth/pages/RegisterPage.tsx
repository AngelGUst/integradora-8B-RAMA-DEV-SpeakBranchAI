import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { authApi } from '../api/authApi';
import RegisterForm from '../components/RegisterForm';
import Logo from '@/shared/components/ui/Logo';
import type { RegisterFormData } from '../schemas/authSchemas';
import type { ApiError } from '@/shared/types/api.types';

// ── CEFR step tracker ─────────────────────────────────────────

const CEFR_STEPS = [
  { label: 'A1', name: 'Beginner' },
  { label: 'A2', name: 'Elementary' },
  { label: 'B1', name: 'Intermediate' },
  { label: 'B2', name: 'Upper-Int.' },
  { label: 'C1', name: 'Advanced' },
  { label: 'C2', name: 'Mastery' },
] as const;

// ── Brand panel ───────────────────────────────────────────────

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14 bg-[#080610]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 top-1/3 h-[600px] w-[600px] rounded-full bg-violet-600/[0.12] blur-[100px] animate-orb" />
        <div className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full bg-violet-500/[0.06] blur-[80px]" />
        <div className="absolute inset-0 bg-dot" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10"
      >
        <Logo size="md" />
      </motion.div>

      {/* Main copy */}
      <div className="relative z-10 space-y-10">
        <div className="space-y-2">
          {['START', 'YOUR', 'JOURNEY.'].map((word, i) => (
            <motion.p
              key={word}
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.1 }}
              className={`block text-[clamp(2.5rem,4vw,4rem)] font-black tracking-tighter leading-[0.9] ${i === 2 ? 'gradient-text' : 'text-white'
                }`}
            >
              {word}
            </motion.p>
          ))}
        </div>

        {/* CEFR path */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55, ease: 'easeOut' }}
          className="space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
            CEFR learning path
          </p>
          <div className="flex gap-2">
            {CEFR_STEPS.map(({ label }, i) => (
              <div
                key={label}
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all ${i === 0
                    ? 'border border-violet-500/40 bg-violet-500/15 text-violet-400'
                    : 'border border-white/[0.06] bg-white/[0.03] text-slate-600'
                  }`}
              >
                {label}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            We detect your level and guide you from there.
          </p>
        </motion.div>

        {/* Mini stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="grid grid-cols-2 gap-3"
        >
          {(
            [
              { n: '4', desc: 'Core skills' },
              { n: '∞', desc: 'AI exercises' },
              { n: '6', desc: 'CEFR levels' },
              { n: '100%', desc: 'Adaptive' },
            ] as const
          ).map(({ n, desc }) => (
            <div
              key={desc}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center"
            >
              <p className="text-xl font-black text-violet-400">{n}</p>
              <p className="text-xs text-slate-600">{desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-xs text-slate-700"
        >
          Free account · No credit card · Cancel any time
        </motion.p>
      </div>
    </aside>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  const handleSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setServerSuccess(null);
    try {
      const res = await authApi.register({
        email: data.email,
        password: data.password,
        confirm_password: data.confirmPassword,
        first_name: data.first_name,
      });
      setServerSuccess(res.message);
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const body = err.response?.data as ApiError | Record<string, string[] | string> | undefined;
        const fieldErrors = body && typeof body === 'object' && 'errors' in body
          ? (body as ApiError).errors
          : undefined;
        const directField = body && typeof body === 'object'
          ? Object.values(body).flat?.()?.[0]
          : undefined;
        const firstField = fieldErrors
          ? Object.values(fieldErrors).flat()[0]
          : (typeof directField === 'string' ? directField : undefined);
        setServerError(
          firstField ?? (body as ApiError | undefined)?.detail ?? (body as ApiError | undefined)?.non_field_errors?.[0] ?? (body as ApiError | undefined)?.message ?? 'Registration failed.',
        );
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#06060A] lg:grid-cols-[55%_45%]">
      {/* Brand panel */}
      <BrandPanel />

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center px-6 py-16">
        {/* Subtle atmosphere */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-24 -top-24 h-[350px] w-[350px] rounded-full bg-violet-500/[0.06] blur-[100px]" />
          <div className="absolute inset-0 bg-dot opacity-40" />
        </div>

        <div className="relative w-full max-w-sm">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 flex flex-col items-center gap-2 lg:hidden"
          >
            <Logo size="md" />
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <h1 className="text-3xl font-black tracking-tight text-white">Create your account.</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Free forever. No credit card required.
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <RegisterForm onSubmit={handleSubmit} serverError={serverError} serverSuccess={serverSuccess} />
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="my-7 flex items-center gap-3"
          >
            <div className="h-px flex-1 bg-white/[0.05]" />
            <span className="text-xs text-slate-700">or</span>
            <div className="h-px flex-1 bg-white/[0.05]" />
          </motion.div>

          {/* Login link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center text-sm text-slate-500"
          >
            Already have an account?{' '}
            <Link
              to="/login"
              onClick={() => setServerError(null)}
              className="font-semibold text-violet-400 transition-colors hover:text-violet-300"
            >
              Sign in
            </Link>
          </motion.p>

          {/* Back to home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-8 text-center"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-700 transition-colors hover:text-slate-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
