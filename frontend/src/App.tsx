import { AuthProvider } from '@/features/auth/context/AuthContext';
import AppRouter from '@/router';

/**
 * Application root.
 *
 * Provider order (outer → inner):
 *  1. AuthProvider  — exposes authentication state via context
 *  2. AppRouter     — declares the route tree
 */
export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
