// ── Public API of the auth feature ──────────────────────────
// Import from '@/features/auth' instead of deep paths.

export { AuthProvider, AuthContext } from './context/AuthContext';
export { useAuth } from './hooks/useAuth';
export { authApi } from './api/authApi';
export type {
  User,
  CefrLevel,
  UserRole,
  Gender,
  AuthTokens,
  LoginResponse,
  RegisterResponse,
  LoginCredentials,
  RegisterCredentials,
} from './types/auth.types';
