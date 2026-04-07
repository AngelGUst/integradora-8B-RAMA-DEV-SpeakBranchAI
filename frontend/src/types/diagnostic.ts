import type { Difficulty, Level, QuestionType } from './question';

export interface DiagnosticQuestion {
    id: number;
    text: string;
    type: QuestionType;
    level: Level;
    difficulty: Difficulty;
    xp_max: 10 | 20 | 30;
    category: string;
    audio_url?: string | null;
    phonetic_text?: string | null;
    max_replays?: number | null;
    vocabulary_items?: string[];
}

export type DiagnosticAnswer = {
    question_id: number;
    answer: string | number | Array<string | number>;
};

export interface DiagnosticSubmitRequest {
    answers: DiagnosticAnswer[];
}

export interface DiagnosticSubmitResponse {
    assigned_level: Level;
    overall_accuracy: number;
    total_correct: number;
    total_items: number;
    by_level: Record<Level, { total: number; correct: number; accuracy: number }>;
}
