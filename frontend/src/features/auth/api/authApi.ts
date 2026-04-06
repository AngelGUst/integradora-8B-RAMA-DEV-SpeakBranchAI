import axios from 'axios';
import apiClient from '@/shared/api/client';
import type {
  LoginCredentials,
  LoginResponse,
  GoogleOAuthResponse,
  RegisterCredentials,
  RegisterResponse,
  User,
} from '../types/auth.types';

// ── Dev mock (used when backend is unreachable) ───────────────

const MOCK_TOKEN = 'mock-dev-token';
const MOCK_USER_KEY = 'sb_mock_user';
const ENABLE_AUTH_MOCK = (import.meta.env['VITE_ENABLE_AUTH_MOCK'] as string | undefined) === 'true';

function buildMockUser(email: string, firstName?: string): User {
  return {
    id: 1,
    email,
    first_name: firstName ?? email.split('@')[0] ?? 'Learner',
    age: null,
    gender: null,
    level: 'A1',
    role: 'STUDENT',
    avatar_url: null,
    average_precision: 0,
    is_active: true,
    diagnostic_completed: false,
  };
}

function isMockToken(): boolean {
  return localStorage.getItem('sb_access_token') === MOCK_TOKEN;
}

/**
 * Authentication API methods.
 * All functions throw an `AxiosError` on failure so callers can inspect
 * `error.response.data` for backend-provided error messages.
 *
 * Dev note: when the backend is unreachable (network error), login/getMe
 * fall back to a local mock so the frontend can be tested without a server.
 */
export const authApi = {
  /**
   * Returns the backend URL that starts the Google OAuth flow.
   */
  getGoogleLoginUrl: (): string => {
    const baseUrl = apiClient.defaults.baseURL ?? '';
    return `${baseUrl.replace(/\/$/, '')}/auth/google/`;
  },
  /**
   * Authenticate with email + password.
   * Returns JWT pair and the authenticated user profile.
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const { data } = await apiClient.post<{ access_token: string; refresh_token: string }>(
        '/auth/login/',
        credentials,
      );
      const { data: user } = await apiClient.get<User>('/auth/me/', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      return {
        access: data.access_token,
        refresh: data.refresh_token,
        user,
      };
    } catch (err: unknown) {
      // Fall back to mock when backend is not running
      if (ENABLE_AUTH_MOCK && axios.isAxiosError(err) && !err.response) {
        const user = buildMockUser(credentials.email);
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
        return { access: MOCK_TOKEN, refresh: MOCK_TOKEN, user };
      }
      throw err;
    }
  },

  /**
   * Register a new student account.
   * Returns JWT pair and the newly created user profile.
   */
  register: async (
    credentials: RegisterCredentials,
  ): Promise<RegisterResponse> => {
    try {
      const payload = {
        email: credentials.email,
        password: credentials.password,
        confirm_password: credentials.confirm_password,
        first_name: credentials.first_name,
      };
      const { data } = await apiClient.post<RegisterResponse>(
        '/auth/register/',
        payload,
      );
      return data;
    } catch (err: unknown) {
      if (ENABLE_AUTH_MOCK && axios.isAxiosError(err) && !err.response) {
        return { message: 'Check your email to confirm your account' };
      }
      throw err;
    }
  },

  /**
   * Fetch the authenticated user's profile using the stored Bearer token.
   */
  getMe: async (): Promise<User> => {
    if (isMockToken()) {
      if (!ENABLE_AUTH_MOCK) {
        throw new Error('Mock auth disabled.');
      }
      const stored = localStorage.getItem(MOCK_USER_KEY);
      if (stored) return JSON.parse(stored) as User;
      return buildMockUser('demo@speakbranch.com');
    }
    const { data } = await apiClient.get<User>('/auth/me/');
    return data;
  },

  /**
   * Invalidate the refresh token on the server side.
   * Called during explicit logout flows.
   */
  logout: async (): Promise<void> => {
    if (isMockToken()) {
      if (!ENABLE_AUTH_MOCK) {
        return;
      }
      localStorage.removeItem(MOCK_USER_KEY);
      return;
    }
    const refresh = localStorage.getItem('sb_refresh_token');
    if (refresh) {
      await apiClient.post('/auth/logout/', { refresh_token: refresh });
    }
  },

  /**
   * Obtain a new access token using the stored refresh token.
   */
  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const { data } = await apiClient.post<{ access: string }>(
      '/auth/token/refresh/',
      { refresh },
    );
    return data;
  },

  /**
   * Complete Google OAuth using the authorization code.
   */
  googleCallback: async (code: string): Promise<GoogleOAuthResponse> => {
    const { data } = await apiClient.post<{ access_token: string; refresh_token: string; is_new_user: boolean }>(
      '/auth/google/callback/',
      { code },
    );
    const { data: user } = await apiClient.get<User>('/auth/me/', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    return {
      access: data.access_token,
      refresh: data.refresh_token,
      user,
      isNewUser: data.is_new_user,
    };
  },
};
