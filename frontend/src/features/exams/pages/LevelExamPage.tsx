/**
 * LevelExamPage — SpeakBranch AI
 *
 * Página para realizar exámenes de nivel (LEVEL_UP).
 * Muestra preguntas del examen, permite responder y enviar.
 * Al aprobar, el usuario sube al siguiente nivel CEFR.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Trophy, AlertCircle,
  Volume2, Mic, BookOpen, PenLine, Loader2, Send,
} from 'lucide-react';
import { examService } from '@/services/examService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Exam, ExamQuestion, ExamStartResponse, Level } from '@/types/exam';
import { questionsService } from '@/services/questionsService';
import type { VocabularyWord, WritingEvaluationResult } from '@/services/questionsService';
import type { Question } from '@/types/question';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MCQOption {
  id: string;
  text: string;
}

interface MCQQuestion {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

// ─── Helper: Convert backend question to exercise-like format ─────────────────

function parseMCQQuestion(question: ExamQuestion): MCQQuestion | null {
  if (question.question_type !== 'READING' && question.question_type !== 'LISTENING_COMPREHENSION') {
    return null;
  }

  if (Array.isArray(question.options) && question.options.length >= 2) {
    let correctIdx = 0;
    try {
      const parsed = JSON.parse(question.correct_answer) as {
        correct?: string;
        questions?: Array<{ correct?: string }>;
      };
      const correctValue = parsed?.questions?.[0]?.correct ?? parsed?.correct;
      if (correctValue) {
        const idx = question.options.findIndex(
          (opt) => opt.trim().toLowerCase() === String(correctValue).trim().toLowerCase(),
        );
        if (idx >= 0) correctIdx = idx;
      }
    } catch {
      // keep default 0
    }

    return {
      id: String(question.question_id),
      text: question.text,
      options: question.options as [string, string, string, string],
      correctIndex: correctIdx,
      explanation: 'Respuesta validada por el sistema.',
    };
  }

  const source = question.correct_answer || question.text;

  try {
    const parsed = JSON.parse(source) as {
      questions?: Array<{ text: string; options: string[]; correct: string }>;
      options?: string[];
      correct?: string;
    };

    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      const q = parsed.questions[0];
      const correctIdx = q.options.indexOf(q.correct);
      return {
        id: String(question.question_id),
        text: q.text,
        options: q.options as [string, string, string, string],
        correctIndex: correctIdx >= 0 ? correctIdx : 0,
        explanation: `La respuesta correcta es: "${q.correct}".`,
      };
    }

    if (Array.isArray(parsed.options) && parsed.correct) {
      const correctIdx = parsed.options.indexOf(parsed.correct);
      return {
        id: String(question.question_id),
        text: question.text,
        options: parsed.options as [string, string, string, string],
        correctIndex: correctIdx >= 0 ? correctIdx : 0,
        explanation: `La respuesta correcta es: "${parsed.correct}".`,
      };
    }
  } catch {
    // Not a MCQ structure
  }

  return null;
}

function playQuestionAudio(question: ExamQuestion) {
  if (question.audio_url) {
    const audio = new Audio(question.audio_url);
    void audio.play().catch(() => { });
    return;
  }

  const ttsText = question.phonetic_text || question.text;
  if (!ttsText || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(ttsText);
  utterance.lang = 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MCQPlayer({
  question,
  onSubmit,
}: {
  question: ExamQuestion;
  onSubmit: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const mcq = parseMCQQuestion(question);
  if (!mcq) return null;
  const shouldOfferAudio = question.resource_requirements?.requires_audio
    ?? (question.question_type === 'LISTENING_COMPREHENSION' || Boolean(question.audio_url));

  const handleSubmit = () => {
    if (selected === null || submitted) return;
    setSubmitted(true);
    const isCorrect = selected === mcq.correctIndex;
    setCorrect(isCorrect);
    onSubmit(mcq.options[selected]);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <p className="text-lg text-slate-100">{mcq.text}</p>
        {shouldOfferAudio && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => playQuestionAudio(question)}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-300"
            >
              <Volume2 className="h-4 w-4" /> Escuchar audio
            </button>
            {question.audio_url && (
              <audio controls src={question.audio_url} className="h-10" />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {mcq.options.map((option, idx) => {
          const isSelected = selected === idx;
          const isCorrect = idx === mcq.correctIndex;
          let bgColor = 'bg-slate-800 border-slate-700 hover:border-sky-500/50';
          if (submitted) {
            bgColor = isCorrect
              ? 'bg-emerald-900/30 border-emerald-500/70'
              : isSelected
                ? 'bg-rose-900/30 border-rose-500/70'
                : 'bg-slate-800 border-slate-700';
          } else if (isSelected) {
            bgColor = 'bg-sky-900/30 border-sky-500/70';
          }

          return (
            <button
              key={idx}
              onClick={() => !submitted && setSelected(idx)}
              disabled={submitted}
              className={`rounded-xl border p-4 text-left transition-all ${bgColor} ${submitted ? 'cursor-default' : 'cursor-pointer'
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${submitted && isCorrect
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : submitted && isSelected
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : isSelected
                          ? 'border-sky-500 text-sky-400'
                          : 'border-slate-600 text-slate-400'
                    }`}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-slate-200">{option}</span>
                {submitted && isCorrect && <CheckCircle2 className="ml-auto text-emerald-400" />}
                {submitted && isSelected && !isCorrect && <XCircle className="ml-auto text-rose-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar respuesta
        </button>
      )}

      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-4 ${correct ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-rose-500/50 bg-rose-900/20'
            }`}
        >
          <p className={correct ? 'text-emerald-300' : 'text-rose-300'}>
            {correct ? '¡Correcto! ' : 'Incorrecto. '}
            {mcq.explanation}
          </p>
        </motion.div>
      )}
    </div>
  );
}

function SpeakingPlayer({
  question,
  onSubmit,
}: {
  question: ExamQuestion;
  onSubmit: (answer: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz. Por favor escribe tu respuesta.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = () => {
    if (!transcript.trim() || submitted) return;
    setSubmitted(true);
    onSubmit(transcript);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <p className="text-lg font-medium text-slate-100">{question.text}</p>
        {question.phonetic_text && (
          <p className="mt-2 text-sm text-slate-400">{question.phonetic_text}</p>
        )}
      </div>

      {question.audio_url && (
        <audio controls src={question.audio_url} className="w-full" />
      )}

      <div className="flex flex-col items-center gap-4">
        {!submitted && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-3 rounded-full px-8 py-4 text-lg font-semibold transition-all ${isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-sky-600 text-white hover:bg-sky-500'
              }`}
          >
            <Mic className="h-6 w-6" />
            {isRecording ? 'Detener grabación' : 'Grabar respuesta'}
          </button>
        )}

        {transcript && (
          <div className="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-sm text-slate-400">Tu respuesta:</p>
            <p className="mt-1 text-lg text-slate-100">{transcript}</p>
          </div>
        )}

        {!submitted && transcript && (
          <button
            onClick={handleSubmit}
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Enviar respuesta
          </button>
        )}

        {submitted && (
          <div className="rounded-xl border border-sky-500/50 bg-sky-900/20 p-4">
            <p className="text-sky-300">Respuesta enviada correctamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WritingPlayer({
  question,
  onSubmit,
}: {
  question: ExamQuestion;
  onSubmit: (answer: string) => void;
}) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<WritingEvaluationResult | null>(null);

  const handleSubmit = async () => {
    if (!text.trim() || submitted) return;
    setSubmitted(true);

    try {
      const result = await questionsService.evaluateWriting(question.question_id, text);
      setEvaluation(result);
      onSubmit(text);
    } catch (error) {
      console.error('Error evaluating writing:', error);
      onSubmit(text);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <p className="text-lg font-medium text-slate-100">{question.text}</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted}
        placeholder="Escribe tu respuesta en inglés..."
        className="min-h-[200px] w-full rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none disabled:opacity-50"
      />

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar respuesta
        </button>
      )}

      {submitted && evaluation && (
        <div className="rounded-xl border border-sky-500/50 bg-sky-900/20 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-sky-300">Evaluación</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-sm text-slate-400">Puntuación general</p>
              <p className="text-2xl font-bold text-sky-300">{evaluation.score}%</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-sm text-slate-400">XP ganados</p>
              <p className="text-2xl font-bold text-emerald-300">+{evaluation.xp_earned}</p>
            </div>
          </div>
          <p className="text-slate-300">{evaluation.feedback}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LevelExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [examData, setExamData] = useState<ExamStartResponse | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    passed: boolean;
    score: number;
    previousBestScore: number;
    scoreDelta: number;
    message: string;
  } | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load exam data
  useEffect(() => {
    if (!examId) return;

    const loadExam = async () => {
      try {
        const examList = await examService.getExams();
        const foundExam = examList.find(e => e.id === Number(examId));
        if (!foundExam) {
          setError('Examen no encontrado');
          return;
        }
        setExam(foundExam);

        const startResponse = await examService.startExam(foundExam.id);
        setExamData(startResponse);
        setTimeElapsed(0);

        // Start timer
        timerRef.current = setInterval(() => {
          setTimeElapsed(prev => prev + 1);
        }, 1000);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el examen');
      } finally {
        setLoading(false);
      }
    };

    loadExam();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId]);

  // Check time limit
  useEffect(() => {
    if (exam && timeElapsed >= exam.time_limit_minutes * 60) {
      handleSubmitExam();
    }
  }, [timeElapsed, exam]);

  const currentQuestion = examData?.questions[currentQuestionIdx] ?? null;

  const handleAnswer = useCallback((answer: any) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.question_id]: answer,
    }));
  }, [currentQuestion]);

  const handleNext = () => {
    if (examData && currentQuestionIdx < examData.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
    }
  };

  const handleSubmitExam = async () => {
    if (submitting || !examData) return;
    setSubmitting(true);

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const response = await examService.submitExam(
        examData.attempt.id,
        answers,
        timeElapsed
      );

      if (response.passed) {
        await refreshUser();
      }

      setResult({
        passed: response.passed,
        score: response.score,
        previousBestScore: response.previous_best_score ?? 0,
        scoreDelta: response.score_delta ?? response.score,
        message: response.message,
      });
    } catch (err: any) {
      setError(err.message || 'Error al enviar el examen');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-sky-500" />
          <p className="mt-4 text-lg text-slate-400">Cargando examen...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-rose-500" />
          <h2 className="mt-4 text-2xl font-bold text-slate-100">Error</h2>
          <p className="mt-2 text-slate-400">{error}</p>
          <button
            onClick={() => navigate('/learn')}
            className="mt-6 rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-500"
          >
            Volver a la ruta de aprendizaje
          </button>
        </div>
      </div>
    );
  }

  // ─── Result State ─────────────────────────────────────────────────────────

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center"
        >
          {result.passed ? (
            <>
              <Trophy className="mx-auto h-24 w-24 text-yellow-400" />
              <h2 className="mt-4 text-3xl font-bold text-emerald-400">¡Felicidades!</h2>
              <p className="mt-2 text-lg text-slate-300">Has aprobado el examen de nivel</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-24 w-24 text-rose-500" />
              <h2 className="mt-4 text-3xl font-bold text-rose-400">No aprobaste</h2>
              <p className="mt-2 text-lg text-slate-300">Puedes intentarlo de nuevo cuando tengas más XP</p>
            </>
          )}

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">Puntuación</p>
              <p className={`text-3xl font-bold ${result.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.score.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">Mínimo requerido</p>
              <p className="text-3xl font-bold text-slate-300">{exam?.passing_score}%</p>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">Diferencia</p>
              <p className={`text-3xl font-bold ${result.scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.scoreDelta >= 0 ? '+' : ''}{result.scoreDelta.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-slate-500">vs mejor intento {result.previousBestScore.toFixed(1)}%</p>
            </div>
          </div>

          <p className="mt-6 text-slate-300">{result.message}</p>

          <button
            onClick={() => navigate('/learn')}
            className="mt-8 w-full rounded-xl bg-sky-600 py-3 text-lg font-semibold text-white transition-colors hover:bg-sky-500"
          >
            Volver a la ruta de aprendizaje
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Exam In Progress ─────────────────────────────────────────────────────

  if (!examData || !currentQuestion) {
    return null;
  }

  const timeLimit = exam?.time_limit_minutes ?? 60;
  const timeRemaining = Math.max(0, timeLimit * 60 - timeElapsed);
  const progress = ((currentQuestionIdx + 1) / examData.questions.length) * 100;
  const currentResources = currentQuestion.resource_requirements;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate('/learn')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-slate-400">Nivel</p>
              <p className="text-lg font-bold text-sky-400">{exam?.level}</p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2">
              <Clock className="h-5 w-5 text-slate-400" />
              <span className={`font-mono text-lg font-bold ${timeRemaining < 300 ? 'text-rose-400 animate-pulse' : 'text-slate-200'
                }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-slate-800">
          <motion.div
            className="h-full bg-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">
            Pregunta {currentQuestionIdx + 1} de {examData.questions.length}
          </h2>
          <div className="flex items-center gap-2">
            {currentResources?.requires_audio && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-300">
                <Volume2 className="h-3.5 w-3.5" /> Audio
              </span>
            )}
            {currentResources?.requires_microphone && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-xs font-semibold text-violet-300">
                <Mic className="h-3.5 w-3.5" /> Micrófono
              </span>
            )}
            {currentResources?.has_options && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                <BookOpen className="h-3.5 w-3.5" /> Opción múltiple
              </span>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1">
              <span className="text-sm text-slate-400">Puntos:</span>
              <span className="font-bold text-sky-400">{currentQuestion.points}</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {['READING', 'LISTENING_COMPREHENSION'].includes(currentQuestion.question_type) && (
              <MCQPlayer question={currentQuestion} onSubmit={handleAnswer} />
            )}
            {['SPEAKING', 'LISTENING_SHADOWING'].includes(currentQuestion.question_type) && (
              <SpeakingPlayer question={currentQuestion} onSubmit={handleAnswer} />
            )}
            {currentQuestion.question_type === 'WRITING' && (
              <WritingPlayer question={currentQuestion} onSubmit={handleAnswer} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIdx === 0}
            className="rounded-xl bg-slate-800 px-6 py-3 font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>

          {currentQuestionIdx < examData.questions.length - 1 ? (
            <button
              onClick={handleNext}
              className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-sky-500"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmitExam}
              disabled={submitting || Object.keys(answers).length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Enviar examen
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
