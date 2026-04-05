import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { Loader2, Search, X, Star, StarOff, Plus } from 'lucide-react';
import { questionsService } from '../../../services/questionsService';
import type { QuestionVocabularyItem, VocabularyWord } from '../../../services/questionsService';
import { INPUT, LABEL } from './questionFormUtils';

interface Props {
  questionId: number;
  questionLevel: string;
}

export default function VocabularyPanel({ questionId, questionLevel }: Props) {
  const [linked, setLinked]         = useState<QuestionVocabularyItem[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(true);

  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<VocabularyWord[]>([]);
  const [searching, setSearching]         = useState(false);

  const [adding, setAdding]   = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError]     = useState<string | null>(null);

  // Load linked vocabulary on mount
  const loadLinked = useCallback(async () => {
    setLoadingLinked(true);
    try {
      const items = await questionsService.getQuestionVocabulary(questionId);
      setLinked(items);
    } catch {
      setError('No se pudo cargar el vocabulario.');
    } finally {
      setLoadingLinked(false);
    }
  }, [questionId]);

  useEffect(() => { loadLinked(); }, [loadLinked]);

  // Search vocabulary bank
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
        const token = localStorage.getItem('sb_access_token');
        const params = new URLSearchParams({ level: questionLevel, search: searchQuery });
        const res = await fetch(`${API_BASE}/api/vocabulary/?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          // VocabularyListView returns { data: [...] }
          const words: VocabularyWord[] = json.data ?? [];
          const linkedIds = new Set(linked.map((l) => l.vocabulary.id));
          setSearchResults(words.filter((w) => !linkedIds.has(w.id)));
        }
      } catch {
        /* silent */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery, questionLevel, linked]);

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
      setSearchResults((prev) => prev.filter((w) => w.id !== vocab.id));
    } catch {
      setError('No se pudo agregar la palabra.');
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
      setError('No se pudo eliminar la palabra.');
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
      setError('No se pudo actualizar la palabra.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Linked vocabulary */}
      <div>
        <label className={LABEL}>Palabras vinculadas</label>

        {loadingLinked ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/20" />
          </div>
        ) : linked.length === 0 ? (
          <p className="text-[12px] text-white/20 py-4 text-center">
            Ninguna palabra vinculada todavía.
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
        <label className={LABEL}>Agregar del banco de vocabulario</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder={`Buscar palabras de nivel ${questionLevel}…`}
            className={`${INPUT} pl-9`}
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-white/20" />
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {searchResults.map((word) => (
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
                  Añadir
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.trim() && !searching && searchResults.length === 0 && (
          <p className="text-[11px] text-white/20 mt-2 text-center">
            No se encontraron palabras disponibles.
          </p>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-400/70 text-center">{error}</p>
      )}
    </div>
  );
}
