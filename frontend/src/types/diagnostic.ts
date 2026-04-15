import type { Difficulty, Level, QuestionType } from './question';

export interface QuestionResourceRequirements {
    requires_audio: boolean;
    requires_microphone: boolean;
    has_options: boolean;
    input_mode: 'mcq' | 'speech' | 'text';
}

/**
 * Diagnostic question as returned by the public serializer.
 * Does NOT include correct_answer — only MCQ options (shuffled).
 */
export interface DiagnosticQuestion {
    id: number;
    text: string;
    type: QuestionType;
    level: Level;
    difficulty: Difficulty;
    /** MCQ options (shuffled, correct answer is NOT marked). */
    options: string[];
    audio_url?: string | null;
    phonetic_text?: string | null;
    max_replays?: number | null;
    resource_requirements?: QuestionResourceRequirements;
}

export interface DiagnosticAnswer {
    question_id: number;
    answer: string;
}

export interface DiagnosticSubmitRequest {
    answers: DiagnosticAnswer[];
}

export interface DiagnosticSubmitResponse {
    assigned_level: Level;
    overall_accuracy: number;
    total_correct: number;
    total_items: number;
    by_level: Record<string, { total: number; correct: number; accuracy: number }>;
}
