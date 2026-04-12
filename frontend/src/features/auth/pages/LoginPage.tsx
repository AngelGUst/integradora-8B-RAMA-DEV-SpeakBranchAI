import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/authApi';
import LoginForm from '../components/LoginForm';
import Logo from '@/shared/components/ui/Logo';
import Button from '@/shared/components/ui/Button';
import type { LoginFormData } from '../schemas/authSchemas';
import type { ApiError } from '@/shared/types/api.types';

// ── Floating word pills ───────────────────────────────────────

const PILLS = [
  { word: 'sophisticated', delay: 0 },
  { word: 'proficiency', delay: 0.3 },
  { word: 'articulate', delay: 0.6 },
  { word: 'fluency', delay: 0.9 },
  { word: 'precision', delay: 1.2 },
];

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
          {['MASTER', 'THE', 'LANGUAGE.'].map((word, i) => (
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

        {/* Floating vocab pills */}
        <div className="flex flex-wrap gap-2">
          {PILLS.map(({ word, delay }) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + delay, ease: 'easeOut' }}
              className="inline-block rounded-full border border-violet-500/20 bg-violet-500/[0.07] px-3 py-1.5 text-xs font-medium text-violet-300"
            >
              {word}
            </motion.span>
          ))}
        </div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="text-xs text-slate-600 max-w-xs leading-relaxed"
        >
          Free account · No credit card · Cancel any time
        </motion.p>
      </div>
    </aside>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const clientId = authApi.getGoogleClientId();

  const handleSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const res = await authApi.login({ email: data.email, password: data.password });
      login(res.access, res.refresh, res.user);
      const nextRoute = res.user.role === 'ADMIN' ? '/admin/questions' : '/dashboard';
      navigate(nextRoute, { replace: true });
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const body = err.response?.data as ApiError | Record<string, string> | undefined;
        setServerError(
          (body as ApiError | undefined)?.detail
          ?? (body as ApiError | undefined)?.non_field_errors?.[0]
          ?? (body as Record<string, string> | undefined)?.error
          ?? 'Invalid email or password.',
        );
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setServerError(null);
    try {
      const response = await authApi.handleGoogleResponse(credentialResponse.credential);
      login(response.access, response.refresh, response.user);
      const nextRoute = response.user.role === 'ADMIN' ? '/admin/questions' : '/dashboard';
      navigate(nextRoute, { replace: true });
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const body = err.response?.data as ApiError | Record<string, string> | undefined;
        setServerError(
          (body as ApiError | undefined)?.detail ?? 'Google login failed. Try again.',
        );
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
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
              <h1 className="text-3xl font-black tracking-tight text-white">Welcome back.</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Sign in to continue your learning journey.
              </p>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <LoginForm onSubmit={handleSubmit} serverError={serverError} />
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

            {/* Google OAuth */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 flex justify-center"
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setServerError('Google login failed. Try again.')}
              />
            </motion.div>

            {/* Register link */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center text-sm text-slate-500"
            >
              No account yet?{' '}
              <Link
                to="/register"
                onClick={() => setServerError(null)}
                className="font-semibold text-violet-400 transition-colors hover:text-violet-300"
              >
                Create one free
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
    </GoogleOAuthProvider>
  );
}