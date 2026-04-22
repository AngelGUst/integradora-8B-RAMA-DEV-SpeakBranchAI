import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useInView, AnimatePresence, type Variants } from 'framer-motion';
import { Search, Volume2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import AppSidebar from '@/shared/components/layout/AppSidebar';
import { useAuth } from '@/features/auth/hooks/useAuth';

// -- API --------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('sb_access_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error('Request failed');
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// -- Types ------------------------------------------------------

interface VocabWord {
  id: number;
  word: string;
  meaning: string;
  pronunciation: string;
  example_sentence: string;
  level: string;
  category: string;
  image_url: string | null;
  audio_url: string | null;
}

interface UserVocabEntry {
  id: number;
  vocabulary: VocabWord;
  date_assigned: string;
  was_seen: boolean;
  was_practiced: boolean;
  mastery_level: number;
  times_reviewed: number;
  last_reviewed_at: string | null;
}

// -- Constants --------------------------------------------------

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const MASTERY = [
  { value: 0, label: 'No visto',   color: 'bg-zinc-700 text-zinc-400'           },
  { value: 1, label: 'Visto',      color: 'bg-sky-900/60 text-sky-300'           },
  { value: 2, label: 'Practicing',color: 'bg-amber-900/60 text-amber-300'       },
  { value: 3, label: 'Learned',  color: 'bg-emerald-900/60 text-emerald-300'   },
  { value: 4, label: 'Mastered',   color: 'bg-violet-900/60 text-violet-300'     },
] as const;

const MASTERY_DOT: Record<number, string> = {
  0: 'bg-zinc-600',
  1: 'bg-sky-400',
  2: 'bg-amber-400',
  3: 'bg-emerald-400',
  4: 'bg-violet-400',
};

// -- Animation -------------------------------------------------

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, ease: EASE, delay: i * 0.07 },
  }),
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-72px' });
  return { ref, inView };
}

// -- Skeleton --------------------------------------------------

function SkeletonCard() {
  return (
    <div className="border border-white/[0.05] rounded-2xl p-5 bg-white/[0.01] animate-pulse space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="w-24 h-4 rounded bg-white/[0.04]" />
          <div className="w-16 h-3 rounded bg-white/[0.03]" />
        </div>
        <div className="w-14 h-5 rounded-full bg-white/[0.03]" />
      </div>
      <div className="w-full h-3 rounded bg-white/[0.03]" />
      <div className="w-3/4 h-3 rounded bg-white/[0.03]" />
    </div>
  );
}

// -- Word Card -------------------------------------------------

function WordCard({
  entry,
  onMarkSeen,
  onPractice,
}: {
  entry: UserVocabEntry;
  onMarkSeen: (id: number) => void;
  onPractice: (id: number, success: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const w = entry.vocabulary;
  const mastery = MASTERY[entry.mastery_level] ?? MASTERY[0];

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(w.word);
    u.lang = 'en-US';
    u.rate = 0.82;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const handleExpand = () => {
    setExpanded(p => !p);
    if (!entry.was_seen) onMarkSeen(entry.id);
  };

  return (
    <motion.div
      layout
      className="border border-white/[0.05] rounded-2xl bg-white/[0.01] overflow-hidden cursor-pointer hover:border-white/[0.1] transition-colors"
      onClick={handleExpand}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${MASTERY_DOT[entry.mastery_level]}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-black text-white/85 tracking-tight">{w.word}</span>
              <button
                onClick={playAudio}
                className={`p-1 rounded-md transition-colors ${
                  speaking ? 'text-violet-400' : 'text-white/20 hover:text-violet-400'
                }`}
              >
                <Volume2 size={13} />
              </button>
            </div>
            {w.pronunciation && (
              <p className="text-[11px] font-mono text-violet-400/50">{w.pronunciation}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mastery.color}`}>
            {mastery.label}
          </span>
          <span className="text-[10px] font-mono text-white/20">{w.level}</span>
          {expanded
            ? <ChevronUp size={13} className="text-white/20" />
            : <ChevronDown size={13} className="text-white/20" />}
        </div>
      </div>

      {/* Meaning - always visible */}
      <div className="px-5 pb-4">
        <p className="text-[13px] text-white/50 leading-snug line-clamp-2">{w.meaning}</p>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-3">
              {w.example_sentence && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mb-1">Example</p>
                  <p className="text-[13px] text-white/40 italic leading-snug">"{w.example_sentence}"</p>
                </div>
              )}
              {w.category && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mb-1">Category</p>
                  <span className="text-[11px] text-white/30 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-md">
                    {w.category}
                  </span>
                </div>
              )}
              {/* Practice buttons */}
              <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onPractice(entry.id, true)}
                  disabled={entry.mastery_level >= 4}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 hover:bg-emerald-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                   I know it
                </button>
                <button
                  onClick={() => onPractice(entry.id, false)}
                  disabled={entry.mastery_level <= 0}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/30 hover:bg-amber-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Review
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/20">
                  Repasado {entry.times_reviewed} vez{entry.times_reviewed !== 1 ? 'es' : ''}
                </span>
                <span className="text-[11px] text-white/20">
                  Added {new Date(entry.date_assigned).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// -- Page ------------------------------------------------------

export default function VocabularyCollectionPage() {
  const { ref, inView } = useReveal();
  const { user } = useAuth();
  const pageNumber = user?.role === 'ADMIN' ? '003' : '001';

  const [entries, setEntries]       = useState<UserVocabEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [levelFilter, setLevel]     = useState('');
  const [masteryFilter, setMastery] = useState('');
  const [pageSize, setPageSize]     = useState(4);
  const [rawPageSize, setRawPageSize] = useState('4');
  const [page, setPage]             = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (levelFilter)  params.set('level', levelFilter);
      if (masteryFilter !== '') params.set('mastery', masteryFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await apiFetch<{ data: UserVocabEntry[]; total: number }>(
        `/vocabulary/my/${params.toString() ? `?${params}` : ''}`
      );
      setEntries(res.data);
    } catch {
      setError('Could not load vocabulary.');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, masteryFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  // Fuerza número par: si impar  - resta 1. Minimum 2.
  const toEven = (n: number) => Math.max(2, n % 2 === 0 ? n : n - 1);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawPageSize(e.target.value); // permite borrar libremente
  };

  const handlePageSizeBlur = () => {
    const parsed = parseInt(rawPageSize, 10);
    const even = isNaN(parsed) || parsed < 1 ? 4 : toEven(parsed);
    setPageSize(even);
    setRawPageSize(String(even));
    setPage(1);
  };

  // Reset page when filters or page size change
  useEffect(() => { setPage(1); }, [levelFilter, masteryFilter, search, pageSize]);

  // Pagination
  const totalPages      = Math.max(1, Math.ceil(entries.length / pageSize));
  const safePage        = Math.min(page, totalPages);
  const paginatedEntries = useMemo(
    () => entries.slice((safePage - 1) * pageSize, safePage * pageSize),
    [entries, safePage, pageSize],
  );

  const handleMarkSeen = async (id: number) => {
    try {
      await apiFetch(`/vocabulary/daily/${id}/seen/`, { method: 'PATCH' });
      setEntries(prev =>
        prev.map(e => e.id === id ? { ...e, was_seen: true } : e)
      );
    } catch { /* silent */ }
  };

  const handlePractice = async (id: number, success: boolean) => {
    // Optimistic update
    setEntries(prev =>
      prev.map(e => {
        if (e.id !== id) return e;
        const next = success
          ? Math.min(4, e.mastery_level + 1)
          : Math.max(0, e.mastery_level - 1);
        return { ...e, mastery_level: next, was_practiced: true, times_reviewed: e.times_reviewed + 1 };
      })
    );
    try {
      await apiFetch(`/vocabulary/daily/${id}/practice/`, {
        method: 'POST',
        body: JSON.stringify({ success }),
      });
    } catch { /* silent - optimistic state stays */ }
  };

  // Stats
  const total    = entries.length;
  const mastered = entries.filter(e => e.mastery_level >= 3).length;
  const unseen   = entries.filter(e => e.mastery_level === 0).length;

  return (
    <div className="flex h-screen bg-[#06060A] text-[#f5f3ff]">
      <AppSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-5">

          {/* -- Section header -- */}
          <motion.div
            ref={ref}
            variants={reveal}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[11px] text-white/20 tracking-widest">{pageNumber}</span>
              <span className="h-px flex-1 max-w-[32px] bg-white/[0.06]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
                My Vocabulary
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-[-0.03em] text-[#f5f3ff] mb-2">
              My vocabulary collection.
            </h1>
            <p className="text-[14px] text-white/25 mb-8">
              Each word you find in exercises is saved here.
            </p>

            {/* Stats pills */}
            {!loading && total > 0 && (
              <div className="flex gap-3 mb-8 flex-wrap">
                {[
                  { label: 'Total',     value: total,    color: 'text-white/60'    },
                  { label: 'Aprendidas',value: mastered, color: 'text-emerald-400' },
                  { label: 'Sin ver',   value: unseen,   color: 'text-amber-400'   },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <span className={`text-[18px] font-black ${s.color}`}>{s.value}</span>
                    <span className="text-[11px] text-white/30 uppercase tracking-wider">{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search word..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {/* Level */}
              <select
                value={levelFilter}
                onChange={e => setLevel(e.target.value)}
                className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white/60 focus:outline-none focus:border-violet-500/50 transition-colors"
              >
                <option value="">All levels</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              {/* Mastery */}
              <select
                value={masteryFilter}
                onChange={e => setMastery(e.target.value)}
                className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white/60 focus:outline-none focus:border-violet-500/50 transition-colors"
              >
                <option value="">All statuses</option>
                {MASTERY.map(m => (
                  <option key={m.value} value={String(m.value)}>{m.label}</option>
                ))}
              </select>

              {/* Page size */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-white/30 whitespace-nowrap">Per page</label>
                <input
                  type="number"
                  value={rawPageSize}
                  onChange={handlePageSizeChange}
                  onBlur={handlePageSizeBlur}
                  onKeyDown={e => { if (e.key === 'Enter') handlePageSizeBlur(); }}
                  className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2 py-2 text-[13px] text-white/70 text-center focus:outline-none focus:border-violet-500/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </motion.div>

          {/* -- Content -- */}
          <motion.div
            variants={reveal}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            custom={1}
          >
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : error ? (
              <p className="text-center py-16 text-[13px] text-red-400/70">{error}</p>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-[32px] mb-3">x-a</p>
                <p className="text-[15px] font-semibold text-white/40 mb-1">
                  {search || levelFilter || masteryFilter
                    ? 'No hay palabras con esos filtros.'
                    : 'Your collection is empty.'}
                </p>
                <p className="text-[13px] text-white/20">
                  {!(search || levelFilter || masteryFilter) &&
                    'Complete exercises to build vocabulary.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {paginatedEntries.map(entry => (
                  <WordCard
                    key={entry.id}
                    entry={entry}
                    onMarkSeen={handleMarkSeen}
                    onPractice={handlePractice}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Pagination controls */}
          {!loading && !error && entries.length > 0 && totalPages > 1 && (
            <motion.div
              variants={reveal}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              custom={2}
              className="mt-6 flex items-center justify-center gap-3"
            >
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="text-[12px] text-white/30 tabular-nums">
                Page <span className="text-white/60 font-semibold">{safePage}</span> de{' '}
                <span className="text-white/60 font-semibold">{totalPages}</span>
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </motion.div>
          )}

          {/* Count footer */}
          {!loading && !error && entries.length > 0 && (
            <motion.p
              variants={reveal}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              custom={3}
              className="mt-3 text-center text-[12px] text-white/20"
            >
              Showing {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, entries.length)} de{' '}
              {entries.length} word{entries.length !== 1 ? 's' : ''}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}

