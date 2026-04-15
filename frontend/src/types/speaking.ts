export interface SpeakingQuestion {
    id: number;
    text: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    level: string;
    phonetic_text: string | null;
    xp_max: number;
}

export interface LessonProgress {
    total_xp: number;
    max_xp: number;
    is_completed: boolean;
    xp_breakdown: {
        easy: number;
        medium: number;
        hard: number;
    };
}

export interface SpeakingResult {
    id: number;
    word: string;
    transcribed_text: string;
    score: number;
    xp_earned: number;
    attempts_count: number;
    created_at: string;
    lesson_progress: LessonProgress;
}

export interface EvaluatePayload {
    question_id: number;
    transcript: string;
    attempts_count: number;
}