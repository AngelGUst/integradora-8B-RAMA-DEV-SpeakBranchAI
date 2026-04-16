export type ExamType = 'DIAGNOSTIC' | 'LEVEL_UP' | 'TOEFL';
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ExamStatus = 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';

export interface Exam {
  id: number;
  level: Level;
  type: ExamType;
  name: string;
  description: string;
  xp_required: number;
  required_xp_for_level?: number;
  passing_score: number;
  time_limit_minutes: number;
  question_count: number;
  is_active: boolean;
  created_at: string;
  can_unlock: boolean;
  is_unlocked: boolean;
  last_attempt?: {
    id: number;
    score: number | null;
    passed: boolean;
    xp_earned: number;
    status: ExamStatus;
    started_at: string;
  } | null;
}

export interface ExamQuestion {
  question_id: number;
  text: string;
  question_type: string;
  level: Level;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  correct_answer: string;
  options?: string[];
  resource_requirements?: {
    requires_audio: boolean;
    requires_microphone: boolean;
    has_options: boolean;
    input_mode: 'mcq' | 'speech' | 'text';
  };
  audio_url: string | null;
  phonetic_text: string | null;
  max_replays: number | null;
  points: number;
  order: number;
}

export interface ExamAttempt {
  id: number;
  exam: number;
  exam_name: string;
  exam_level: Level;
  exam_type: ExamType;
  passing_score: number;
  time_limit_minutes: number;
  status: ExamStatus;
  score: number | null;
  passed: boolean;
  xp_earned: number;
  answers: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
}

export interface ExamStartResponse {
  attempt: ExamAttempt;
  questions: ExamQuestion[];
  continuing: boolean;
}

export interface ExamSubmitResponse {
  attempt: ExamAttempt;
  score: number;
  previous_best_score?: number;
  score_delta?: number;
  passed: boolean;
  message: string;
}
