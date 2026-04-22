import type {
  Exam,
  ExamAttempt,
  ExamQuestion,
  ExamStartResponse,
  ExamSubmitResponse,
} from '../types/exam';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('sb_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail ?? 'Network error');
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const examService = {
  /**
   * Gets all available level exams
   */
  getExams(): Promise<Exam[]> {
    return apiFetch<Exam[]>('/exams/');
  },

  /**
   * Gets details for a specific exam
   */
  getExam(examId: number): Promise<Exam> {
    return apiFetch<Exam>(`/exams/${examId}/`);
  },

  /**
   * Starts an exam attempt
   * Retorna las questions y el intento creado
   */
  startExam(examId: number): Promise<ExamStartResponse> {
    return apiFetch<ExamStartResponse>(`/exams/${examId}/start/`, {
      method: 'POST',
    });
  },

  /**
   * Submits exam answers
   */
  submitExam(attemptId: number, answers: Record<string, any>, timeSpentSeconds: number): Promise<ExamSubmitResponse> {
    return apiFetch<ExamSubmitResponse>('/exam-attempts/submit/', {
      method: 'POST',
      body: JSON.stringify({
        attempt_id: attemptId,
        answers,
        time_spent_seconds: timeSpentSeconds,
      }),
    });
  },

  /**
   * Gets all user attempts
   */
  getAttempts(): Promise<ExamAttempt[]> {
    return apiFetch<ExamAttempt[]>('/exam-attempts/');
  },

  /**
   * Gets a specific attempt
   */
  getAttempt(attemptId: number): Promise<ExamAttempt> {
    return apiFetch<ExamAttempt>(`/exam-attempts/${attemptId}/`);
  },
};
