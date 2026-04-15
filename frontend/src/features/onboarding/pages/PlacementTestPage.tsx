import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCheck, BookOpen, Mic, Headphones, PenLine, Trophy, ArrowRight } from 'lucide-react';
import Logo from '@/shared/components/ui/Logo';
import type { CefrLevel } from '@/features/auth/types/auth.types';
import type { Question as ApiQuestion, QuestionType } from '@/types/question';
import apiClient from '@/shared/api/client';
import { questionsApi } from '@/features/questions/api/questionsApi';

// ── Constants ─────────────────────────────────────────────────

export const PLACEMENT_KEY = 'sb_placement_done';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── CEFR metadata ─────────────────────────────────────────────

const CEFR_META: Record<CefrLevel, {
  color: string;
  bg: string;
  border: string;
  title: string;
  description: string;
  icon: string;
}> = {
  A1: {
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.25)',
    title: 'Beginner',
    description: 'You know basic words and phrases. Every journey starts with the first step.',
    icon: '🌱',
  },
  A2: {
    color: '#6ee7b7',
    bg: 'rgba(110,231,183,0.08)',
    border: 'rgba(110,231,183,0.25)',
    title: 'Elementary',
    description: 'You can handle simple conversations and understand familiar topics.',
    icon: '🌿',
  },
  B1: {
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.25)',
    title: 'Intermediate',
    description: 'You can communicate in most everyday situations and express opinions.',
    icon: '🌊',
  },
  B2: {
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.25)',
    title: 'Upper-Intermediate',
    description: 'You communicate with fluency and ease on a wide range of topics.',
    icon: '⚡',
  },
  C1: {
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.25)',
    title: 'Advanced',
    description: 'You use complex language effectively and express yourself spontaneously.',
    icon: '🔥',
  },
  C2: {
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.08)',
    border: 'rgba(244,114,182,0.25)',
    title: 'Mastery',
    description: 'You understand virtually everything you read or hear with effortless precision.',
    icon: '👑',
  },
};

// ── Question bank ─────────────────────────────────────────────

interface PlacementQuestion {
  id: number;
  level: CefrLevel;
  type: QuestionType;
  text: string;
  mode: 'mcq' | 'open';
  options?: string[];
  correctIndex?: number;
  expectedAnswer?: string;
}
const TYPE_ICONS: Record<QuestionType, ReactNode> = {
  SPEAKING: <Mic size={12} />,
  READING: <BookOpen size={12} />,
  LISTENING_SHADOWING: <Headphones size={12} />,
  LISTENING_COMPREHENSION: <Headphones size={12} />,
  WRITING: <PenLine size={12} />,
};

function parseDiagnosticAnswer(payload: string | null | undefined): {
  options: string[];
  correctIndex: number;
} | null {
  if (!payload) return null;
  try {
    const data = JSON.parse(payload) as { options?: string[]; correct?: string };
    if (!Array.isArray(data.options) || data.options.length < 2) return null;
    if (!data.correct || !data.options.includes(data.correct)) return null;
    return { options: data.options, correctIndex: data.options.indexOf(data.correct) };
  } catch {
    return null;
  }
}

function mapToPlacementQuestion(question: ApiQuestion): PlacementQuestion | null {
  const parsed = parseDiagnosticAnswer(question.correct_answer);
  if (parsed) {
    return {
      id: question.id,
      level: question.level,
      type: question.type,
      text: question.text,
      mode: 'mcq',
      options: parsed.options,
      correctIndex: parsed.correctIndex,
    };
  }
  return {
    id: question.id,
    level: question.level,
    type: question.type,
    text: question.text,
    mode: 'open',
    expectedAnswer: question.correct_answer ?? '',
  };
}

type AnswerState =
  | { kind: 'mcq'; selected: number | null; isCorrect?: boolean }
  | { kind: 'open'; response: string; isCorrect?: boolean };

function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function evaluateOpenAnswer(type: QuestionType, response: string, expected?: string): boolean | undefined {
  if (!expected) return undefined;
  if (type === 'SPEAKING' || type === 'LISTENING_SHADOWING') {
    return normalizeAnswer(response) === normalizeAnswer(expected);
  }
  return undefined;
}

// ── CEFR from score ───────────────────────────────────────────

function scoreToCefr(correct: number): CefrLevel {
  if (correct <= 1) return 'A1';
  if (correct <= 3) return 'A2';
  if (correct <= 5) return 'B1';
  if (correct <= 7) return 'B2';
  if (correct <= 9) return 'C1';
  return 'C2';
}

// ── Sub-screens ───────────────────────────────────────────────

type Screen = 'welcome' | 'quiz' | 'result';

const FEATURES = [
  { icon: <CheckCheck size={14} />, label: '10 questions' },
  { icon: <Headphones size={14} />, label: '~5 minutes' },
  { icon: <Trophy size={14} />, label: 'CEFR result' },
];

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mb-8"
      >
        <Logo size="md" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        className="max-w-md space-y-4"
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-1.5 text-xs font-semibold text-emerald-400">
          <BookOpen size={12} />
          Evaluación de Nivel · CEFR
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white leading-tight">
          Descubre tu nivel<br />
          <span className="text-emerald-400">de inglés</span>
        </h1>

        <p className="text-sm leading-relaxed text-slate-400">
          Responde 10 preguntas cuidadosamente diseñadas para determinar
          tu posición en el Marco Europeo de Referencia para las Lenguas.
        </p>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        className="mt-8 flex items-center gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
      >
        {FEATURES.map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-slate-400"
          >
            <span className="text-emerald-400">{icon}</span>
            {label}
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        onClick={onStart}
        className="group mt-8 flex items-center gap-2.5 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-bold text-[#07090F] shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-95"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        Comenzar evaluación
        <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </motion.button>

      <motion.p
        className="mt-5 text-xs text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Sin límite de tiempo · Puedes repetirla después
      </motion.p>
    </motion.div>
  );
}

// ── Quiz Screen ───────────────────────────────────────────────

interface QuizScreenProps {
  question: PlacementQuestion;
  current: number;
  total: number;
  selected: number | null;
  response: string;
  onSelect: (i: number) => void;
  onResponseChange: (value: string) => void;
  onNext: () => void;
  isLast: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function QuizScreen({
  question,
  current,
  total,
  selected,
  response,
  onSelect,
  onResponseChange,
  onNext,
  isLast,
}: QuizScreenProps) {
  const progress = ((current + 1) / total) * 100;
  const canContinue = question.mode === 'mcq'
    ? selected !== null
    : response.trim().length > 0;

  return (
    <motion.div
      className="relative z-10 flex min-h-screen flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/[0.06]">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: `${((current) / total) * 100}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {current + 1} <span className="text-slate-700">/ {total}</span>
          </span>
          {/* Level badge */}
          <div
            className="rounded-md border px-2.5 py-1 text-[11px] font-bold"
            style={{
              color: CEFR_META[question.level].color,
              borderColor: CEFR_META[question.level].border,
              background: CEFR_META[question.level].bg,
            }}
          >
            {question.level}
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            className="w-full max-w-xl"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {/* Type tag */}
            <div className="mb-5 flex items-center gap-1.5">
              <span className="text-slate-500">{TYPE_ICONS[question.type]}</span>
              <span className="text-xs font-medium text-slate-500">{question.type}</span>
            </div>

            {/* Question */}
            <h2 className="mb-6 text-lg font-semibold leading-snug text-white sm:text-xl">
              {question.text}
            </h2>

            {/* Answer */}
            {question.mode === 'mcq' && (
              <div className="space-y-2.5">
                {(question.options ?? []).map((opt, i) => {
                  const isSelected = selected === i;
                  return (
                    <motion.button
                      key={i}
                      onClick={() => onSelect(i)}
                      className="group relative w-full overflow-hidden rounded-xl border px-4 py-3.5 text-left text-sm transition-all"
                      style={{
                        borderColor: isSelected
                          ? 'rgba(16,185,129,0.5)'
                          : 'rgba(255,255,255,0.07)',
                        background: isSelected
                          ? 'rgba(16,185,129,0.08)'
                          : 'rgba(255,255,255,0.025)',
                      }}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Letter badge */}
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-all"
                          style={{
                            borderColor: isSelected
                              ? 'rgba(16,185,129,0.5)'
                              : 'rgba(255,255,255,0.1)',
                            color: isSelected ? '#10b981' : 'rgba(255,255,255,0.4)',
                            background: isSelected
                              ? 'rgba(16,185,129,0.15)'
                              : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          {OPTION_LABELS[i]}
                        </span>
                        <span className={`transition-colors ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                          {opt}
                        </span>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <motion.div
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
            {question.mode === 'open' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Escribe tu respuesta para continuar.
                </p>
                <textarea
                  value={response}
                  onChange={(event) => onResponseChange(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none transition focus:border-emerald-500/50"
                  placeholder="Tu respuesta aquí"
                />
              </div>
            )}

            {/* Next button */}
            <motion.div
              className="mt-6 flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: canContinue ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                onClick={onNext}
                disabled={!canContinue}
                className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500/20 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"
                whileHover={canContinue ? { scale: 1.02 } : {}}
                whileTap={canContinue ? { scale: 0.97 } : {}}
              >
                {isLast ? 'Ver resultado' : 'Siguiente'}
                <ArrowRight size={15} />
              </motion.button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function QuizLoading() {
  return (
    <motion.div
      className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/[0.06] border-t-emerald-500" />
      <p className="text-xs text-slate-500">Cargando evaluación…</p>
    </motion.div>
  );
}

// ── Result Screen ─────────────────────────────────────────────

interface ResultScreenProps {
  level: CefrLevel;
  correct: number;
  total: number;
  onFinish: () => void;
}

const CEFR_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function ResultScreen({ level, correct, total, onFinish }: ResultScreenProps) {
  const meta = CEFR_META[level];
  const levelIndex = CEFR_ORDER.indexOf(level);
  const percentage = Math.round((correct / total) * 100);

  return (
    <motion.div
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background glow */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: `${meta.color}18` }}
        />
      </motion.div>

      <div className="relative w-full max-w-md text-center">
        {/* Trophy / icon */}
        <motion.div
          className="mb-6 text-5xl"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 20 }}
        >
          {meta.icon}
        </motion.div>

        {/* "Tu nivel es" */}
        <motion.p
          className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
        >
          Tu nivel de inglés es
        </motion.p>

        {/* Level badge */}
        <motion.div
          className="mb-2 inline-flex items-center gap-3 rounded-2xl border px-8 py-4"
          style={{ borderColor: meta.border, background: meta.bg }}
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: EASE }}
        >
          <span className="text-5xl font-black" style={{ color: meta.color }}>
            {level}
          </span>
          <div className="text-left">
            <div className="text-base font-bold text-white">{meta.title}</div>
            <div className="text-xs text-slate-500">Marco CEFR</div>
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          className="mt-4 text-sm leading-relaxed text-slate-400"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {meta.description}
        </motion.p>

        {/* Score & CEFR scale */}
        <motion.div
          className="mt-7 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {/* Score row */}
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">Respuestas correctas</span>
            <span className="font-bold text-white">
              {correct}<span className="text-slate-600">/{total}</span>
              <span className="ml-2 text-xs" style={{ color: meta.color }}>{percentage}%</span>
            </span>
          </div>

          {/* CEFR scale visual */}
          <div className="flex items-center gap-1.5">
            {CEFR_ORDER.map((lvl, i) => {
              const isActive = i <= levelIndex;
              const isCurrent = lvl === level;
              const m = CEFR_META[lvl];
              return (
                <motion.div
                  key={lvl}
                  className="flex flex-1 flex-col items-center gap-1"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 + i * 0.07, duration: 0.35 }}
                >
                  <div
                    className="h-1.5 w-full rounded-full transition-all"
                    style={{
                      background: isActive ? m.color : 'rgba(255,255,255,0.07)',
                      opacity: isActive ? 1 : 0.4,
                    }}
                  />
                  <span
                    className="text-[10px] font-bold transition-all"
                    style={{
                      color: isCurrent ? m.color : isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    {lvl}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.button
          onClick={onFinish}
          className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold text-[#07090F] shadow-lg transition-all active:scale-95"
          style={{
            background: meta.color,
            boxShadow: `0 8px 32px ${meta.color}30`,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          Comenzar mi ruta de aprendizaje
          <ArrowRight size={15} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────

export default function PlacementTestPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('welcome');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [response, setResponse] = useState('');
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await questionsApi.getDiagnosticQuestions();
        if (!isMounted) return;
        const incoming = data
          .map(mapToPlacementQuestion)
          .filter((item): item is PlacementQuestion => Boolean(item));
        if (!incoming.length) {
          setQuestions([]);
          setAnswers([]);
          setError('No diagnostic questions are available yet.');
          return;
        }
        setQuestions(incoming);
        setAnswers(
          incoming.map((item) => (
            item.mode === 'mcq'
              ? { kind: 'mcq', selected: null }
              : { kind: 'open', response: '' }
          )),
        );
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load diagnostic questions.';
        setQuestions([]);
        setAnswers([]);
        setError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    const currentAnswer = answers[current];
    if (!currentAnswer) return;
    if (currentAnswer.kind === 'mcq') {
      setSelected(currentAnswer.selected);
      setResponse('');
    } else {
      setSelected(null);
      setResponse(currentAnswer.response);
    }
  }, [answers, current]);

  const question = questions[current];
  const isLast = current === questions.length - 1;

  const correctCount = answers.filter((answer) => answer?.isCorrect).length;
  const determinedLevel = scoreToCefr(correctCount);

  function handleSelect(idx: number) {
    setSelected(idx);
  }

  function handleNext() {
    const question = questions[current];
    if (!question) return;
    const newAnswers = [...answers];

    if (question.mode === 'mcq') {
      if (selected === null) return;
      newAnswers[current] = {
        kind: 'mcq',
        selected,
        isCorrect: selected === question.correctIndex,
      };
      setSelected(null);
    } else {
      const trimmed = response.trim();
      if (!trimmed) return;
      newAnswers[current] = {
        kind: 'open',
        response: trimmed,
        isCorrect: evaluateOpenAnswer(question.type, trimmed, question.expectedAnswer),
      };
      setResponse('');
    }

    setAnswers(newAnswers);

    if (isLast) {
      setScreen('result');
    } else {
      setCurrent(c => c + 1);
    }
  }

  function handleFinish() {
    localStorage.setItem(PLACEMENT_KEY, 'true');
    void apiClient.post('/auth/diagnostic/complete/', { level: determinedLevel }).finally(() => {
      navigate('/dashboard', { replace: true });
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090F]">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[20%] top-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <div className="absolute right-[15%] bottom-0 h-[400px] w-[400px] translate-y-1/2 rounded-full bg-violet-600/[0.06] blur-[100px]" />
        <div className="absolute inset-0 bg-dot opacity-40" />
      </div>

      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
          <WelcomeScreen
            key="welcome"
            onStart={() => setScreen('quiz')}
          />
        )}
        {screen === 'quiz' && isLoading && (
          <QuizLoading />
        )}
        {screen === 'quiz' && !isLoading && error && (
          <div className="mx-auto mt-28 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            <p className="text-lg font-semibold">No pudimos cargar el diagnóstico.</p>
            <p className="mt-2 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey(prev => prev + 1)}
              className="mt-5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold"
            >
              Reintentar
            </button>
          </div>
        )}
        {screen === 'quiz' && !isLoading && !error && question && (
          <QuizScreen
            key="quiz"
            question={question}
            current={current}
            total={questions.length}
            selected={selected}
            response={response}
            onSelect={handleSelect}
            onResponseChange={setResponse}
            onNext={handleNext}
            isLast={isLast}
          />
        )}
        {screen === 'result' && (
          <ResultScreen
            key="result"
            level={determinedLevel}
            correct={correctCount}
            total={questions.length}
            onFinish={handleFinish}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
