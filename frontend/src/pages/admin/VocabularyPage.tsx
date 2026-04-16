import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Plus, Search, Loader2, X, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import AppSidebar from '@/shared/components/layout/AppSidebar';
import type { VocabularyWord } from '@/services/questionsService';

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(err.detail ?? 'Unknown error');
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const INPUT =
  'w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors';
const LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30 mb-1.5';

// ── Animation (matches QuestionsPage) ─────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE, delay: i * 0.07 },
  }),
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-72px' });
  return { ref, inView };
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 border-b border-white/[0.05] animate-pulse last:border-b-0">
      <div className="h-3 rounded bg-white/[0.03]" />
      <div className="h-3 rounded bg-white/[0.03]" />
      <div className="w-8 h-3 rounded bg-white/[0.03]" />
      <div className="w-12 h-3 rounded bg-white/[0.03]" />
      <div className="w-14 h-6 rounded-lg bg-white/[0.03]" />
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────

interface FormState {
  word: string;
  meaning: string;
  pronunciation: string;
  example_sentence: string;
  level: string;
  category: string;
  image_url: string;
  audio_url: string;
  daily_flag: boolean;
}

const EMPTY_FORM: FormState = {
  word: '', meaning: '', pronunciation: '', example_sentence: '',
  level: 'A1', category: '', image_url: '', audio_url: '', daily_flag: true,
};

// ── Word Form Modal ────────────────────────────────────────────

function WordFormModal({
  initial,
  onClose,
  onSaved,
}: Readonly<{
  initial?: VocabularyWord;
  onClose: () => void;
  onSaved: (word: VocabularyWord) => void;
}>) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          word: initial.word,
          meaning: initial.meaning,
          pronunciation: initial.pronunciation,
          example_sentence: initial.example_sentence,
          level: initial.level,
          category: initial.category,
          image_url: initial.image_url ?? '',
          audio_url: initial.audio_url ?? '',
          daily_flag: true,
        }
      : EMPTY_FORM,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.word.trim() || !form.meaning.trim()) {
      setError('Palabra y significado son obligatorios.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        word: form.word.trim(),
        meaning: form.meaning.trim(),
        pronunciation: form.pronunciation.trim(),
        example_sentence: form.example_sentence.trim(),
        level: form.level,
        category: form.category.trim(),
        image_url: form.image_url.trim() || null,
        audio_url: form.audio_url.trim() || null,
        daily_flag: form.daily_flag,
      };
      const res = initial
        ? await apiFetch<{ data: VocabularyWord }>(`/vocabulary/${initial.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
        : await apiFetch<{ data: VocabularyWord }>('/vocabulary/', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
      onSaved(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center px-4 pb-10 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0D0D12] border border-white/[0.08] rounded-2xl max-w-lg w-full">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
            <h2 className="text-[16px] font-black tracking-[-0.02em] text-white/90">
              {initial ? 'Editar palabra' : 'Nueva palabra'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label htmlFor="vocab-word" className={LABEL}>Palabra *</label>
                <input id="vocab-word" className={INPUT} value={form.word} onChange={set('word')} placeholder="e.g. apple" />
              </div>
              <div>
                <label htmlFor="vocab-level" className={LABEL}>Nivel *</label>
                <select id="vocab-level" className={INPUT} value={form.level} onChange={set('level')}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="vocab-category" className={LABEL}>Categoría</label>
                <input id="vocab-category" className={INPUT} value={form.category} onChange={set('category')} placeholder="e.g. Food" />
              </div>
              <div className="col-span-2">
                <label htmlFor="vocab-meaning" className={LABEL}>Significado *</label>
                <textarea id="vocab-meaning" className={`${INPUT} resize-none`} rows={2} value={form.meaning} onChange={set('meaning')} placeholder="Definición o traducción" />
              </div>
              <div>
                <label htmlFor="vocab-pronunciation" className={LABEL}>Pronunciación</label>
                <input id="vocab-pronunciation" className={INPUT} value={form.pronunciation} onChange={set('pronunciation')} placeholder="/ˈæp.əl/" />
              </div>
              <div>
                <label htmlFor="vocab-audio-url" className={LABEL}>URL Audio <span className="normal-case font-normal text-white/20">(opcional)</span></label>
                <input id="vocab-audio-url" className={INPUT} value={form.audio_url} onChange={set('audio_url')} placeholder="https://… — o déjalo vacío para usar TTS" />
              </div>
              <div className="col-span-2">
                <label htmlFor="vocab-example" className={LABEL}>Oración de ejemplo</label>
                <textarea id="vocab-example" className={`${INPUT} resize-none`} rows={2} value={form.example_sentence} onChange={set('example_sentence')} placeholder="I eat an apple every day." />
              </div>
              <div className="col-span-2">
                <label htmlFor="vocab-image-url" className={LABEL}>URL Imagen</label>
                <input id="vocab-image-url" className={INPUT} value={form.image_url} onChange={set('image_url')} placeholder="https://…" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="daily_flag"
                  checked={form.daily_flag}
                  onChange={(e) => setForm((p) => ({ ...p, daily_flag: e.target.checked }))}
                  className="accent-violet-500 w-4 h-4"
                />
                <label htmlFor="daily_flag" className="text-[12px] text-white/50 cursor-pointer">
                  Incluir en vocabulario diario
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.05]">
            <button onClick={onClose} className="text-[13px] text-white/30 hover:text-white/60 transition-colors px-3 py-2 rounded-xl">
              Cancelar
            </button>
            <div className="flex flex-col items-end gap-1.5">
              {error && <p className="text-[11px] text-red-400/70 max-w-[240px] text-right">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[13px] font-semibold text-white transition-colors"
              >
                {submitting ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function VocabularyPage() {
  const { ref, inView } = useReveal();

  const [words, setWords]           = useState<VocabularyWord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [levelFilter, setLevelFilter]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<VocabularyWord | null>(null);
  const [deleting, setDeleting]     = useState<number | null>(null);

  // Pagination
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(5);
  const [pageSizeInput, setPageSizeInput] = useState<string>('20');

  function applyPageSize() {
    const n = Number.parseInt(pageSizeInput, 10);
    if (!Number.isNaN(n) && n >= 1) { setPageSize(n); setPage(1); }
    else setPageSizeInput(String(pageSize));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (levelFilter) params.set('level', levelFilter);
      if (search.trim()) params.set('search', search.trim());
      const qs = params.toString() ? `?${params}` : '';
      const res = await apiFetch<{ data: VocabularyWord[] }>(
        `/vocabulary/${qs}`
      );
      setWords(res.data);
    } catch {
      setError('No se pudo cargar el vocabulario.');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => { setPage(1); }, [search, levelFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(words.length / pageSize));
  const paginated  = words.slice((page - 1) * pageSize, page * pageSize);

  const handleSaved = (saved: VocabularyWord) => {
    setWords((prev) => {
      const idx = prev.findIndex((w) => w.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setShowCreate(false);
    setEditing(null);
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await apiFetch(`/vocabulary/${id}/`, { method: 'DELETE' });
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // silent — keep word in list
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#06060A] text-[#f5f3ff]">
      <AppSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-5">

          {/* ── Section header ── */}
          <motion.div
            ref={ref}
            variants={reveal}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[11px] text-white/20 tracking-widest">005</span>
              <span className="h-px flex-1 max-w-[32px] bg-white/[0.06]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Vocabulary Bank
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-[-0.03em] text-[#f5f3ff] mb-8">
              Manage your vocabulary bank.
            </h1>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-3 flex-1 w-full">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar palabra…"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                {/* Level filter */}
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white/60 focus:outline-none focus:border-violet-500/50 transition-colors"
                >
                  <option value="">Todos los niveles</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Page size */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/30 whitespace-nowrap">Show</span>
                  <input
                    type="number"
                    min={1}
                    value={pageSizeInput}
                    onChange={(e) => setPageSizeInput(e.target.value)}
                    onBlur={applyPageSize}
                    onKeyDown={(e) => e.key === 'Enter' && applyPageSize()}
                    className="w-14 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/70 text-[12px] px-2 py-1.5 text-center focus:outline-none focus:border-violet-500/50 transition-colors"
                    style={{ colorScheme: 'dark' }}
                  />
                  <span className="text-[11px] text-white/30">rows</span>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-[13px] font-semibold text-white transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Nueva palabra
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Table ── */}
          <motion.div
            variants={reveal}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            custom={1}
            className="border border-white/[0.05] rounded-2xl overflow-hidden bg-white/[0.01]"
          >
            {/* Table header */}
            <div className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.05] text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
              <span>Palabra</span>
              <span>Significado</span>
              <span>Nivel</span>
              <span>Categoría</span>
              <span />
            </div>

            {loading && (
              Array.from({ length: pageSize }, (_, i) => `skeleton-${i}`).map((key) => <SkeletonRow key={key} />)
            )}

            {!loading && error && (
              <p className="text-center py-10 text-[13px] text-red-400/70">{error}</p>
            )}

            {!loading && !error && words.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24">
                <p className="text-[14px] text-white/25 leading-relaxed">
                  {search || levelFilter ? 'No se encontraron palabras.' : 'Aún no hay palabras de vocabulario.'}
                </p>
              </div>
            )}

            {!loading && !error && paginated.map((w) => (
              <div
                key={w.id}
                className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white/80 truncate">{w.word}</p>
                  {w.pronunciation && (
                    <p className="text-[11px] font-mono text-violet-400/50 truncate">{w.pronunciation}</p>
                  )}
                </div>
                <p className="text-[12px] text-white/40 truncate">{w.meaning}</p>
                <span className="text-[11px] font-mono text-white/30">{w.level}</span>
                <span className="text-[11px] text-white/25 truncate">{w.category || '—'}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {w.audio_url && (
                    <span title="Tiene audio" className="text-violet-400/40">
                      <Star className="h-3 w-3" />
                    </span>
                  )}
                  <button
                    onClick={() => setEditing(w)}
                    className="px-2.5 py-1 rounded-lg text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={deleting === w.id}
                    className="px-2.5 py-1 rounded-lg text-[11px] text-red-400/40 hover:text-red-400/70 hover:bg-red-500/[0.06] transition-colors disabled:opacity-30"
                  >
                    {deleting === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Pagination */}
          {!loading && !error && words.length > 0 && (
            <motion.div
              variants={reveal}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              custom={2}
              className="mt-4 flex items-center justify-between"
            >
              <p className="text-[12px] text-white/20">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, words.length)} de {words.length} palabra{words.length === 1 ? '' : 's'}
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<{ key: string; value: number | '…' }[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push({ key: `ellipsis-before-${p}`, value: '…' });
                    acc.push({ key: `page-${p}`, value: p });
                    return acc;
                  }, [])
                  .map(({ key, value: p }) =>
                    p === '…' ? (
                      <span key={key} className="px-1 text-[12px] text-white/20">…</span>
                    ) : (
                      <button
                        key={key}
                        onClick={() => setPage(p)}
                        className={`min-w-[28px] h-7 rounded-lg text-[12px] font-medium transition-colors ${
                          page === p
                            ? 'bg-violet-600 text-white'
                            : 'text-white/30 hover:text-white/70 hover:bg-white/[0.05]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {showCreate && (
        <WordFormModal onClose={() => setShowCreate(false)} onSaved={handleSaved} />
      )}
      {editing && (
        <WordFormModal initial={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
