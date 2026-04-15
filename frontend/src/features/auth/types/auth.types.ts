// ── Domain enumerations ──────────────────────────────────────

/** CEFR proficiency levels used across the platform. */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Platform roles. Students use the learning interface; admins manage content. */
export type UserRole = 'ADMIN' | 'STUDENT';

/** Biological sex options as stored in the backend. */
export type Gender = 'M' | 'F' | 'OTHER';

// ── Entity types ─────────────────────────────────────────────

/**
 * Authenticated user profile returned by the backend.
 * Mirrors the `users.models.user.User` Django model.
 */
export interface User {
  id: number;
  email: string;
  first_name: string;
  age: number | null;
  gender: Gender | null;
  level: CefrLevel;
  role: UserRole;
  avatar_url: string | null;
  /** Average of the four skill precision scores (0–100). */
  average_precision: number;
  is_active: boolean;
  diagnostic_completed: boolean;
}

// ── API payload types ────────────────────────────────────────

export interface AuthTokens {
  /** Short-lived JWT used as a Bearer token. */
  access: string;
  /** Long-lived token used to obtain new access tokens. */
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface GoogleOAuthResponse extends AuthTokens {
  user: User;
  isNewUser: boolean;
}

export interface RegisterResponse {
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
}
