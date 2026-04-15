import {
  createContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import { authApi } from '../api/authApi';
import type { User } from '../types/auth.types';
import { TOKEN_KEY, REFRESH_KEY } from '@/shared/api/client';

const PLACEMENT_KEY = 'sb_placement_done';

// ── State ────────────────────────────────────────────────────

interface AuthState {
  /** Authenticated user profile, or null when logged out. */
  user: User | null;
  /** True once a valid token has been confirmed with the server. */
  isAuthenticated: boolean;
  /** True during the initial session restoration check. */
  isInitializing: boolean;
}

// ── Actions ──────────────────────────────────────────────────

type AuthAction =
  | { type: 'INIT_COMPLETE'; payload: User | null }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' };

// ── Reducer ──────────────────────────────────────────────────

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INIT_COMPLETE':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isInitializing: false,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isInitializing: false,
      };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isInitializing: false };
  }
}

const INITIAL_STATE: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitializing: true,
};

// ── Context value ────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  /**
   * Persist tokens and update the session after a successful login/register.
   * Call this immediately after receiving tokens from `authApi`.
   */
  login: (access: string, refresh: string, user: User) => void;
  /**
   * Clear all stored tokens and reset the session.
   * Attempts to invalidate the refresh token on the server.
   */
  logout: () => Promise<void>;
  /**
   * Re-fetch the user profile from the server and update context state.
   * Useful after actions that change user data (e.g. diagnostic completion).
   */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Wraps the application with authentication state.
 * On mount it attempts to restore the session from localStorage;
 * if the stored token is invalid, the session is cleared silently.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);

  // Restore session from localStorage on app boot
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        dispatch({ type: 'INIT_COMPLETE', payload: null });
        return;
      }
      try {
        const user = await authApi.getMe();
        dispatch({ type: 'INIT_COMPLETE', payload: user });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        dispatch({ type: 'INIT_COMPLETE', payload: null });
      }
    };

    void restore();
  }, []);

  const login = (access: string, refresh: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(PLACEMENT_KEY);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshUser = async () => {
    try {
      const user = await authApi.getMe();
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch {
      // Silently ignore — session might have expired
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
