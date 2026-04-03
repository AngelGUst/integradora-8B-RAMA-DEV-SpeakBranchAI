import type { Question, CreateQuestionPayload, QuestionType, Level, Difficulty, Category } from '../types/question';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail ?? 'Unknown error');
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export interface QuestionFilters {
  type?: QuestionType;
  level?: Level;
  difficulty?: Difficulty;
  category?: Category;
}

export const questionsService = {
  getQuestions(filters?: QuestionFilters): Promise<Question[]> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters ?? {}).filter(([, v]) => v !== undefined && v !== '')
      ) as Record<string, string>
    ).toString();
    return apiFetch<Question[]>(`/api/questions/${params ? `?${params}` : ''}`);
  },

  createQuestion(data: CreateQuestionPayload): Promise<Question> {
    return apiFetch<Question>('/api/questions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuestion(id: number, data: Partial<CreateQuestionPayload>): Promise<Question> {
    return apiFetch<Question>(`/api/questions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteQuestion(id: number): Promise<void> {
    return apiFetch<void>(`/api/questions/${id}/`, { method: 'DELETE' });
  },
};
