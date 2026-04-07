/**
 * ExercisePage — SpeakBranch AI
 *
 * Functional exercise player. Each skill type has its own sub-player that
 * handles state internally. When the user finishes and clicks "Volver a la Ruta",
 * the parent persists XP + completion and navigates to /learn.
 *
 * Skill types:
 *  reading       — passage + MCQ, instant scoring
 *  speaking      — display phrase, record via Web Speech API, word-similarity score
 *  shadowing     — TTS audio (hidden phrase) → record → word-similarity score
 *  comprehension — TTS audio (max N replays) → MCQ, instant scoring
 */

import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Mic, Repeat, Headphones, PenLine,
  CheckCircle2, XCircle, Volume2, CircleStop, Loader2, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EXERCISES } from '../data/exerciseData';
import type {
  AnyExercise, ReadingExercise, SpeakingExercise, ComprehensionExercise, WritingExercise, MCQQuestion,
} from '../data/exerciseData';
import { useLearnProgress } from '@/shared/hooks/useLearnProgress';
import { questionsService } from '@/services/questionsService';
import type { WritingEvaluationResult, VocabularyWord } from '@/services/questionsService';
import type { Question } from '@/types/question';

// ─── Backend → Exercise transform ─────────────────────────────────────────────


function backendToExercise(q: Question): AnyExercise {
  const base = { id: String(q.id), level: q.level, maxXP: q.xp_max };

  if (q.type === 'SPEAKING') {
    return {
      ...base,
      type: 'speaking' as const,
      skill: 'speaking' as const,
      title: q.text.slice(0, 60),
      instruction: 'Lee la siguiente frase en voz alta en inglés con claridad.',
      phrase: q.text,
      translation: q.phonetic_text ?? '',
      audioUrl: q.audio_url ?? undefined,
    };
  }

  if (q.type === 'LISTENING_SHADOWING') {
    return {
      ...base,
      type: 'speaking' as const,
      skill: 'shadowing' as const,
      title: 'Listening · Shadowing',
      instruction: 'Escucha el audio con atención y luego repite exactamente lo que escuchas.',
      phrase: q.correct_answer,
      translation: q.text ?? '',
      audioUrl: q.audio_url ?? undefined,
    };
  }

  if (q.type === 'READING') {
    let questions: MCQQuestion[] = [];
    try {
      const parsed = JSON.parse(q.correct_answer) as {
        questions?: Array<{ text: string; options: string[]; correct: string }>;
        options?: string[];
        correct?: string;
      };
      if (Array.isArray(parsed.questions)) {
        questions = parsed.questions.map((rq, i) => {
          const idx = rq.options.indexOf(rq.correct);
          return {
            id: `q${i + 1}`,
            text: rq.text,
            options: rq.options as [string, string, string, string],
            correctIndex: (idx >= 0 ? idx : 0) as 0 | 1 | 2 | 3,
            explanation: `La respuesta correcta es: "${rq.correct}".`,
          };
        });
      } else if (Array.isArray(parsed.options)) {
        // old format — backwards compat
        const idx = parsed.options.indexOf(parsed.correct ?? '');
        questions = [{
          id: 'q1',
          text: '',
          options: parsed.options as [string, string, string, string],
          correctIndex: (idx >= 0 ? idx : 0) as 0 | 1 | 2 | 3,
          explanation: `La respuesta correcta es: "${parsed.correct}".`,
        }];
      }
    } catch { /* leave empty */ }
    return {
      ...base,
      type: 'reading' as const,
      skill: 'reading' as const,
      title: q.text.slice(0, 60),
      passage: q.text,
      questions,
    };
  }

  if (q.type === 'LISTENING_COMPREHENSION') {
    let questions: MCQQuestion[] = [];
    try {
      const parsed = JSON.parse(q.correct_answer) as {
        questions?: Array<{ text: string; options: string[]; correct: string }>;
        options?: string[];
        correct?: string;
      };
      if (Array.isArray(parsed.questions)) {
        questions = parsed.questions.map((rq, i) => {
          const idx = rq.options.indexOf(rq.correct);
          return {
            id: `q${i + 1}`,
            text: rq.text,
            options: rq.options as [string, string, string, string],
            correctIndex: (idx >= 0 ? idx : 0) as 0 | 1 | 2 | 3,
            explanation: `La respuesta correcta es: "${rq.correct}".`,
          };
        });
      } else if (Array.isArray(parsed.options)) {
        // old format — backwards compat
        const idx = parsed.options.indexOf(parsed.correct ?? '');
        questions = [{
          id: 'q1',
          text: q.text,
          options: parsed.options as [string, string, string, string],
          correctIndex: (idx >= 0 ? idx : 0) as 0 | 1 | 2 | 3,
          explanation: `La respuesta correcta es: "${parsed.correct}".`,
        }];
      }
    } catch { /* leave empty */ }
    return {
      ...base,
      type: 'comprehension' as const,
      skill: 'comprehension' as const,
      title: q.text || 'Listening · Comprensión',
      audioText: q.phonetic_text ?? '',
      audioUrl: q.audio_url ?? undefined,
      maxReplays: q.max_replays ?? 3,
      questions,
    };
  }

  // WRITING
  return {
    ...base,
    type: 'writing' as const,
    skill: 'writing' as const,
    title: q.text.slice(0, 60),
    prompt: q.text,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcXP(maxXP: number, score: number): number {
  return Math.round(maxXP * (score / 100));
}

/** Approximates RapidFuzz word-ratio for demo without backend */
function wordSimilarity(expected: string, actual: string): number {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  const exp  = norm(expected);
  const actS = new Set(norm(actual));
  if (!exp.length) return 0;
  const matches = exp.filter(w => actS.has(w)).length;
  return Math.min(100, Math.round((matches / exp.length) * 100));
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;

const SKILL_META = {
  reading:       { Icon: BookOpen,   label: 'Reading',                color: 'text-sky-400',     border: 'border-sky-500/30',     bg: 'bg-sky-500/10'    },
  speaking:      { Icon: Mic,        label: 'Speaking',               color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  shadowing:     { Icon: Repeat,     label: 'Listening · Shadowing',  color: 'text-violet-400',  border: 'border-violet-500/30',  bg: 'bg-violet-500/10'  },
  comprehension: { Icon: Headphones, label: 'Listening · Comprensión',color: 'text-amber-400',   border: 'border-amber-500/30',   bg: 'bg-amber-500/10'  },
  writing:       { Icon: PenLine,    label: 'Writing',                color: 'text-rose-400',    border: 'border-rose-500/30',    bg: 'bg-rose-500/10'   },
} as const;

// ─── Shared Result Screen ─────────────────────────────────────────────────────

interface QFeedback {
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
}

function ResultScreen({
  score,
  xp,
  feedback,
  transcript,
  expectedPhrase,
  onBack,
}: {
  score: number;
  xp: number;
  feedback?: QFeedback[];
  transcript?: string;
  expectedPhrase?: string;
  onBack: () => void;
}) {
  const accent =
    score >= 80 ? { ring: 'border-emerald-500/40', text: 'text-emerald-400' } :
    score >= 50 ? { ring: 'border-sky-500/40',     text: 'text-sky-400'     } :
                  { ring: 'border-amber-500/40',   text: 'text-amber-400'   };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Score card */}
      <div className={`border ${accent.ring} bg-zinc-900/50 rounded-2xl p-5 flex items-center gap-5`}>
        <div className={`w-20 h-20 rounded-full border-4 ${accent.ring} flex flex-col items-center justify-center shrink-0`}>
          <span className={`text-2xl font-black ${accent.text}`}>{score}</span>
          <span className="text-[10px] text-zinc-600">/100</span>
        </div>
        <div>
          <p className="text-zinc-400 text-sm mb-0.5">Ejercicio completado</p>
          <p className="text-2xl font-bold">
            +{xp} <span className="text-sm font-normal text-zinc-400">XP ganados</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {score >= 80 ? '¡Excelente! Sigue así.' :
             score >= 60 ? 'Buen trabajo. Practica para mejorar.' :
             'Sigue practicando para subir tu score.'}
          </p>
        </div>
      </div>

      {/* MCQ feedback */}
      {feedback && (
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Revisión de respuestas</p>
          {feedback.map((f, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 ${
                f.correct ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-red-500/20 bg-red-500/[0.04]'
              }`}
            >
              <div className="flex items-start gap-3">
                {f.correct
                  ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  : <XCircle     size={16} className="text-red-400 shrink-0 mt-0.5"     />
                }
                <div>
                  <p className="text-sm font-medium text-zinc-200">{f.question}</p>
                  {!f.correct && (
                    <p className="text-xs text-red-400 mt-0.5">
                      Tu respuesta: <span className="font-semibold">{f.yourAnswer}</span>
                    </p>
                  )}
                  <p className={`text-xs mt-0.5 ${f.correct ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {f.correct ? '✓ Correcto' : `Correcto: ${f.correctAnswer}`}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">{f.explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Speaking feedback */}
      {transcript !== undefined && expectedPhrase !== undefined && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Comparación de pronunciación</p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3 text-sm">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Lo que dijiste</p>
              <p className="text-zinc-300 italic">"{transcript || '— sin audio detectado —'}"</p>
            </div>
            <div className="h-px bg-zinc-800" />
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Texto esperado</p>
              <p className="text-zinc-200">"{expectedPhrase}"</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        <ArrowLeft size={15} />
        Volver a la Ruta
      </button>
    </motion.div>
  );
}

// ─── MCQ Option button (shared) ───────────────────────────────────────────────

function MCQOption({
  index, text, selected, accent = 'emerald', onClick,
}: {
  index: number; text: string; selected: boolean;
  accent?: 'emerald' | 'amber';
  onClick: () => void;
}) {
  const colors = {
    emerald: {
      active: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
      badge:  'bg-emerald-500 text-white',
    },
    amber: {
      active: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
      badge:  'bg-amber-500 text-white',
    },
  };
  const c = colors[accent];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm
        ${selected
          ? c.active
          : 'border-zinc-700 bg-zinc-800/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/70'
        }`}
    >
      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0
        ${selected ? c.badge : 'bg-zinc-700 text-zinc-400'}`}>
        {LETTERS[index]}
      </span>
      {text}
    </button>
  );
}

// ─── Reading Player ───────────────────────────────────────────────────────────

function ReadingPlayer({ ex, onComplete }: { ex: ReadingExercise; onComplete: (s: number, xp: number) => void }) {
  const [answers,   setAnswers]  = useState<Record<number, number>>({});
  const [submitted, setSubmit]   = useState(false);
  const [feedback,  setFeedback] = useState<QFeedback[]>([]);
  const [result,    setResult]   = useState({ score: 0, xp: 0 });

  const submit = () => {
    const fb: QFeedback[] = ex.questions.map((q, i) => ({
      question:      q.text,
      yourAnswer:    q.options[answers[i]] ?? '—',
      correctAnswer: q.options[q.correctIndex],
      correct:       answers[i] === q.correctIndex,
      explanation:   q.explanation,
    }));
    const score = Math.round((fb.filter(f => f.correct).length / fb.length) * 100);
    const xp    = calcXP(ex.maxXP, score);
    setFeedback(fb);
    setResult({ score, xp });
    setSubmit(true);
  };

  if (submitted) {
    return (
      <ResultScreen
        score={result.score} xp={result.xp}
        feedback={feedback}
        onBack={() => onComplete(result.score, result.xp)}
      />
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Texto de lectura</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{ex.passage}</p>
      </div>

      {ex.questions.map((q: MCQQuestion, qi) => (
        <div key={q.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-medium text-zinc-200 mb-3">
            <span className="text-zinc-500 mr-1.5">{qi + 1}.</span>{q.text}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {q.options.map((opt, oi) => (
              <MCQOption
                key={oi} index={oi} text={opt}
                selected={answers[qi] === oi}
                onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
              />
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={submit}
        disabled={answered < ex.questions.length}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Enviar respuestas ({answered}/{ex.questions.length})
      </button>
    </div>
  );
}

// ─── Speaking / Shadowing Player ──────────────────────────────────────────────

type RecPhase = 'idle' | 'recording' | 'processing' | 'done';

function SpeakingPlayer({ ex, onComplete }: { ex: SpeakingExercise; onComplete: (s: number, xp: number) => void }) {
  const [recPhase,    setRecPhase]   = useState<RecPhase>('idle');
  const [transcript,  setTranscript] = useState('');
  const [showResult,  setShowResult] = useState(false);
  const [audioPlayed, setAudioReady] = useState(ex.skill !== 'shadowing');
  const recRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check Web Speech API availability
  const SpeechAPI =
    (window as unknown as Record<string, unknown>).SpeechRecognition as typeof SpeechRecognition | undefined ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof SpeechRecognition | undefined;

  const playAudio = () => {
    if (ex.audioUrl) {
      audioRef.current?.pause();
      const audio = new Audio(ex.audioUrl);
      audioRef.current = audio;
      audio.onplay = () => setAudioReady(true);
      audio.onerror = () => setAudioReady(false);
      void audio.play();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(ex.phrase);
    u.lang = 'en-US'; u.rate = 0.82;
    u.onend = () => setAudioReady(true);
    u.onerror = () => setAudioReady(false);
    speechSynthesis.speak(u);
  };

  const startRec = () => {
    if (!SpeechAPI) return;
    setRecPhase('recording');
    setTranscript('');
    const r = new SpeechAPI();
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e: SpeechRecognitionEvent) => {
      setTranscript(e.results[0][0].transcript);
      setRecPhase('done');
    };
    r.onerror = () => setRecPhase('idle');
    r.start();
    recRef.current = r;
  };

  const stopRec = () => {
    recRef.current?.stop();
    setRecPhase('processing');
    setTimeout(() => setRecPhase(t => t === 'processing' ? 'idle' : t), 2000);
  };

  const score = showResult ? wordSimilarity(ex.phrase, transcript) : 0;
  const xp    = showResult ? calcXP(ex.maxXP, score) : 0;

  if (showResult) {
    return (
      <ResultScreen
        score={score} xp={xp}
        transcript={transcript}
        expectedPhrase={ex.phrase}
        onBack={() => onComplete(score, xp)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Shadowing: audio first */}
      {ex.skill === 'shadowing' && (
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
          <p className="text-[10px] text-violet-400 uppercase tracking-widest font-semibold mb-2">
            Paso 1 · Escucha el audio
          </p>
          <p className="text-sm text-zinc-400 mb-3">
            Escucha la frase. No verás el texto mientras grabas.
          </p>
          <button
            onClick={playAudio}
            className="flex items-center gap-2 text-sm font-medium text-violet-300 bg-violet-500/10 border border-violet-500/25 px-4 py-2 rounded-lg hover:bg-violet-500/20 transition-colors"
          >
            <Volume2 size={15} /> Reproducir audio
          </button>
          {audioPlayed && (
            <p className="text-xs text-zinc-600 mt-2">
              Audio listo. Ahora graba tu voz.
              <span
                className="ml-2 text-zinc-500 cursor-pointer underline underline-offset-2"
                title="Pasa el cursor para revelar"
              >
                (ver texto)
              </span>
              <span className="ml-1 blur-sm hover:blur-none transition-all select-none">
                {ex.phrase}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Speaking: show phrase */}
      {ex.skill === 'speaking' && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold mb-2">
            Frase a pronunciar
          </p>
          <p className="text-lg font-medium text-white leading-snug mb-1">"{ex.phrase}"</p>
          <p className="text-sm text-zinc-500 italic">{ex.translation}</p>
        </div>
      )}

      {/* Recorder */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
        {ex.skill === 'shadowing' && (
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-4">
            Paso 2 · Graba tu voz
          </p>
        )}
        {ex.skill === 'speaking' && (
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-4">
            Grabación de voz
          </p>
        )}

        {!SpeechAPI ? (
          <div className="text-center py-3">
            <p className="text-amber-400 text-sm mb-1">⚠ API de voz no disponible</p>
            <p className="text-zinc-500 text-xs mb-3">Usa Google Chrome o Microsoft Edge para grabar.</p>
            <button
              onClick={() => setShowResult(true)}
              className="text-xs text-zinc-400 underline"
            >
              Continuar sin grabación
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <AnimatePresence mode="wait">
              {recPhase === 'idle' && (
                <motion.button
                  key="idle"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  onClick={startRec}
                  disabled={ex.skill === 'shadowing' && !audioPlayed}
                  className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Mic size={26} className="text-white" />
                </motion.button>
              )}
              {recPhase === 'recording' && (
                <motion.button
                  key="rec"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                  onClick={stopRec}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg shadow-red-500/25 transition-colors"
                >
                  <CircleStop size={26} className="text-white" />
                </motion.button>
              )}
              {recPhase === 'processing' && (
                <motion.div key="proc" className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Loader2 size={26} className="text-zinc-400 animate-spin" />
                </motion.div>
              )}
              {recPhase === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center"
                >
                  <CheckCircle2 size={26} className="text-emerald-400" />
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-zinc-500 text-center">
              {recPhase === 'idle'       && (ex.skill === 'shadowing' && !audioPlayed ? 'Reproduce el audio primero' : 'Pulsa para grabar')}
              {recPhase === 'recording'  && <span className="text-red-400 animate-pulse">● Grabando… pulsa para detener</span>}
              {recPhase === 'processing' && 'Procesando audio…'}
              {recPhase === 'done'       && (
                <span className="text-emerald-400">
                  Grabación lista{transcript ? `: "${transcript.slice(0, 40)}${transcript.length > 40 ? '…' : ''}"` : ''}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowResult(true)}
        disabled={!!SpeechAPI && recPhase !== 'done'}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Ver resultado
      </button>
    </div>
  );
}

// ─── Comprehension Player ─────────────────────────────────────────────────────

function ComprehensionPlayer({ ex, onComplete }: { ex: ComprehensionExercise; onComplete: (s: number, xp: number) => void }) {
  const [replaysLeft, setReplays]  = useState(ex.maxReplays);
  const [audioPlayed, setPlayed]   = useState(false);
  const [quizMode,    setQuiz]     = useState(false);
  const [answers,     setAnswers]  = useState<Record<number, number>>({});
  const [submitted,   setSubmit]   = useState(false);
  const [feedback,    setFeedback] = useState<QFeedback[]>([]);
  const [result,      setResult]   = useState({ score: 0, xp: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAudio = Boolean(ex.audioUrl || ex.audioText?.trim());

  const playAudio = () => {
    if (replaysLeft <= 0) return;
    if (ex.audioUrl) {
      audioRef.current?.pause();
      const audio = new Audio(ex.audioUrl);
      audioRef.current = audio;
      audio.onplay = () => setPlayed(true);
      audio.onerror = () => setPlayed(false);
      void audio.play();
      setReplays(p => p - 1);
      return;
    }
    if (!ex.audioText?.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(ex.audioText);
    u.lang = 'en-US'; u.rate = 0.82;
    u.onend = () => setPlayed(true);
    u.onerror = () => setPlayed(false);
    speechSynthesis.speak(u);
    setReplays(p => p - 1);
  };

  const submit = () => {
    window.speechSynthesis.cancel();
    const fb: QFeedback[] = ex.questions.map((q, i) => ({
      question:      q.text,
      yourAnswer:    q.options[answers[i]] ?? '—',
      correctAnswer: q.options[q.correctIndex],
      correct:       answers[i] === q.correctIndex,
      explanation:   q.explanation,
    }));
    const score = Math.round((fb.filter(f => f.correct).length / fb.length) * 100);
    const xp    = calcXP(ex.maxXP, score);
    setFeedback(fb); setResult({ score, xp }); setSubmit(true);
  };

  if (submitted) {
    return (
      <ResultScreen
        score={result.score} xp={result.xp}
        feedback={feedback}
        onBack={() => onComplete(result.score, result.xp)}
      />
    );
  }

  if (!quizMode) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold mb-2">Audio del ejercicio</p>
          <p className="text-sm text-zinc-400 mb-4">
            Escucha el audio. Tienes <strong className="text-amber-400">{ex.maxReplays}</strong> reproducción(es) disponibles.
            No podrás escucharlo al contestar.
          </p>
          {!hasAudio && (
            <p className="text-xs text-amber-300">Audio no disponible. Contacta al admin para cargar el audio o el texto TTS.</p>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={playAudio}
              disabled={!hasAudio || replaysLeft <= 0}
              className="flex items-center gap-2 text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/25 px-4 py-2 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Volume2 size={15} /> Reproducir audio
            </button>
            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              {replaysLeft} / {ex.maxReplays} restante{replaysLeft !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <button
          onClick={() => { window.speechSynthesis.cancel(); setQuiz(true); }}
          disabled={hasAudio && !audioPlayed}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Responder preguntas →
        </button>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-600">Audio no disponible. Responde con lo que recuerdas.</p>
      {ex.questions.map((q: MCQQuestion, qi) => (
        <div key={q.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-medium text-zinc-200 mb-3">
            <span className="text-zinc-500 mr-1.5">{qi + 1}.</span>{q.text}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {q.options.map((opt, oi) => (
              <MCQOption
                key={oi} index={oi} text={opt}
                selected={answers[qi] === oi}
                accent="amber"
                onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
              />
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={submit}
        disabled={answered < ex.questions.length}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Enviar respuestas ({answered}/{ex.questions.length})
      </button>
    </div>
  );
}

// ─── Writing Player ───────────────────────────────────────────────────────────

function WritingPlayer({ ex, onComplete }: { ex: WritingExercise; onComplete: (s: number, xp: number) => void }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<WritingEvaluationResult | null>(null);

  const submit = async () => {
    if (!text.trim() || text.trim().length < 10) return;
    setLoading(true);
    setError(null);
    try {
      const res = await questionsService.evaluateWriting(Number(ex.id), text.trim());
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al evaluar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const accent =
      result.score >= 80 ? { ring: 'border-emerald-500/40', text: 'text-emerald-400' } :
      result.score >= 50 ? { ring: 'border-sky-500/40',     text: 'text-sky-400'     } :
                           { ring: 'border-amber-500/40',   text: 'text-amber-400'   };

    const criteria = [
      { label: 'Gramática',   value: result.score_grammar,    weight: '35%' },
      { label: 'Vocabulario', value: result.score_vocabulary, weight: '25%' },
      { label: 'Coherencia',  value: result.score_coherence,  weight: '25%' },
      { label: 'Ortografía',  value: result.score_spelling,   weight: '15%' },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Score card */}
        <div className={`border ${accent.ring} bg-zinc-900/50 rounded-2xl p-5 flex items-center gap-5`}>
          <div className={`w-20 h-20 rounded-full border-4 ${accent.ring} flex flex-col items-center justify-center shrink-0`}>
            <span className={`text-2xl font-black ${accent.text}`}>{result.score}</span>
            <span className="text-[10px] text-zinc-600">/100</span>
          </div>
          <div>
            <p className="text-zinc-400 text-sm mb-0.5">Ejercicio completado</p>
            <p className="text-2xl font-bold">
              +{result.xp_earned} <span className="text-sm font-normal text-zinc-400">XP ganados</span>
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {result.score >= 80 ? '¡Excelente! Sigue así.' :
               result.score >= 60 ? 'Buen trabajo. Practica para mejorar.' :
               'Sigue practicando para subir tu score.'}
            </p>
          </div>
        </div>

        {/* Criteria breakdown */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Desglose por criterio</p>
          {criteria.map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-24 shrink-0">{c.label}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500/70 rounded-full transition-all duration-700"
                  style={{ width: `${c.value}%` }}
                />
              </div>
              <span className="text-xs font-mono text-zinc-400 w-8 text-right">{Math.round(c.value)}</span>
              <span className="text-[10px] text-zinc-600 w-8">{c.weight}</span>
            </div>
          ))}
        </div>

        {/* AI Feedback */}
        {result.feedback && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Feedback de la IA</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{result.feedback}</p>
          </div>
        )}

        {/* Your text */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Tu respuesta</p>
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>

        <button
          onClick={() => onComplete(result.score, result.xp_earned)}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          <ArrowLeft size={15} />
          Volver a la Ruta
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Instrucción</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{ex.prompt}</p>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">
          Tu respuesta
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Escribe tu respuesta aquí..."
          className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none px-4 py-3 text-sm resize-none transition-colors"
        />
        <p className="text-[11px] text-zinc-600 mt-1 text-right">{text.length} caracteres</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/20">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading || text.trim().length < 10}
        className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Evaluando con IA…</>
        ) : (
          'Enviar para evaluar'
        )}
      </button>
    </div>
  );
}

// ─── Vocabulary Reveal Screen ─────────────────────────────────────────────────

function VocabularyRevealScreen({ words, onContinue }: { words: VocabularyWord[]; onContinue: () => void }) {
  const [speaking, setSpeaking] = useState<number | null>(null);

  const playWord = (id: number, word: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.82;
    u.onend = () => setSpeaking(null);
    u.onerror = () => setSpeaking(null);
    setSpeaking(id);
    window.speechSynthesis.speak(u);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Vocabulario del ejercicio</p>
        <p className="text-lg font-bold text-zinc-100">Palabras clave</p>
        <p className="text-sm text-zinc-500 mt-0.5">Estas palabras han sido añadidas a tu vocabulario del día.</p>
      </div>

      <div className="space-y-3">
        {words.map((w) => (
          <div
            key={w.id}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[18px] font-black text-zinc-100 tracking-tight">{w.word}</span>
                <button
                  onClick={() => playWord(w.id, w.word)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    speaking === w.id
                      ? 'text-violet-400 bg-violet-500/10'
                      : 'text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10'
                  }`}
                  title="Escuchar pronunciación"
                >
                  <Volume2 size={14} />
                </button>
              </div>
              <span className="text-[11px] font-mono text-zinc-500 shrink-0">{w.level}</span>
            </div>
            {w.pronunciation && (
              <p className="text-[12px] text-violet-400/70 font-mono">{w.pronunciation}</p>
            )}
            <p className="text-[13px] text-zinc-300 leading-snug">{w.meaning}</p>
            {w.example_sentence && (
              <p className="text-[12px] text-zinc-500 italic leading-snug">"{w.example_sentence}"</p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        <ArrowLeft size={15} />
        Volver a la Ruta
      </button>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExercisePage() {
  const { id }               = useParams<{ id: string }>();
  const navigate             = useNavigate();
  const [searchParams]       = useSearchParams();
  const isAdminPreview       = searchParams.get('from') === 'admin';
  const { completeExercise } = useLearnProgress();

  const isNumericId = Boolean(id && Number.isInteger(Number(id)) && Number(id) > 0);
  const [exercise, setExercise] = useState<AnyExercise | undefined>(
    id ? EXERCISES[id] : undefined,
  );
  const [loading, setLoading] = useState(isNumericId);
  const [fetchError, setFetchError] = useState(false);
  const [started, setStarted]       = useState(false);
  const [vocabWords, setVocabWords] = useState<VocabularyWord[] | null>(null);

  // If the ID is numeric → fetch from backend
  useEffect(() => {
    if (!id) return;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return; // use static data
    setLoading(true);
    setFetchError(false);
    questionsService.getQuestion(numericId)
      .then((q) => setExercise(backendToExercise(q)))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center">
        <Loader2 size={32} className="text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (fetchError || (!loading && !exercise)) return <Navigate to="/learn" replace />;

  const currentExercise = exercise;
  if (!currentExercise) return <Navigate to="/learn" replace />;

  const meta = SKILL_META[currentExercise.skill as keyof typeof SKILL_META];
  const { Icon } = meta;

  // Map exercise skill → backend question type
  const exerciseTypeMap: Record<string, string> = {
    reading:       'READING',
    speaking:      'SPEAKING',
    shadowing:     'LISTENING_SHADOWING',
    comprehension: 'LISTENING_COMPREHENSION',
    writing:       'WRITING',
  };

  const handleComplete = (score: number, xp: number) => {
    if (!isAdminPreview) {
      completeExercise(
        currentExercise.id,
        xp,
        exerciseTypeMap[currentExercise.skill] ?? '',
        score,
      );
    }
  };

  const goLearn = () => navigate(isAdminPreview ? '/admin/questions' : '/learn');

  const afterComplete = async (score: number, xp: number) => {
    handleComplete(score, xp);
    if (isAdminPreview) { goLearn(); return; }
    try {
      const words = await questionsService.getExerciseVocabulary(Number(id));
      if (words.length === 0) { goLearn(); return; }
      setVocabWords(words);
    } catch {
      goLearn();
    }
  };

  return (
    <div className="min-h-screen bg-[#07090F] text-zinc-50 font-sans">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goLearn}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${meta.border} ${meta.bg} ${meta.color}`}>
            <Icon size={12} />
            {meta.label} · {currentExercise.level}
          </div>
          <span className="ml-auto text-xs text-zinc-600 font-mono">max {currentExercise.maxXP} XP</span>
        </div>

        <h1 className="text-xl font-semibold text-zinc-100 mb-1">{currentExercise.title}</h1>
        <p className="text-sm text-zinc-500 mb-6">
          {currentExercise.type === 'reading'       && 'Lee el texto y responde las preguntas de opción múltiple.'}
          {currentExercise.type === 'speaking'      && (currentExercise as SpeakingExercise).instruction}
          {currentExercise.type === 'comprehension' && 'Escucha el audio y responde las preguntas sin ver el texto.'}
          {currentExercise.type === 'writing'       && 'Lee la instrucción y escribe tu respuesta. La IA evaluará tu texto.'}
        </p>

        {/* Intro screen */}
        {!started && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${meta.bg} border ${meta.border} mb-4`}>
                <Icon size={22} className={meta.color} />
              </div>
              <p className="font-semibold text-zinc-100">{currentExercise.title}</p>
              <p className="text-sm text-zinc-500 mt-0.5 mb-4">{meta.label} · {currentExercise.level}</p>

              <div className="flex flex-wrap gap-6 pt-4 border-t border-zinc-800/60">
                {(currentExercise.type === 'reading' || currentExercise.type === 'comprehension') && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">Preguntas</p>
                    <p className="text-lg font-bold text-zinc-200">
                      {(currentExercise as ReadingExercise | ComprehensionExercise).questions.length}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">XP máximo</p>
                  <p className={`text-lg font-bold ${meta.color}`}>{currentExercise.maxXP}</p>
                </div>
                {currentExercise.type === 'comprehension' && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">Reproducciones</p>
                    <p className="text-lg font-bold text-zinc-200">{(currentExercise as ComprehensionExercise).maxReplays}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setStarted(true)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
            >
              Comenzar ejercicio →
            </button>
          </motion.div>
        )}

        {/* Vocabulary reveal (shown after exercise completion) */}
        {started && vocabWords !== null && (
          <VocabularyRevealScreen words={vocabWords} onContinue={goLearn} />
        )}

        {/* Active exercise */}
        {started && vocabWords === null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {currentExercise.type === 'reading' && (
              <ReadingPlayer
                ex={currentExercise as ReadingExercise}
                onComplete={afterComplete}
              />
            )}
            {currentExercise.type === 'speaking' && (
              <SpeakingPlayer
                ex={currentExercise as SpeakingExercise}
                onComplete={afterComplete}
              />
            )}
            {currentExercise.type === 'comprehension' && (
              <ComprehensionPlayer
                ex={currentExercise as ComprehensionExercise}
                onComplete={afterComplete}
              />
            )}
            {currentExercise.type === 'writing' && (
              <WritingPlayer
                ex={currentExercise as WritingExercise}
                onComplete={afterComplete}
              />
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
