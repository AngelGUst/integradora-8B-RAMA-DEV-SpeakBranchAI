import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, RotateCcw, Volume2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

interface VocabWord {
  id: number;
  word: string;
  meaning: string;
  pronunciation: string;
  example_sentence: string;
  level: string;
  category: string;
}

interface UserVocabEntry {
  id: number;
  vocabulary: VocabWord;
  mastery_level: number;
  date_assigned: string;
}

// loading → empty (no words)
// loading → playing → correct (2s auto) → playing (next word)
//                   → wrong   (any key) → playing (next word)
//                                       → done    (last word)
type GamePhase = 'loading' | 'empty' | 'playing' | 'correct' | 'wrong' | 'done';

const SECONDS    = 10;
const API_BASE   = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const CORRECT_MS = 2000;

// ── Helpers ────────────────────────────────────────────────────

async function fetchMyVocabulary(): Promise<UserVocabEntry[]> {
  const token = localStorage.getItem('sb_access_token');
  const res = await fetch(`${API_BASE}/vocabulary/my/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed');
  const json = await res.json();
  return json.data;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor((globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Words assigned more recently get a higher base score.
// score = 1 / (1 + days_ago) — so today=1.0, 1d=0.5, 7d=0.125
// A random jitter of 0.4 keeps it varied without losing the bias.
function weightedSort(entries: UserVocabEntry[]): UserVocabEntry[] {
  const now = Date.now();
  return [...entries]
    .map(e => ({
      entry: e,
      score: 1 / (1 + (now - new Date(e.date_assigned).getTime()) / 86_400_000)
             + (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000) * 0.4,
    }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.entry);
}

// ── Countdown bar ──────────────────────────────────────────────

function CountdownBar({ seconds, total }: Readonly<{ seconds: number; total: number }>) {
  const pct = seconds / total;
  const lowColor = pct > 0.25 ? 'bg-amber-400' : 'bg-red-500';
  const color = pct > 0.5 ? 'bg-violet-500' : lowColor;
  const lowTextColor = pct > 0.25 ? '#fbbf24' : '#f87171';
  const textColor = pct > 0.5 ? '#a78bfa' : lowTextColor;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.8, ease: 'linear' }}
        />
      </div>
      <span
        className="text-[13px] font-black tabular-nums w-5 text-right"
        style={{ color: textColor }}
      >
        {seconds}
      </span>
    </div>
  );
}

// ── TTS button ─────────────────────────────────────────────────

function TTSButton({ word }: Readonly<{ word: string }>) {
  const [speaking, setSpeaking] = useState(false);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    globalThis.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US'; u.rate = 0.82;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    globalThis.speechSynthesis.speak(u);
  };

  return (
    <button
      onClick={speak}
      className={`p-2 rounded-lg border transition-colors ${
        speaking
          ? 'border-violet-500/40 bg-violet-500/10 text-violet-400'
          : 'border-white/[0.07] text-white/20 hover:text-violet-400 hover:border-violet-500/30'
      }`}
    >
      <Volume2 size={14} />
    </button>
  );
}

// ── Drawer ─────────────────────────────────────────────────────

export default function VocabularyGameDrawer({
  open,
  onClose,
}: Readonly<{
  open: boolean;
  onClose: () => void;
}>) {
  const [entries, setEntries]     = useState<UserVocabEntry[]>([]);
  const [phase, setPhase]         = useState<GamePhase>('loading');
  const [current, setCurrent]     = useState(0);
  const [countdown, setCountdown] = useState(SECONDS);
  const [answer, setAnswer]       = useState('');
  const [wrongReason, setWrongReason] = useState<'timeout' | 'typo'>('typo');
  const [score, setScore]         = useState({ correct: 0, total: 0 });

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const correctRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef    = useRef<GamePhase>('loading');

  phaseRef.current = phase;

  const entry = entries[current];
  const word  = entry?.vocabulary;
  const accuracyPct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const stopTimer = () => {
    if (timerRef.current)   { clearInterval(timerRef.current);  timerRef.current   = null; }
    if (correctRef.current) { clearTimeout(correctRef.current); correctRef.current = null; }
  };

  const goNext = useCallback((fromIdx: number, currentEntries: UserVocabEntry[]) => {
    const nextIdx = fromIdx + 1;
    if (nextIdx >= currentEntries.length) {
      // All words done — shuffle and loop forever
      const reshuffled = weightedSort(currentEntries);
      setEntries(reshuffled);
      setCurrent(0);
    } else {
      setCurrent(nextIdx);
    }
    setAnswer('');
    setCountdown(SECONDS);
    setPhase('playing');
  }, []);

  const markCorrect = useCallback((fromIdx: number, currentEntries: UserVocabEntry[]) => {
    stopTimer();
    setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    setPhase('correct');
    correctRef.current = setTimeout(() => goNext(fromIdx, currentEntries), CORRECT_MS);
  }, [goNext]);

  const markWrong = useCallback((reason: 'timeout' | 'typo') => {
    stopTimer();
    setScore(prev => ({ correct: prev.correct, total: prev.total + 1 }));
    setWrongReason(reason);
    setPhase('wrong');
  }, []);

  // Fetch & reset on open
  useEffect(() => {
    if (!open) return;
    stopTimer();
    setPhase('loading');
    setScore({ correct: 0, total: 0 });
    setCurrent(0);
    setAnswer('');
    setCountdown(SECONDS);

    fetchMyVocabulary()
      .then(data => {
        const shuffled = weightedSort(data);
        setEntries(shuffled);
        setPhase(shuffled.length === 0 ? 'empty' : 'playing');
      })
      .catch(() => setPhase('empty'));

    return stopTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Countdown tick — only during 'playing'
  useEffect(() => {
    if (phase !== 'playing') return;
    setCountdown(SECONDS);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          // Read current idx from state via ref-based callback
          markWrong('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // current changes trigger a new countdown for each word
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'playing' ? current : null, phase]);

  // Pronounce word when the answer is revealed (correct or wrong)
  useEffect(() => {
    if ((phase !== 'correct' && phase !== 'wrong') || !word) return;
    globalThis.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word.word);
    u.lang = 'en-US';
    u.rate = 0.82;
    globalThis.speechSynthesis.speak(u);
  }, [phase, word]);

  // Any keypress on 'wrong' → next word
  useEffect(() => {
    if (phase !== 'wrong') return;
    const handler = () => goNext(current, entries);
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [phase, current, entries, goNext]);

  const handleChange = useCallback((val: string) => {
    if (phaseRef.current !== 'playing' || !word) return;
    setAnswer(val);
    if (val.trim().toLowerCase() === word.word.toLowerCase()) {
      markCorrect(current, entries);
    }
  }, [word, current, entries, markCorrect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && phaseRef.current === 'playing' && answer.trim()) {
      // Enter with wrong answer → mark wrong
      if (word && answer.trim().toLowerCase() !== word.word.toLowerCase()) {
        markWrong('typo');
      }
    }
  }, [answer, word, markWrong]);

  const handleRestart = () => {
    stopTimer();
    const shuffled = shuffle(entries);
    setEntries(shuffled);
    setCurrent(0);
    setAnswer('');
    setCountdown(SECONDS);
    setScore({ correct: 0, total: 0 });
    setPhase('playing');
  };

  // ── Render ─────────────────────────────────────────────────────

  const safeExample = word?.example_sentence
    ? word.example_sentence.replaceAll(new RegExp(String.raw`\b${word.word}\b`, 'gi'), '___')
    : '';

  const wrongOrDefault =
    phase === 'wrong' ? 'border-red-500/50 bg-red-500/[0.04]' : 'border-white/[0.1] bg-white/[0.04] focus-within:border-violet-500/60';
  const inputBorder =
    phase === 'correct' ? 'border-emerald-500/60 bg-emerald-500/[0.04]' : wrongOrDefault;

  const feedbackSeconds = phase === 'correct' ? SECONDS : 0;
  const doneIcon = accuracyPct >= 60 ? '🎯' : '📖';
  const partialPctClass = accuracyPct >= 60 ? 'bg-amber-500/10  border-amber-500/20  text-amber-400' : 'bg-red-500/10    border-red-500/20    text-red-400';
  const accuracyPctClass = accuracyPct === 100 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : partialPctClass;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full z-50 w-[420px] bg-[#0D0D12] border-l border-white/[0.07] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <BookOpen size={14} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white/90">Study Vocabulary</p>
                  {entries.length > 0 && !['loading', 'empty', 'done'].includes(phase) && (
                    <p className="text-[11px] text-white/30">{current + 1} of {entries.length} words</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress bar (score) */}
            {score.total > 0 && !['done'].includes(phase) && (
              <div className="px-6 pt-3 pb-2 shrink-0 flex items-center gap-3">
                <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    animate={{ width: `${accuracyPct}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <span className="text-[10px] text-white/25 tabular-nums shrink-0">
                  {score.correct}/{score.total}
                </span>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* ── Loading ── */}
                {phase === 'loading' && (
                  <motion.div key="loading"
                    className="flex items-center justify-center h-64"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/[0.06] border-t-violet-500" />
                  </motion.div>
                )}

                {/* ── Empty ── */}
                {phase === 'empty' && (
                  <motion.div key="empty"
                    className="flex flex-col items-center justify-center py-24 px-8 text-center gap-4"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  >
                    <span className="text-5xl">📚</span>
                    <p className="text-[15px] font-semibold text-white/50">No vocabulary yet</p>
                    <p className="text-[12px] text-white/25 leading-relaxed">
                      Complete exercises to build your vocabulary collection.
                    </p>
                  </motion.div>
                )}

                {/* ── Playing / correct / wrong — same card, no remount ── */}
                {word && ['playing', 'correct', 'wrong'].includes(phase) && (
                  <motion.div
                    key={`word-${current}`}
                    className="p-6 space-y-4"
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ duration: 0.22 }}
                  >
                    {/* Countdown bar — hidden on feedback */}
                    <CountdownBar
                      seconds={phase === 'playing' ? countdown : feedbackSeconds}
                      total={SECONDS}
                    />

                    {/* Meaning */}
                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-5 py-4">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 font-semibold mb-1.5">Meaning</p>
                      <p className="text-[15px] text-white/85 leading-snug font-semibold">{word.meaning}</p>
                    </div>

                    {/* Attributes */}
                    <div className="grid grid-cols-2 gap-2">
                      {word.pronunciation && (
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                          <p className="text-[9px] uppercase tracking-widest text-white/20 font-semibold mb-1">Pronunciation</p>
                          <p className="text-[12px] font-mono text-violet-400/70">{word.pronunciation}</p>
                        </div>
                      )}
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                        <p className="text-[9px] uppercase tracking-widest text-white/20 font-semibold mb-1">Level</p>
                        <p className="text-[12px] font-mono text-white/40">{word.level}</p>
                      </div>
                      {word.category && (
                        <div className="col-span-2 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2.5">
                          <p className="text-[9px] uppercase tracking-widest text-white/20 font-semibold mb-1">Category</p>
                          <p className="text-[11px] text-white/40">{word.category}</p>
                        </div>
                      )}
                    </div>

                    {/* Example */}
                    {safeExample && (
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                        <p className="text-[9px] uppercase tracking-widest text-white/20 font-semibold mb-1">Example</p>
                        <p className="text-[11px] text-white/35 italic leading-relaxed">"{safeExample}"</p>
                      </div>
                    )}

                    {/* Input area */}
                    <div className={`border rounded-xl px-4 py-3 transition-colors ${inputBorder}`}>
                      <p className="text-[9px] uppercase tracking-widest text-white/20 font-semibold mb-2">
                        Write the English word
                      </p>
                      <input
                        type="text"
                        value={answer}
                        disabled={phase !== 'playing'}
                        onChange={e => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type here…"
                        className="w-full bg-transparent text-[16px] font-bold text-white/90 placeholder:text-white/15 focus:outline-none"
                        autoComplete="off"
                        spellCheck={false}
                        autoFocus
                      />
                    </div>

                    {/* Feedback overlay */}
                    <AnimatePresence>
                      {phase === 'correct' && (
                        <motion.div
                          key="correct-badge"
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25"
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <span className="text-[15px] font-black text-emerald-400">Correct!</span>
                          <span className="text-[11px] text-emerald-400/50">Next word in 2s…</span>
                        </motion.div>
                      )}

                      {phase === 'wrong' && (
                        <motion.div
                          key="wrong-badge"
                          className="space-y-2"
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-red-500/[0.07] border border-red-500/20">
                            <div>
                              <p className="text-[13px] font-bold text-red-400">
                                {wrongReason === 'timeout' ? "Time's up!" : 'Not quite'}
                              </p>
                              <p className="text-[11px] text-white/30">
                                The word was{' '}
                                <span className="font-bold text-white/60">{word.word}</span>
                              </p>
                            </div>
                            <TTSButton word={word.word} />
                          </div>
                          <p className="text-center text-[10px] text-white/20">
                            Press any key to continue
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ── Done ── */}
                {phase === 'done' && (
                  <motion.div key="done"
                    className="flex flex-col items-center justify-center py-20 px-8 text-center gap-6"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  >
                    <span className="text-5xl">
                      {accuracyPct === 100 ? '🏆' : doneIcon}
                    </span>
                    <div>
                      <p className="text-[22px] font-black text-white/90 mb-1">Session Complete</p>
                      <p className="text-[13px] text-white/40">
                        You got{' '}
                        <span className="text-emerald-400 font-bold">{score.correct}</span>
                        {' '}out of{' '}
                        <span className="font-bold text-white/60">{score.total}</span>
                        {' '}correct
                      </p>
                    </div>

                    <div className={`px-10 py-5 rounded-2xl border ${accuracyPctClass}`}>
                      <p className="text-[36px] font-black">{accuracyPct}%</p>
                    </div>

                    <button
                      onClick={handleRestart}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[13px] transition-colors"
                    >
                      <RotateCcw size={14} /> Play again
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
