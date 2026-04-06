import { useEffect, useMemo, useState } from 'react';
import type { Question } from '@/types/question';
import { questionsApi } from '@/features/questions/api/questionsApi';

interface UseDiagnosticQuestionsOptions {
  limit?: number;
  enabled?: boolean;
}

interface UseDiagnosticQuestionsState {
  data: Question[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDiagnosticQuestions(
  options: UseDiagnosticQuestionsOptions = {},
): UseDiagnosticQuestionsState {
  const { limit, enabled = true } = options;
  const [data, setData] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const stableLimit = useMemo(() => limit, [limit]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    questionsApi
      .getDiagnosticQuestions(stableLimit)
      .then((questions) => {
        if (!isMounted) return;
        setData(questions);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load diagnostic questions.';
        setError(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, reloadKey, stableLimit]);

  return {
    data,
    isLoading,
    error,
    refetch: () => setReloadKey((prev) => prev + 1),
  };
}
