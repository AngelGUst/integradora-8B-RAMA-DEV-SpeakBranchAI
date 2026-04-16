const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem('sb_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(err.detail ?? 'Unknown error');
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────

export interface DashboardMetrics {
  total_users: number;
  active_today: number;
  attempts_today: number;
  avg_xp: number;
  trends: {
    total_users: number;
    active_today: number;
    attempts_today: number;
    avg_xp: number;
  };
}

export interface ActivityDataPoint {
  date: string;
  attempts: number;
}

export interface Distributions {
  by_level: Record<string, number>;
  by_skill: Record<string, number>;
}

export type ScoresBySkill = Record<string, number>;

export interface Alerts {
  hard_questions: number;
  easy_questions: number;
  inactive_users: number;
  no_diagnostic: number;
}

export interface TopStudent {
  rank: number;
  first_name: string;
  email: string;
  level: string;
  total_xp: number;
  streak_days: number;
}

export interface RecentAttempt {
  student_name: string;
  skill: string;
  score: number;
  xp_earned: number;
  created_at: string;
}

export interface ApiUsage {
  whisper_minutes_week: number;
  gpt_texts_week: number;
  whisper_minutes_month: number;
  gpt_texts_month: number;
}

// ── Service ────────────────────────────────────────────────────

export const dashboardService = {
  getMetrics: () =>
    apiFetch<DashboardMetrics>('/admin/dashboard/metrics/'),

  getActivity: (days = 30) =>
    apiFetch<ActivityDataPoint[]>(`/admin/dashboard/activity/?days=${days}`),

  getDistributions: () =>
    apiFetch<Distributions>('/admin/dashboard/distributions/'),

  getScores: () =>
    apiFetch<ScoresBySkill>('/admin/dashboard/scores/'),

  getAlerts: () =>
    apiFetch<Alerts>('/admin/dashboard/alerts/'),

  getTopStudents: () =>
    apiFetch<TopStudent[]>('/admin/dashboard/top-students/'),

  getRecentAttempts: () =>
    apiFetch<RecentAttempt[]>('/admin/dashboard/recent-attempts/'),

  getApiUsage: () =>
    apiFetch<ApiUsage>('/admin/dashboard/api-usage/'),
};
