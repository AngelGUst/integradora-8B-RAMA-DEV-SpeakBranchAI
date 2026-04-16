/**
 * LevelExamPage — SpeakBranch AI
 *
 * Diseño idéntico al diagnóstico: intro → quiz → resultado.
 * Las respuestas se recopilan localmente y se envían todas al final.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ArrowRight, Trophy, AlertCircle,
  Volume2, Mic, BookOpen, Headphones, PenLine, Clock, CheckCheck,
} from 'lucide-react';
import Logo from '@/shared/components/ui/Logo';
import { examService } from '@/services/examService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Exam, ExamQuestion, ExamStartResponse } from '@/types/exam';

// ── Constants ─────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ── CEFR palette (mirrors PlacementTestPage) ──────────────────────────────────

const CEFR_META: Record<string, {
  color: string; bg: string; border: string; title: string; icon: string;
}> = {
  A1: { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)',  title: 'Beginner',           icon: '🌱' },
  A2: { color: '#6ee7b7', bg: 'rgba(110,231,183,0.08)', border: 'rgba(110,231,183,0.25)', title: 'Elementary',         icon: '🌿' },
  B1: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.25)',  title: 'Intermediate',       icon: '🌊' },
  B2: { color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.25)', title: 'Upper-Intermediate', icon: '⚡' },
  C1: { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', title: 'Advanced',           icon: '🔥' },
  C2: { color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.25)', title: 'Mastery',            icon: '👑' },
};

const NEXT_LEVEL: Record<string, string> = {
  A1: 'A2', A2: 'B1', B1: 'B2', B2: 'C1', C1: 'C2',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMCQOptions(question: ExamQuestion): string[] {
  if (Array.isArray(question.options) && question.options.length >= 2) {
    return question.options;
  }
  try {
    const data = JSON.parse(question.correct_answer) as any;
    if (Array.isArray(data?.questions?.[0]?.options)) return data.questions[0].options;
    if (Array.isArray(data?.options)) return data.options;
  } catch { /* ignore */ }
  return [];
}

function playAudio(question: ExamQuestion) {
  if (question.audio_url) {
    const audio = new Audio(question.audio_url);
    void audio.play().catch(() => {});
    return;
  }
  const text = question.phonetic_text || question.text;
  if (!text || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

type ExamScreen = 'loading' | 'intro' | 'quiz' | 'submitting' | 'result' | 'error';

// ── Spinner ───────────────────────────────────────────────────────────────────

function LoadingScreen({ message = 'Cargando examen…' }: { message?: string }) {
  return (
    <motion.div
      className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/6 border-t-emerald-500" />
      <p className="text-xs text-slate-500">{message}</p>
    </motion.div>
  );
}

// ── Intro Screen ──────────────────────────────────────────────────────────────

function IntroScreen({
  exam,
  continuing,
  onStart,
}: {
  exam: Exam;
  continuing: boolean;
  onStart: () => void;
}) {
  const meta = CEFR_META[exam.level] ?? CEFR_META.A1;
  const nextLevel = NEXT_LEVEL[exam.level] ?? '?';

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
        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
          style={{ color: meta.color, borderColor: meta.border, background: meta.bg }}
        >
          <Trophy size={12} />
          Examen de Nivelación · CEFR
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white leading-tight">
          Sube de nivel<br />
          <span style={{ color: meta.color }}>{exam.level} → {nextLevel}</span>
        </h1>

        <p className="text-sm leading-relaxed text-slate-400">
          {exam.description ||
            `Demuestra tus conocimientos en ${exam.level} para avanzar al siguiente nivel. Necesitas ${exam.passing_score}% para aprobar.`}
        </p>
      </motion.div>

      <motion.div
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
      >
        {[
          { icon: <CheckCheck size={14} />, label: `${exam.question_count} preguntas` },
          { icon: <Clock size={14} />, label: `${exam.time_limit_minutes} minutos` },
          { icon: <Trophy size={14} />, label: `Aprobar con ${exam.passing_score}%` },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs text-slate-400"
          >
            <span style={{ color: meta.color }}>{icon}</span>
            {label}
          </div>
        ))}
      </motion.div>

      <motion.button
        onClick={onStart}
        className="group mt-8 flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-sm font-bold text-[#07090F] shadow-lg transition-all active:scale-95"
        style={{ background: meta.color, boxShadow: `0 8px 24px ${meta.color}30` }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        {continuing ? 'Continuar examen' : 'Comenzar examen'}
        <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </motion.button>

      <motion.p
        className="mt-5 text-xs text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {continuing ? 'Continuarás donde lo dejaste' : 'Puedes pausar y continuar después'}
      </motion.p>
    </motion.div>
  );
}

// ── MCQ Options ───────────────────────────────────────────────────────────────

function MCQOptions({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string | null;
  onSelect: (opt: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((opt, i) => {
        const isSelected = selected === opt;
        return (
          <motion.button
            key={i}
            onClick={() => onSelect(opt)}
            className="group relative w-full overflow-hidden rounded-xl border px-4 py-3.5 text-left text-sm transition-all"
            style={{
              borderColor: isSelected ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.07)',
              background: isSelected ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.025)',
            }}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-all"
                style={{
                  borderColor: isSelected ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)',
                  color: isSelected ? '#10b981' : 'rgba(255,255,255,0.4)',
                  background: isSelected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                }}
              >
                {OPTION_LABELS[i]}
              </span>
              <span className={`transition-colors ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                {opt}
              </span>
            </div>

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
  );
}

// ── Speaking Input ────────────────────────────────────────────────────────────

function SpeakingInput({
  question,
  answer,
  onAnswer,
}: {
  question: ExamQuestion;
  answer: string | null;
  onAnswer: (text: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      const fallback = window.prompt('Tu navegador no soporta grabación. Escribe tu respuesta:');
      if (fallback) onAnswer(fallback);
      return;
    }
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e: any) => onAnswer(e.results[0][0].transcript as string);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => recognitionRef.current?.stop();

  return (
    <div className="flex flex-col items-center gap-5">
      {question.audio_url && (
        <audio controls src={question.audio_url} className="w-full rounded-lg" />
      )}

      <motion.button
        onClick={isRecording ? stopRecording : startRecording}
        className={`flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold border transition-all ${
          isRecording
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            : 'bg-white/6 border-white/10 text-slate-200 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300'
        }`}
        animate={isRecording ? { scale: [1, 1.04, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <Mic size={18} />
        {isRecording ? 'Detener grabación' : 'Grabar respuesta'}
      </motion.button>

      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-xl border border-white/[0.07] bg-white/3 px-4 py-3"
        >
          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Tu respuesta</p>
          <p className="text-sm text-slate-200">{answer}</p>
        </motion.div>
      )}
    </div>
  );
}

// ── Writing Input ─────────────────────────────────────────────────────────────

function WritingInput({
  answer,
  onAnswer,
}: {
  answer: string | null;
  onAnswer: (text: string) => void;
}) {
  return (
    <textarea
      value={answer ?? ''}
      onChange={e => onAnswer(e.target.value)}
      placeholder="Escribe tu respuesta en inglés…"
      className="min-h-40 w-full rounded-xl border border-white/[0.07] bg-white/3 p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none resize-none transition-colors"
    />
  );
}

// ── Quiz Screen ───────────────────────────────────────────────────────────────

function QuizScreen({
  question,
  current,
  total,
  answer,
  onAnswer,
  onNext,
  onPrev,
  isLast,
  timeRemaining,
  examLevel,
}: {
  question: ExamQuestion;
  current: number;
  total: number;
  answer: string | null;
  onAnswer: (a: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
  timeRemaining: number;
  examLevel: string;
}) {
  const progress = ((current + 1) / total) * 100;
  const canContinue = !!answer?.trim();
  const meta = CEFR_META[examLevel] ?? CEFR_META.A1;
  const isUrgent = timeRemaining < 300 && timeRemaining > 0;

  const isMCQ      = ['READING', 'LISTENING_COMPREHENSION'].includes(question.question_type);
  const isSpeaking = ['SPEAKING', 'LISTENING_SHADOWING'].includes(question.question_type);
  const isWriting  = question.question_type === 'WRITING';
  const options    = parseMCQOptions(question);

  return (
    <motion.div
      className="relative z-10 flex min-h-screen flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/6">
        <motion.div
          className="h-full"
          style={{ background: meta.color }}
          initial={{ width: `${(current / total) * 100}%` }}
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

          {/* Timer */}
          <div
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold font-mono transition-colors ${
              isUrgent
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                : 'border-white/8 bg-white/4 text-slate-400'
            }`}
          >
            <Clock size={11} />
            {formatTime(timeRemaining)}
          </div>

          {/* Level badge */}
          <div
            className="rounded-md border px-2.5 py-1 text-[11px] font-bold"
            style={{ color: meta.color, borderColor: meta.border, background: meta.bg }}
          >
            {examLevel}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.question_id}
            className="w-full max-w-xl"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {/* Type tag */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-slate-500">
                {isMCQ ? <BookOpen size={12} /> : isSpeaking ? <Headphones size={12} /> : <PenLine size={12} />}
              </span>
              <span className="text-xs font-medium text-slate-500">{question.question_type}</span>

              {question.resource_requirements?.requires_audio && (
                <button
                  type="button"
                  onClick={() => playAudio(question)}
                  className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-300"
                >
                  <Volume2 size={11} /> Audio
                </button>
              )}
            </div>

            {/* Question text */}
            <h2 className="mb-6 text-lg font-semibold leading-snug text-white sm:text-xl">
              {question.text}
            </h2>

            {question.phonetic_text && (
              <p className="mb-4 text-sm italic text-slate-400">{question.phonetic_text}</p>
            )}

            {/* Answer input — no immediate feedback */}
            {isMCQ && (
              <MCQOptions options={options} selected={answer} onSelect={onAnswer} />
            )}
            {isSpeaking && (
              <SpeakingInput question={question} answer={answer} onAnswer={onAnswer} />
            )}
            {isWriting && (
              <WritingInput answer={answer} onAnswer={onAnswer} />
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <motion.button
                onClick={onPrev}
                disabled={current === 0}
                className="text-sm text-slate-600 hover:text-slate-400 disabled:opacity-0 transition-colors"
                whileHover={{ x: -2 }}
              >
                ← Anterior
              </motion.button>

              <motion.div
                animate={{ opacity: canContinue ? 1 : 0.3 }}
                transition={{ duration: 0.3 }}
              >
                <motion.button
                  onClick={onNext}
                  disabled={!canContinue}
                  className="flex items-center gap-2 rounded-xl bg-white/6 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500/20 hover:text-emerald-300 disabled:cursor-not-allowed"
                  whileHover={canContinue ? { scale: 1.02 } : {}}
                  whileTap={canContinue ? { scale: 0.97 } : {}}
                >
                  {isLast ? 'Finalizar examen' : 'Siguiente'}
                  <ArrowRight size={15} />
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────

function ResultScreen({
  passed,
  score,
  passingScore,
  scoreDelta,
  previousBestScore,
  examLevel,
  message,
  onFinish,
}: {
  passed: boolean;
  score: number;
  passingScore: number;
  scoreDelta: number;
  previousBestScore: number;
  examLevel: string;
  message: string;
  onFinish: () => void;
}) {
  const nextLevel   = NEXT_LEVEL[examLevel] ?? '?';
  const displayLevel = passed ? nextLevel : examLevel;
  const meta        = CEFR_META[displayLevel] ?? CEFR_META.A1;
  const glowColor   = passed ? meta.color : '#f43f5e';

  return (
    <motion.div
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient glow */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: `${glowColor}18` }}
        />
      </motion.div>

      <div className="relative w-full max-w-md text-center">
        {/* Icon */}
        <motion.div
          className="mb-6 text-5xl"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 20 }}
        >
          {passed ? meta.icon : '📚'}
        </motion.div>

        <motion.p
          className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
        >
          {passed ? '¡Felicidades! Subiste a' : 'Resultado del examen'}
        </motion.p>

        {/* Score badge */}
        <motion.div
          className="mb-2 inline-flex items-center gap-3 rounded-2xl border px-8 py-4"
          style={{
            borderColor: passed ? meta.border : 'rgba(244,63,94,0.25)',
            background:   passed ? meta.bg    : 'rgba(244,63,94,0.06)',
          }}
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: EASE }}
        >
          <span className="text-5xl font-black" style={{ color: glowColor }}>
            {score.toFixed(0)}%
          </span>
          <div className="text-left">
            <div className="text-base font-bold text-white">
              {passed ? `Nivel ${nextLevel} · ${meta.title}` : 'No aprobado'}
            </div>
            <div className="text-xs text-slate-500">
              {passed ? 'Marco CEFR' : `Mínimo requerido: ${passingScore}%`}
            </div>
          </div>
        </motion.div>

        <motion.p
          className="mt-4 text-sm leading-relaxed text-slate-400"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {message}
        </motion.p>

        {/* Stats card */}
        <motion.div
          className="mt-7 rounded-xl border border-white/[0.07] bg-white/3 p-4 space-y-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Tu puntuación</span>
            <span className="font-bold text-white">
              {score.toFixed(1)}%
              <span className="ml-2 text-xs" style={{ color: glowColor }}>
                {scoreDelta >= 0 ? '+' : ''}{scoreDelta.toFixed(1)} vs anterior
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Puntuación mínima</span>
            <span className="font-bold text-white">{passingScore}%</span>
          </div>

          {previousBestScore > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Mejor intento anterior</span>
              <span className="font-bold text-white">{previousBestScore.toFixed(1)}%</span>
            </div>
          )}

          {/* Score bar */}
          <div className="pt-1">
            <div className="h-1.5 w-full rounded-full bg-white/6 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: glowColor }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, score)}%` }}
                transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            {/* Passing score marker */}
            <div className="relative h-3">
              <div
                className="absolute -top-1.5 w-px h-4 bg-white/20"
                style={{ left: `${Math.min(100, passingScore)}%` }}
              />
              <span
                className="absolute -top-0.5 text-[9px] text-slate-600"
                style={{ left: `${Math.min(100, passingScore)}%`, transform: 'translateX(-50%)' }}
              >
                {passingScore}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.button
          onClick={onFinish}
          className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold shadow-lg transition-all active:scale-95"
          style={{
            background:   passed ? meta.color : '#64748b',
            color:        passed ? '#07090F'   : '#f8fafc',
            boxShadow:    passed ? `0 8px 32px ${meta.color}30` : 'none',
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {passed ? 'Continuar mi ruta de aprendizaje' : 'Volver a practicar'}
          <ArrowRight size={15} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LevelExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate   = useNavigate();
  const { refreshUser } = useAuth();

  const [screen,   setScreen]   = useState<ExamScreen>('loading');
  const [exam,     setExam]     = useState<Exam | null>(null);
  const [examData, setExamData] = useState<ExamStartResponse | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers,  setAnswers]  = useState<Record<string, string>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [error,    setError]    = useState<string | null>(null);
  const [result,   setResult]   = useState<{
    passed: boolean; score: number; passingScore: number;
    scoreDelta: number; previousBestScore: number; message: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep mutable refs so async functions always see latest values
  const answersRef     = useRef(answers);
  const timeElapsedRef = useRef(timeElapsed);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { timeElapsedRef.current = timeElapsed; }, [timeElapsed]);

  // Load exam on mount
  useEffect(() => {
    if (!examId) return;
    const load = async () => {
      try {
        const list  = await examService.getExams();
        const found = list.find(e => e.id === Number(examId));
        if (!found) { setError('Examen no encontrado'); setScreen('error'); return; }
        setExam(found);
        const start = await examService.startExam(found.id);
        setExamData(start);
        setScreen('intro');
      } catch (err: any) {
        setError(err.message ?? 'Error al cargar el examen');
        setScreen('error');
      }
    };
    void load();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examId]);

  // Auto-submit on time limit
  useEffect(() => {
    if (screen !== 'quiz' || !exam) return;
    if (timeElapsed >= exam.time_limit_minutes * 60) {
      void doSubmit();
    }
  }, [timeElapsed, screen, exam]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
  }, []);

  const doSubmit = async () => {
    if (!examData) return;
    setScreen('submitting');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    try {
      const response = await examService.submitExam(
        examData.attempt.id,
        answersRef.current,
        timeElapsedRef.current,
      );
      if (response.passed) await refreshUser();
      setResult({
        passed:            response.passed,
        score:             response.score,
        passingScore:      exam?.passing_score ?? 70,
        scoreDelta:        response.score_delta  ?? response.score,
        previousBestScore: response.previous_best_score ?? 0,
        message:           response.message,
      });
      setScreen('result');
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar el examen');
      setScreen('error');
    }
  };

  const handleAnswer = useCallback((answer: string) => {
    if (!examData) return;
    const qId = examData.questions[currentIdx]?.question_id;
    if (qId == null) return;
    setAnswers(prev => ({ ...prev, [qId]: answer }));
  }, [examData, currentIdx]);

  const handleNext = useCallback(() => {
    if (!examData) return;
    if (currentIdx === examData.questions.length - 1) {
      void doSubmit();
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  }, [examData, currentIdx]);

  const handlePrev = useCallback(() => {
    setCurrentIdx(prev => Math.max(0, prev - 1));
  }, []);

  const currentQuestion = examData?.questions[currentIdx] ?? null;
  const isLast          = examData ? currentIdx === examData.questions.length - 1 : false;
  const timeRemaining   = exam ? Math.max(0, exam.time_limit_minutes * 60 - timeElapsed) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090F]">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[20%] top-0 h-125 w-125 -translate-y-1/2 rounded-full bg-emerald-500/6 blur-[120px]" />
        <div className="absolute right-[15%] bottom-0 h-100 w-100 translate-y-1/2 rounded-full bg-violet-600/6 blur-[100px]" />
        <div className="absolute inset-0 bg-dot opacity-40" />
      </div>

      <AnimatePresence mode="wait">

        {/* Loading */}
        {screen === 'loading' && (
          <LoadingScreen key="loading" />
        )}

        {/* Intro */}
        {screen === 'intro' && exam && examData && (
          <IntroScreen
            key="intro"
            exam={exam}
            continuing={examData.continuing}
            onStart={() => { startTimer(); setScreen('quiz'); }}
          />
        )}

        {/* Quiz */}
        {screen === 'quiz' && currentQuestion && exam && (
          <QuizScreen
            key="quiz"
            question={currentQuestion}
            current={currentIdx}
            total={examData!.questions.length}
            answer={answers[currentQuestion.question_id] ?? null}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onPrev={handlePrev}
            isLast={isLast}
            timeRemaining={timeRemaining}
            examLevel={exam.level}
          />
        )}

        {/* Submitting */}
        {screen === 'submitting' && (
          <LoadingScreen key="submitting" message="Evaluando tus respuestas…" />
        )}

        {/* Result */}
        {screen === 'result' && result && exam && (
          <ResultScreen
            key="result"
            passed={result.passed}
            score={result.score}
            passingScore={result.passingScore}
            scoreDelta={result.scoreDelta}
            previousBestScore={result.previousBestScore}
            examLevel={exam.level}
            message={result.message}
            onFinish={() => navigate('/learn')}
          />
        )}

        {/* Error */}
        {screen === 'error' && (
          <motion.div
            key="error"
            className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={40} className="text-rose-500" />
            <p className="max-w-sm text-sm text-slate-400">{error}</p>
            <button
              onClick={() => navigate('/learn')}
              className="mt-2 rounded-xl bg-white/6 px-6 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.1] transition-colors"
            >
              Volver a la ruta
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
