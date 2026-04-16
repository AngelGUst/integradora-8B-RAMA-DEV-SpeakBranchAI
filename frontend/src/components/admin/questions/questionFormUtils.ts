import type { QuestionType, Level, Difficulty, Category, CreateQuestionPayload } from '../../../types/question';

export const XP_MAP: Record<Difficulty, number> = { EASY: 10, MEDIUM: 20, HARD: 30 };

export const INPUT =
  'w-full bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 ' +
  'focus:border-violet-500/50 focus:outline-none px-4 py-3 text-[14px] transition-colors';

export const LABEL =
  'block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-2';

export const SELECT = INPUT + ' appearance-none cursor-pointer';

export type OptionLetter = 'A' | 'B' | 'C' | 'D';

export interface ReadingQuestion {
  text: string;
  options: [string, string, string, string];
  correct_option: OptionLetter;
}

const EMPTY_READING_QUESTION: ReadingQuestion = {
  text: '',
  options: ['', '', '', ''],
  correct_option: 'A',
};

export interface FormState {
  level: Level;
  difficulty: Difficulty;
  category: Category;
  text: string;
  correct_answer: string;
  phonetic_text: string;
  audio_url: string;
  options: [string, string, string, string];
  correct_option: OptionLetter;
  evaluation_instructions: string;
  reading_questions: ReadingQuestion[];
}

export const INITIAL_FORM: FormState = {
  level: 'A1',
  difficulty: 'EASY',
  category: 'PRACTICE',
  text: '',
  correct_answer: '',
  phonetic_text: '',
  audio_url: '',
  options: ['', '', '', ''],
  correct_option: 'A',
  evaluation_instructions: '',
  reading_questions: [{ ...EMPTY_READING_QUESTION }],
};

const LETTERS = ['A', 'B', 'C', 'D'] as const;

export function buildPayload(type: QuestionType, form: FormState): CreateQuestionPayload {
  const base = { type, level: form.level, difficulty: form.difficulty, category: form.category };

  switch (type) {
    case 'SPEAKING':
      return {
        ...base,
        text: form.text,
        correct_answer: form.correct_answer,
        ...(form.phonetic_text ? { phonetic_text: form.phonetic_text } : {}),
        ...(form.audio_url ? { audio_url: form.audio_url } : {}),
      };
    case 'READING': {
      const questions = form.reading_questions.map((rq) => {
        const idx = LETTERS.indexOf(rq.correct_option);
        return { text: rq.text, options: rq.options, correct: rq.options[idx] ?? rq.options[0] };
      });
      return { ...base, text: form.text, correct_answer: JSON.stringify({ questions }) };
    }
    case 'LISTENING_SHADOWING':
      return {
        ...base,
        text: form.text,
        correct_answer: form.correct_answer,
        max_replays: null,
        ...(form.phonetic_text ? { phonetic_text: form.phonetic_text } : {}),
      };
    case 'LISTENING_COMPREHENSION': {
      const questions = form.reading_questions.map((rq) => {
        const idx = LETTERS.indexOf(rq.correct_option);
        return { text: rq.text, options: rq.options, correct: rq.options[idx] ?? rq.options[0] };
      });
      return {
        ...base,
        text: form.text,
        phonetic_text: form.phonetic_text,
        correct_answer: JSON.stringify({ questions }),
        max_replays: 3,
      };
    }
    case 'WRITING':
      return { ...base, text: form.text, correct_answer: form.evaluation_instructions };
  }
}

export function initFormFromQuestion(
  type: QuestionType,
  q: {
    text: string;
    level: Level;
    difficulty: Difficulty;
    category: Category;
    correct_answer: string;
    audio_url?: string;
    phonetic_text?: string;
  }
): FormState {
  const base: FormState = {
    ...INITIAL_FORM,
    level: q.level,
    difficulty: q.difficulty,
    category: q.category,
    text: q.text,
    audio_url: q.audio_url ?? '',
    phonetic_text: q.phonetic_text ?? '',
  };

  if (type === 'READING' || type === 'LISTENING_COMPREHENSION') {
    try {
      const parsed = JSON.parse(q.correct_answer) as {
        questions?: Array<{ text: string; options: string[]; correct: string }>;
        options?: string[];
        correct?: string;
      };
      if (Array.isArray(parsed.questions)) {
        base.reading_questions = parsed.questions.map((rq) => {
          const idx = rq.options.indexOf(rq.correct);
          return {
            text: rq.text,
            options: rq.options as [string, string, string, string],
            correct_option: (LETTERS[idx] ?? 'A') as OptionLetter,
          };
        });
      } else if (Array.isArray(parsed.options)) {
        // old format — backwards compat
        const idx = parsed.options.indexOf(parsed.correct ?? '');
        base.reading_questions = [{
          text: '',
          options: parsed.options as [string, string, string, string],
          correct_option: (LETTERS[idx] ?? 'A') as OptionLetter,
        }];
      }
    } catch { /* keep defaults */ }
  } else if (type === 'WRITING') {
    base.evaluation_instructions = q.correct_answer;
  } else {
    base.correct_answer = q.correct_answer;
  }

  return base;
}
