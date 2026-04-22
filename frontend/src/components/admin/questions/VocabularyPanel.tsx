import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { Loader2, Search, X, Star, StarOff, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { questionsService } from '../../../services/questionsService';
import type { QuestionVocabularyItem, VocabularyWord } from '../../../services/questionsService';
import { INPUT, LABEL } from './questionFormUtils';

interface Props {
  questionId: number;
}

export default function VocabularyPanel({ questionId }: Props) {
  const [linked, setLinked]               = useState<QuestionVocabularyItem[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [allWords, setAllWords]       = useState<VocabularyWord[]>([]);
  const [loadingBank, setLoadingBank] = useState(true);

  const [adding, setAdding]     = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  // Load linked vocabulary on mount
  const loadLinked = useCallback(async () => {
    setLoadingLinked(true);
    try {
      const items = await questionsService.getQuestionVocabulary(questionId);
      setLinked(items);
    } catch {
      setError('Could not load vocabulary.');
    } finally {
      setLoadingLinked(false);
    }
  }, [questionId]);

  useEffect(() => { loadLinked(); }, [loadLinked]);

  // Load full vocabulary bank once (no level filter - admin can link any word)
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
    const token = localStorage.getItem('sb_access_token');
    setLoadingBank(true);
    fetch(`${API_BASE}/vocabulary/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setAllWords(json.data ?? []))
      .catch(() => { /* silent */ })
      .finally(() => setLoadingBank(false));
  }, []);

  // Derive search results client-side
  const linkedIds = new Set(linked.map(l => l.vocabulary.id));
  const query = searchQuery.trim().toLowerCase();
  const searchResults = allWords.filter(w => {
    if (linkedIds.has(w.id)) return false;
    if (!query) return true;
    return w.word.toLowerCase().includes(query) || w.meaning.toLowerCase().includes(query);
  });

  // Reset to page 1 when query changes
  useEffect(() => { setPage(1); }, [searchQuery]);

  const totalPages  = Math.max(1, Math.ceil(searchResults.length / PAGE_SIZE));
  const paginated   = searchResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async (vocab: VocabularyWord) => {
    setAdding(vocab.id);
    setError(null);
    try {
      const item = await questionsService.addVocabularyToQuestion(questionId, {
        vocabulary_id: vocab.id,
        is_key: false,
        order: 0,
      });
      setLinked((prev) => [...prev, item]);
    } catch {
      setError('Could not add the word.');
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (item: QuestionVocabularyItem) => {
    setRemoving(item.id);
    setError(null);
    try {
      await questionsService.removeVocabularyFromQuestion(questionId, item.vocabulary.id);
      setLinked((prev) => prev.filter((l) => l.id !== item.id));
    } catch {
      setError('Could not delete the word.');
    } finally {
      setRemoving(null);
    }
  };

  const handleToggleKey = async (item: QuestionVocabularyItem) => {
    setError(null);
    try {
      const updated = await questionsService.addVocabularyToQuestion(questionId, {
        vocabulary_id: item.vocabulary.id,
        is_key: !item.is_key,
        order: item.order,
      });
      setLinked((prev) => prev.map((l) => (l.id === item.id ? updated : l)));
    } catch {
      setError('Could not update the word.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Linked vocabulary */}
      <div>
        <label className={LABEL}>Linked words</label>

        {loadingLinked ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/20" />
          </div>
        ) : linked.length === 0 ? (
          <p className="text-[12px] text-white/20 py-4 text-center">
            No linked words yet.
          </p>
        ) : (
          <div className="space-y-2">
            {linked
              .slice()
              .sort((a, b) => Number(b.is_key) - Number(a.is_key))
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  {/* Key toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleKey(item)}
                    title={item.is_key ? 'Quitar clave' : 'Marcar como clave'}
                    className={`shrink-0 transition-colors ${
                      item.is_key
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-white/20 hover:text-white/50'
                    }`}
                  >
                    {item.is_key ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
                  </button>

                  {/* Word info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white/80 truncate">
                      {item.vocabulary.word}
                      {item.is_key && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                          clave
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-white/30 truncate">{item.vocabulary.meaning}</p>
                  </div>

                  {/* Level badge */}
                  <span className="text-[10px] font-mono text-white/20 shrink-0">{item.vocabulary.level}</span>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    disabled={removing === item.id}
                    className="shrink-0 p-1 rounded-lg text-white/20 hover:text-red-400/70 hover:bg-red-500/[0.06] transition-colors disabled:opacity-30"
                  >
                    {removing === item.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <X className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Search to add */}
      <div>
        <label className={LABEL}>Add from vocabulary bank</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search by word or meaning..."
            className={`${INPUT} pl-9`}
          />
          {loadingBank && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-white/20" />
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {paginated.map((word) => (
              <div
                key={word.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-violet-500/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white/70 truncate">{word.word}</p>
                  <p className="text-[11px] text-white/25 truncate">{word.meaning}</p>
                </div>
                <span className="text-[10px] font-mono text-white/20 shrink-0">{word.level}</span>
                <button
                  type="button"
                  onClick={() => handleAdd(word)}
                  disabled={adding === word.id}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300/70 hover:text-violet-300 text-[11px] font-semibold transition-colors disabled:opacity-30"
                >
                  {adding === word.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Plus className="h-3 w-3" />}
                  Add
                </button>
              </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-white/20">
                {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, searchResults.length)} de {searchResults.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded-md border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px] text-white/25 px-1">{page}/{totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded-md border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!loadingBank && searchQuery.trim() && searchResults.length === 0 && (
          <p className="text-[11px] text-white/20 mt-2 text-center">
            No words found matching "{searchQuery}".
          </p>
        )}

        {!loadingBank && !searchQuery.trim() && allWords.length === 0 && (
          <p className="text-[11px] text-white/20 mt-2 text-center">
            The vocabulary bank is empty.
          </p>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-400/70 text-center">{error}</p>
      )}
    </div>
  );
}

