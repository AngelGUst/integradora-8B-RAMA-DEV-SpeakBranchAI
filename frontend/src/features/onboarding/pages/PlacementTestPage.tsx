import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCheck, BookOpen, Mic, Headphones, PenLine, Trophy, ArrowRight } from 'lucide-react';
import Logo from '@/shared/components/ui/Logo';
import type { CefrLevel } from '@/features/auth/types/auth.types';
import apiClient from '@/shared/api/client';

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

interface Question {
  id: number;
  level: CefrLevel;
  skill: 'Grammar' | 'Vocabulary' | 'Reading' | 'Idioms';
  text: string;
  options: string[];
  correct: number;
}

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 1,
    level: 'A1',
    skill: 'Grammar',
    text: 'Choose the correct article: "___ umbrella is on the table."',
    options: ['A', 'An', 'The', '(no article)'],
    correct: 1,
  },
  {
    id: 2,
    level: 'A1',
    skill: 'Vocabulary',
    text: 'What is the opposite of the word "hot"?',
    options: ['Big', 'Cold', 'Fast', 'Dark'],
    correct: 1,
  },
  {
    id: 3,
    level: 'A2',
    skill: 'Grammar',
    text: 'Complete the sentence: "Yesterday, I ___ to the cinema with my friends."',
    options: ['go', 'going', 'went', 'gone'],
    correct: 2,
  },
  {
    id: 4,
    level: 'A2',
    skill: 'Vocabulary',
    text: 'What does the word "exhausted" mean?',
    options: ['Very excited', 'Very hungry', 'Very tired', 'Very happy'],
    correct: 2,
  },
  {
    id: 5,
    level: 'B1',
    skill: 'Grammar',
    text: 'Select the grammatically correct sentence:',
    options: [
      'If I will have money, I buy a car.',
      'If I had money, I would buy a car.',
      'If I have money, I had bought a car.',
      'If I would have money, I will buy a car.',
    ],
    correct: 1,
  },
  {
    id: 6,
    level: 'B1',
    skill: 'Grammar',
    text: 'Fill in the blank: "By the time she arrived, the guests ___ already left."',
    options: ['have', 'has', 'had', 'having'],
    correct: 2,
  },
  {
    id: 7,
    level: 'B2',
    skill: 'Vocabulary',
    text: "The company's new strategy proved highly ___ in reducing operational costs.",
    options: ['efficient', 'effected', 'affective', 'deficient'],
    correct: 0,
  },
  {
    id: 8,
    level: 'B2',
    skill: 'Grammar',
    text: 'Which option correctly uses the passive voice? "The new policy ___ last month."',
    options: ['announced', 'was announced', 'has announced', 'were announcing'],
    correct: 1,
  },
  {
    id: 9,
    level: 'C1',
    skill: 'Vocabulary',
    text: 'Choose the most precise word: "His ___ address moved the entire audience to tears."',
    options: ['eloquent', 'loquacious', 'verbose', 'garrulous'],
    correct: 0,
  },
  {
    id: 10,
    level: 'C2',
    skill: 'Idioms',
    text: '"To burn the midnight oil" means:',
    options: [
      'To accidentally start a fire',
      'To stay up late working or studying',
      'To waste expensive resources carelessly',
      'To work in darkness without electricity',
    ],
    correct: 1,
  },
];

const SKILL_ICONS = {
  Grammar: <PenLine size={12} />,
  Vocabulary: <BookOpen size={12} />,
  Reading: <BookOpen size={12} />,
  Idioms: <Mic size={12} />,
};

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
  question: Question;
  current: number;
  total: number;
  selected: number | null;
  onSelect: (i: number) => void;
  onNext: () => void;
  isLast: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function QuizScreen({ question, current, total, selected, onSelect, onNext, isLast }: QuizScreenProps) {
  const progress = ((current + 1) / total) * 100;

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
            {/* Skill tag */}
            <div className="mb-5 flex items-center gap-1.5">
              <span className="text-slate-500">{SKILL_ICONS[question.skill]}</span>
              <span className="text-xs font-medium text-slate-500">{question.skill}</span>
            </div>

            {/* Question */}
            <h2 className="mb-6 text-lg font-semibold leading-snug text-white sm:text-xl">
              {question.text}
            </h2>

            {/* Options */}
            <div className="space-y-2.5">
              {question.options.map((opt, i) => {
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

            {/* Next button */}
            <motion.div
              className="mt-6 flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: selected !== null ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                onClick={onNext}
                disabled={selected === null}
                className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500/20 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"
                whileHover={selected !== null ? { scale: 1.02 } : {}}
                whileTap={selected !== null ? { scale: 0.97 } : {}}
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
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>(FALLBACK_QUESTIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadQuestions = async () => {
      try {
        const { data } = await apiClient.get<{ questions: Question[] }>('/questions/diagnostic/');
        if (!isMounted) return;
        const incoming = data?.questions?.length ? data.questions : FALLBACK_QUESTIONS;
        setQuestions(incoming);
        setAnswers(Array(incoming.length).fill(null));
      } catch {
        if (!isMounted) return;
        setQuestions(FALLBACK_QUESTIONS);
        setAnswers(Array(FALLBACK_QUESTIONS.length).fill(null));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadQuestions();
    return () => {
      isMounted = false;
    };
  }, []);

  const question = questions[current];
  const isLast = current === questions.length - 1;

  const correctCount = answers.filter(
    (a, i) => a !== null && a === questions[i]?.correct
  ).length;
  const determinedLevel = scoreToCefr(correctCount);

  function handleSelect(idx: number) {
    setSelected(idx);
  }

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[current] = selected;
    setAnswers(newAnswers);
    setSelected(null);

    if (isLast) {
      setScreen('result');
    } else {
      setCurrent(c => c + 1);
    }
  }

  function handleFinish() {
    localStorage.setItem(PLACEMENT_KEY, 'true');
    void apiClient.post('/auth/diagnostic/complete/', { level: determinedLevel }).finally(() => {
      navigate('/learn', { replace: true });
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
        {screen === 'quiz' && !isLoading && (
          <QuizScreen
            key="quiz"
            question={question}
            current={current}
            total={questions.length}
            selected={selected}
            onSelect={handleSelect}
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
