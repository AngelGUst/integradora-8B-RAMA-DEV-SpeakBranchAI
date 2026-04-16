import type { Question, CreateQuestionPayload, QuestionType, Level, Difficulty, Category } from '../types/question';
import type {
  DiagnosticQuestion,
  DiagnosticSubmitRequest,
  DiagnosticSubmitResponse,
} from '../types/diagnostic';

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

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const questionsService = {
  getDiagnosticQuestions(limit?: number): Promise<DiagnosticQuestion[]> {
    const params = limit ? `?limit=${limit}` : '';
    return apiFetch<DiagnosticQuestion[]>(`/questions/diagnostic/${params}`);
  },

  submitDiagnostic(payload: DiagnosticSubmitRequest): Promise<DiagnosticSubmitResponse> {
    return apiFetch<DiagnosticSubmitResponse>('/questions/diagnostic/submit/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getLevelExercises(params?: {
    level?: Level;
    type?: QuestionType;
    category?: string;
    limit?: number;
    dynamic?: boolean;
    strict_limit?: boolean;
  }): Promise<DiagnosticQuestion[]> {
    const merged = {
      dynamic: true,
      strict_limit: false,
      ...params,
    };

    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')
      ) as Record<string, string>
    ).toString();
    return apiFetch<DiagnosticQuestion[]>(`/questions/level-exercises/${query ? `?${query}` : ''}`);
  },

  getAdaptiveSessionExercises(params?: {
    level?: Level;
    type?: QuestionType;
    category?: string;
    limit?: number;
    strict_limit?: boolean;
  }): Promise<DiagnosticQuestion[]> {
    return questionsService.getLevelExercises({
      dynamic: true,
      strict_limit: false,
      ...params,
    });
  },

  getAdaptiveNextQuestion(payload: {
    level?: Level;
    type?: QuestionType;
    category?: string;
    last_score?: number;
    current_difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    exclude_ids?: number[];
  }): Promise<DiagnosticQuestion> {
    return apiFetch<DiagnosticQuestion>('/questions/adaptive/next/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async getQuestions(filters?: QuestionFilters): Promise<Question[]> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters ?? {}).filter(([, v]) => v !== undefined && v !== '')
      ) as Record<string, string>
    );

    params.set('all', 'true');

    const response = await apiFetch<PaginatedResponse<Question> | Question[] | Question>(`/questions/?${params.toString()}`);
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
      return response.results;
    }
    if (response && typeof response === 'object') {
      return [response as Question];
    }

    return [];
  },

  createQuestion(data: CreateQuestionPayload): Promise<Question> {
    return apiFetch<Question>('/questions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuestion(id: number, data: Partial<CreateQuestionPayload>): Promise<Question> {
    return apiFetch<Question>(`/questions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteQuestion(id: number): Promise<void> {
    return apiFetch<void>(`/questions/${id}/`, { method: 'DELETE' });
  },

  getQuestion(id: number): Promise<Question> {
    return apiFetch<Question>(`/questions/${id}/`);
  },

  getQuestionVocabulary(questionId: number): Promise<QuestionVocabularyItem[]> {
    return apiFetch<QuestionVocabularyItem[]>(`/questions/${questionId}/vocabulary/`);
  },

  addVocabularyToQuestion(
    questionId: number,
    payload: { vocabulary_id: number; is_key?: boolean; order?: number },
  ): Promise<QuestionVocabularyItem> {
    return apiFetch<QuestionVocabularyItem>(`/questions/${questionId}/vocabulary/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  removeVocabularyFromQuestion(questionId: number, vocabId: number): Promise<void> {
    return apiFetch<void>(`/questions/${questionId}/vocabulary/${vocabId}/`, {
      method: 'DELETE',
    });
  },

  evaluateWriting(questionId: number, studentText: string): Promise<WritingEvaluationResult> {
    return apiFetch<WritingEvaluationResult>('/writing/evaluate/', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, student_text: studentText }),
    });
  },

  getExerciseVocabulary(questionId: number): Promise<VocabularyWord[]> {
    return apiFetch<{ data: VocabularyWord[] }>('/vocabulary/exercise-words/', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId }),
    }).then((res) => res.data);
  },
};

export interface VocabularyWord {
  id: number;
  word: string;
  meaning: string;
  pronunciation: string;
  example_sentence: string;
  level: string;
  category: string;
  image_url?: string;
  audio_url?: string;
}

export interface QuestionVocabularyItem {
  id: number;
  vocabulary: VocabularyWord;
  is_key: boolean;
  order: number;
  created_at: string;
}

// ── Ordered exercise IDs (set by LearnPathPage, read by ExercisePage) ─────────
let _orderedQuestionIds: string[] = [];

export function setOrderedQuestionIds(ids: string[]): void {
  _orderedQuestionIds = ids;
}

export function getNextQuestionId(currentId: string): string | null {
  const idx = _orderedQuestionIds.indexOf(String(currentId));
  return idx >= 0 && idx + 1 < _orderedQuestionIds.length
    ? _orderedQuestionIds[idx + 1]
    : null;
}

export interface WritingEvaluationResult {
  score: number;
  score_grammar: number;
  score_vocabulary: number;
  score_coherence: number;
  score_spelling: number;
  feedback: string;
  xp_earned: number;
}
