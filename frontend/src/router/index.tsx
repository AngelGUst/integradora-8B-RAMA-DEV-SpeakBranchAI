import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LandingPage from '@/features/landing/pages/LandingPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import GoogleCallbackPage from '@/features/auth/pages/GoogleCallbackPage';
import PlacementTestPage from '@/features/onboarding/pages/PlacementTestPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import LearnPathPage from '@/features/learn/pages/LearnPathPage';
import ExercisePage from '@/features/exercises/pages/ExercisePage';
import QuestionsPage from '@/pages/admin/QuestionsPage';
import VocabularyPage from '@/pages/admin/VocabularyPage';
import UsersPage from '@/pages/admin/UsersPage';
import VocabularyCollectionPage from '@/pages/user/VocabularyCollectionPage';
import Logo from '@/shared/components/ui/Logo';
import type { UserRole } from '@/features/auth/types/auth.types';

// ── Placement helper ──────────────────────────────────────────

const PLACEMENT_KEY = 'sb_placement_done';

function isPlacementDone(value?: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return localStorage.getItem(PLACEMENT_KEY) === 'true';
}

function getDefaultRoute(role?: UserRole, diagnosticCompleted?: boolean): string {
  if (role === 'ADMIN') return '/admin/questions';
  return isPlacementDone(diagnosticCompleted) ? '/dashboard' : '/onboarding';
}

// ── Route guards ──────────────────────────────────────────────

/**
 * Public-only route: redirects authenticated users.
 * After auth, sends to /onboarding if placement not done, else /dashboard.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  if (isInitializing) return <AppLoader />;
  if (isAuthenticated) {
    return <Navigate to={getDefaultRoute(user?.role, user?.diagnostic_completed)} replace />;
  }
  return <>{children}</>;
}

/**
 * Private route: requires authentication.
 * Optionally requires placement test to be completed first.
 */
function PrivateRoute({
  children,
  requiresPlacement = false,
  allowedRoles,
}: {
  children: React.ReactNode;
  requiresPlacement?: boolean;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  if (isInitializing) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user.role, user.diagnostic_completed)} replace />;
  }
  if (requiresPlacement && !isPlacementDone(user?.diagnostic_completed)) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

/**
 * Admin-only route: requires auth and ADMIN role.
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  if (isInitializing) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/**
 * Onboarding route: requires auth, but redirects if placement already done.
 */
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  if (isInitializing) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isPlacementDone(user?.diagnostic_completed)) return <Navigate to="/learn" replace />;
  return <>{children}</>;
}

// ── Full-screen loader ────────────────────────────────────────

function AppLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#07090F]">
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/[0.06] border-t-emerald-500" />
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
      <Route
        path="/auth/google/callback"
        element={<PublicRoute><GoogleCallbackPage /></PublicRoute>}
      />

      {/* Onboarding — placement test (auth required, placement not done) */}
      <Route
        path="/onboarding"
        element={<OnboardingRoute><PlacementTestPage /></OnboardingRoute>}
      />

      {/* Dashboard (auth + placement required) */}
      <Route
        path="/dashboard"
        element={(
          <PrivateRoute requiresPlacement allowedRoles={['STUDENT']}>
            <DashboardPage />
          </PrivateRoute>
        )}
      />

      {/* Learn path — curriculum node map */}
      <Route
        path="/learn"
        element={(
          <PrivateRoute>
            <LearnPathPage />
          </PrivateRoute>
        )}
      />

      {/* Exercise player */}
      <Route
        path="/exercise/:id"
        element={(
          <PrivateRoute requiresPlacement allowedRoles={['STUDENT']}>
            <ExercisePage />
          </PrivateRoute>
        )}
      />

      {/* Vocabulary collection */}
      <Route
        path="/vocabulary"
        element={<PrivateRoute requiresPlacement><VocabularyCollectionPage /></PrivateRoute>}
      />

      {/* Admin */}
      <Route
        path="/admin/questions"
        element={<AdminRoute><QuestionsPage /></AdminRoute>}
      />
      <Route
        path="/admin/vocabulary"
        element={<AdminRoute><VocabularyPage /></AdminRoute>}
      />
      <Route
        path="/admin/users"
        element={<AdminRoute><UsersPage /></AdminRoute>}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
