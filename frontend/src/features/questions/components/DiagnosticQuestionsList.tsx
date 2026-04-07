import { useDiagnosticQuestions } from '@/features/questions/hooks/useDiagnosticQuestions';

interface DiagnosticQuestionsListProps {
  limit?: number;
}

export function DiagnosticQuestionsList({ limit }: DiagnosticQuestionsListProps) {
  const { data, isLoading, error, refetch } = useDiagnosticQuestions({ limit });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Loading diagnostic questions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="mb-3 font-medium">Unable to load diagnostic questions.</p>
        <p className="text-sm">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-4 inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((question) => (
        <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            {question.level} · {question.type} · {question.difficulty}
          </div>
          <p className="text-slate-900">{question.text}</p>
          {question.vocabulary_items?.length ? (
            <div className="mt-3 text-sm text-slate-500">
              Vocabulary: {question.vocabulary_items.join(', ')}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
