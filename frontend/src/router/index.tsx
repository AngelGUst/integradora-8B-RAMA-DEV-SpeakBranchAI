import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LandingPage from '@/features/landing/pages/LandingPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import Logo from '@/shared/components/ui/Logo';

// ── Route guards ──────────────────────────────────────────────

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return <AppLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── Full-screen loader ────────────────────────────────────────

function AppLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#07090F]">
      <div className="relative">
        {/* Outer rotating ring */}
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/[0.06] border-t-emerald-500" />
        {/* Center logo mark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo size="xs" showText={false} />
        </div>
      </div>
      <p className="animate-pulse text-xs text-slate-600 tracking-wider">
        Loading SpeakBranch…
      </p>
    </div>
  );
}

// ── Placeholder pages ─────────────────────────────────────────

function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#07090F]">
      <Logo size="lg" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">
          Welcome back,{' '}
          <span className="text-emerald-400">{user?.first_name}</span> 👋
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Dashboard under construction · Level:{' '}
          <strong className="text-emerald-400">{user?.level}</strong>
        </p>
      </div>
      <button
        onClick={() => void logout()}
        className="rounded-xl border border-white/10 px-5 py-2 text-sm font-medium text-slate-400 transition-all hover:border-white/20 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}

function OnboardingPlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090F]">
      <div className="text-center space-y-3">
        <Logo size="lg" />
        <p className="text-slate-500">Placement test — coming soon.</p>
      </div>
    </div>
  );
}

// ── Route tree ────────────────────────────────────────────────

export default function AppRouter() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Public auth */}
      <Route
        path="/login"
        element={<PublicRoute><LoginPage /></PublicRoute>}
      />
      <Route
        path="/register"
        element={<PublicRoute><RegisterPage /></PublicRoute>}
      />

      {/* Private */}
      <Route
        path="/dashboard"
        element={<PrivateRoute><DashboardPlaceholder /></PrivateRoute>}
      />
      <Route
        path="/onboarding"
        element={<PrivateRoute><OnboardingPlaceholder /></PrivateRoute>}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
