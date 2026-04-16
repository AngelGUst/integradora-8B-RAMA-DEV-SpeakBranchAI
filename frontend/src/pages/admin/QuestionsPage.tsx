import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { questionsService, type QuestionFilters } from '../../services/questionsService';
import type { Question } from '../../types/question';
import QuestionRow from '../../components/admin/questions/QuestionRow';
import QuestionFilter, { type FilterState } from '../../components/admin/questions/QuestionFilters';
import CreateQuestionModal from '../../components/admin/questions/CreateQuestionModal';
import EditQuestionModal from '../../components/admin/questions/EditQuestionModal';
import AppSidebar from '@/shared/components/layout/AppSidebar';

// ── Animation (matches LandingPage) ───────────────────────────

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
    <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05] animate-pulse last:border-b-0">
      <div className="w-6 h-3 rounded bg-white/[0.03] shrink-0" />
      <div className="w-7 h-7 rounded-lg bg-white/[0.03] shrink-0" />
      <div className="flex-1 h-3 rounded bg-white/[0.03]" />
      <div className="hidden md:flex items-center gap-2">
        <div className="w-8 h-5 rounded-md bg-white/[0.03]" />
        <div className="w-14 h-5 rounded-md bg-white/[0.03]" />
        <div className="w-20 h-5 rounded-md bg-white/[0.03]" />
      </div>
      <div className="w-12 h-5 rounded-md bg-white/[0.03] hidden sm:block" />
      <div className="w-14 h-7 rounded-lg bg-white/[0.03]" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

const INITIAL_FILTERS: FilterState = {
  type: '', level: '', difficulty: '', category: '', search: '',
};

export default function QuestionsPage() {
  const { ref, inView } = useReveal();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [showCreate, setShowCreate] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [pageSizeInput, setPageSizeInput] = useState('10');

  function applyPageSize() {
    const n = Number.parseInt(pageSizeInput, 10);
    if (!Number.isNaN(n) && n >= 1) {
      setPageSize(n);
      setPage(1);
    } else {
      setPageSizeInput(String(pageSize));
    }
  }

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const apiFilters: QuestionFilters = {
        ...(filters.type       ? { type:       filters.type       } : {}),
        ...(filters.level      ? { level:      filters.level      } : {}),
        ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
        ...(filters.category   ? { category:   filters.category   } : {}),
      };
      setQuestions(await questionsService.getQuestions(apiFilters));
    } catch {
      // silent — keep existing list
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.level, filters.difficulty, filters.category]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // Reset to page 1 when filters or pageSize change
  useEffect(() => { setPage(1); }, [filters, pageSize]);

  // Client-side text search
  const visible = filters.search
    ? questions.filter((q) =>
        q.text.toLowerCase().includes(filters.search.toLowerCase())
      )
    : questions;

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paginated = visible.slice((page - 1) * pageSize, page * pageSize);

  const handleTry = (q: Question) => {
    window.open(`/exercise/${q.id}?from=admin`, '_blank');
  };

  const handleDelete = async () => {
    if (confirmDeleteId === null) return;
    setDeleting(true);
    try {
      await questionsService.deleteQuestion(confirmDeleteId);
      setQuestions((prev) => prev.filter((q) => q.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch {
      // silent
    } finally {
      setDeleting(false);
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
            <span className="font-mono text-[11px] text-white/20 tracking-widest">004</span>
            <span className="h-px flex-1 max-w-[32px] bg-white/[0.06]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
              Question Bank
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-[-0.03em] text-[#f5f3ff] mb-8">
            Manage your question bank.
          </h1>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full">
              <QuestionFilter filters={filters} onChange={setFilters} />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Page size input */}
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
                New question
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Question list ── */}
        <motion.div
          variants={reveal}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          custom={1}
          className="border border-white/[0.05] rounded-2xl overflow-hidden bg-white/[0.01]"
        >
          {loading && (
            Array.from({ length: pageSize }, (_, n) => `skeleton-${n}`).map(key => <SkeletonRow key={key} />)
          )}
          {!loading && visible.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24">
              <p className="text-[14px] text-white/25 leading-relaxed">
                No questions yet. Create your first one.
              </p>
            </div>
          )}
          {!loading && visible.length > 0 && (
            paginated.map((q, i) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={(page - 1) * pageSize + i + 1}
                onEdit={setEditQuestion}
                onDelete={setConfirmDeleteId}
                onTry={handleTry}
              />
            ))
          )}
        </motion.div>

        {/* Pagination */}
        {!loading && visible.length > 0 && (
          <motion.div
            variants={reveal}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            custom={2}
            className="mt-4 flex items-center justify-between"
          >
            <p className="text-[12px] text-white/20">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, visible.length)} de {visible.length} pregunta{visible.length === 1 ? '' : 's'}
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
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p) =>
                  p === '…' ? (
                    <span key={`ellipsis-${p}`} className="px-1 text-[12px] text-white/20">…</span>
                  ) : (
                    <button
                      key={p}
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

      {/* ── Modals ── */}
      {showCreate && (
        <CreateQuestionModal
          onClose={() => setShowCreate(false)}
          onCreate={(q) => setQuestions((prev) => [q, ...prev])}
        />
      )}

      {editQuestion && (
        <EditQuestionModal
          question={editQuestion}
          onClose={() => setEditQuestion(null)}
          onUpdate={(updated) =>
            setQuestions((prev) =>
              prev.map((q) => (q.id === updated.id ? updated : q))
            )
          }
        />
      )}

      {/* ── Confirm delete ── */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0D0D12] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-[15px] font-black tracking-[-0.02em] text-white/90 mb-2">
              Delete question?
            </h3>
            <p className="text-[13px] text-white/35 mb-6 leading-relaxed">
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-[13px] text-white/35 hover:text-white/60 transition-colors rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500/[0.12] hover:bg-red-500/[0.22] border border-red-500/20 text-red-400/80 hover:text-red-400 text-[13px] font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
