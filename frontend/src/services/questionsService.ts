import type { Question, CreateQuestionPayload, QuestionType, Level, Difficulty, Category } from '../types/question';

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

  getQuestion(id: number): Promise<Question> {
    return apiFetch<Question>(`/api/questions/${id}/`);
  },

  getQuestionVocabulary(questionId: number): Promise<QuestionVocabularyItem[]> {
    return apiFetch<QuestionVocabularyItem[]>(`/api/questions/${questionId}/vocabulary/`);
  },

  addVocabularyToQuestion(
    questionId: number,
    payload: { vocabulary_id: number; is_key?: boolean; order?: number },
  ): Promise<QuestionVocabularyItem> {
    return apiFetch<QuestionVocabularyItem>(`/api/questions/${questionId}/vocabulary/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  removeVocabularyFromQuestion(questionId: number, vocabId: number): Promise<void> {
    return apiFetch<void>(`/api/questions/${questionId}/vocabulary/${vocabId}/`, {
      method: 'DELETE',
    });
  },

  evaluateWriting(questionId: number, studentText: string): Promise<WritingEvaluationResult> {
    return apiFetch<WritingEvaluationResult>('/api/writing/evaluate/', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, student_text: studentText }),
    });
  },

  getExerciseVocabulary(questionId: number): Promise<VocabularyWord[]> {
    return apiFetch<{ data: VocabularyWord[] }>('/api/vocabulary/exercise-words/', {
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

export interface WritingEvaluationResult {
  score: number;
  score_grammar: number;
  score_vocabulary: number;
  score_coherence: number;
  score_spelling: number;
  feedback: string;
  xp_earned: number;
}
