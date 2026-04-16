import type {
  Exam,
  ExamAttempt,
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
   * Obtiene todos los exámenes de nivel disponibles
   */
  getExams(): Promise<Exam[]> {
    return apiFetch<Exam[]>('/exams/');
  },

  /**
   * Obtiene detalles de un examen específico
   */
  getExam(examId: number): Promise<Exam> {
    return apiFetch<Exam>(`/exams/${examId}/`);
  },

  /**
   * Inicia un intento de examen
   * Retorna las preguntas y el intento creado
   */
  startExam(examId: number): Promise<ExamStartResponse> {
    return apiFetch<ExamStartResponse>(`/exams/${examId}/start/`, {
      method: 'POST',
    });
  },

  /**
   * Envía las respuestas de un examen
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
   * Obtiene todos los intentos del usuario
   */
  getAttempts(): Promise<ExamAttempt[]> {
    return apiFetch<ExamAttempt[]>('/exam-attempts/');
  },

  /**
   * Obtiene un intento específico
   */
  getAttempt(attemptId: number): Promise<ExamAttempt> {
    return apiFetch<ExamAttempt>(`/exam-attempts/${attemptId}/`);
  },
};
