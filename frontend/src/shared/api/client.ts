import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:8000/api';

const TOKEN_KEY = 'sb_access_token';
const REFRESH_KEY = 'sb_refresh_token';

/**
 * Axios instance pre-configured for the SpeakBranch AI backend.
 * Automatically attaches the Bearer token on every request and
 * redirects to /login on 401 responses.
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// ── Request interceptor: attach JWT ──────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── Response interceptor: handle 401 ────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      // Avoid hard redirect if already on auth pages
      const publicPaths = ['/login', '/register'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export { TOKEN_KEY, REFRESH_KEY };
export default apiClient;
