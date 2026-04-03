import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import AppRouter from '@/router';

/**
 * Application root.
 *
 * Provider order (outer → inner):
 *  1. BrowserRouter — makes React Router hooks available everywhere
 *  2. AuthProvider  — exposes authentication state via context
 *  3. AppRouter     — declares the route tree
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
