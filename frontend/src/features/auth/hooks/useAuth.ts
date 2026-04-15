import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Provides access to the authentication context.
 *
 * @throws {Error} When called outside of an `AuthProvider` tree.
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      'useAuth must be used within an <AuthProvider>. ' +
        'Ensure your component tree is wrapped with <AuthProvider>.',
    );
  }
  return context;
}
