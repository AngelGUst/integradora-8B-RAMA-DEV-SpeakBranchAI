// frontend/src/services/exerciseEvaluationService.ts
const API_BASE_URL = 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'sb_access_token';

export interface EvaluationResponse {
  id: number;
  selected_answer?: string;
  transcribed_text?: string;
  correct?: boolean;
  score: number;
  xp_earned: number;
  lesson_progress: {
    total_xp: number;
    max_xp: number;
    is_completed: boolean;
    xp_breakdown: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

class ExerciseEvaluationService {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private async fetch(endpoint: string, method: string, body?: unknown): Promise<EvaluationResponse> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json() as Promise<EvaluationResponse>;
  }

  async evaluateReading(
    questionId: number,
    selectedAnswer: string
  ): Promise<EvaluationResponse> {
    return this.fetch('/reading/evaluate/', 'POST', {
      question_id: questionId,
      selected_answer: selectedAnswer,
    });
  }

  async evaluateSpeaking(
    questionId: number,
    transcript: string
  ): Promise<EvaluationResponse> {
    return this.fetch('/speaking/evaluate/', 'POST', {
      question_id: questionId,
      transcript,
    });
  }

  async evaluateShadowing(
    questionId: number,
    transcript: string
  ): Promise<EvaluationResponse> {
    return this.fetch('/shadowing/evaluate/', 'POST', {
      question_id: questionId,
      transcript,
    });
  }

  async evaluateComprehension(
    questionId: number,
    selectedAnswer: string
  ): Promise<EvaluationResponse> {
    return this.fetch('/comprehension/evaluate/', 'POST', {
      question_id: questionId,
      selected_answer: selectedAnswer,
    });
  }
}

export const exerciseEvaluationService = new ExerciseEvaluationService();