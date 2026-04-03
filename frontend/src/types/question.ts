export type QuestionType =
  | 'SPEAKING'
  | 'READING'
  | 'LISTENING_SHADOWING'
  | 'LISTENING_COMPREHENSION'
  | 'WRITING';

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type Category = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'TOEFL';

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  level: Level;
  difficulty: Difficulty;
  xp_max: 10 | 20 | 30;
  category: Category;
  correct_answer: string;
  audio_url?: string;
  phonetic_text?: string;
  max_replays?: number | null;
  created_by: number;
  created_at: string;
}

export interface CreateQuestionPayload {
  type: QuestionType;
  level: Level;
  difficulty: Difficulty;
  category: Category;
  text: string;
  correct_answer: string;
  audio_url?: string;
  phonetic_text?: string;
  max_replays?: number | null;
}
