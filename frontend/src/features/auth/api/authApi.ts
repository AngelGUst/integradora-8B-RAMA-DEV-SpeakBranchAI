import apiClient from '@/shared/api/client';
import type {
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  User,
} from '../types/auth.types';

/**
 * Authentication API methods.
 * All functions throw an `AxiosError` on failure so callers can inspect
 * `error.response.data` for backend-provided error messages.
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
    const { data } = await apiClient.post<LoginResponse>(
      '/auth/login/',
      credentials,
    );
    return data;
  },

  /**
   * Register a new student account.
   * Returns JWT pair and the newly created user profile.
   */
  register: async (
    credentials: RegisterCredentials,
  ): Promise<RegisterResponse> => {
    const { data } = await apiClient.post<RegisterResponse>(
      '/auth/register/',
      credentials,
    );
    return data;
  },

  /**
   * Fetch the authenticated user's profile using the stored Bearer token.
   */
  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me/');
    return data;
  },

  /**
   * Invalidate the refresh token on the server side.
   * Called during explicit logout flows.
   */
  logout: async (): Promise<void> => {
    const refresh = localStorage.getItem('sb_refresh_token');
    if (refresh) {
      await apiClient.post('/auth/logout/', { refresh });
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
};
