import { useCallback, useMemo, useState } from 'react';
import { questionsService } from '../services/questionsService';
import type {
    DiagnosticAnswer,
    DiagnosticQuestion,
    DiagnosticSubmitResponse,
} from '../types/diagnostic';

export function useDiagnosticExam() {
    const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answersById, setAnswersById] = useState<Record<number, DiagnosticAnswer['answer']>>({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DiagnosticSubmitResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentQuestion = questions[currentIndex];

    const loadQuestions = useCallback(async (limit?: number) => {
        setLoading(true);
        setError(null);
        try {
            const data = await questionsService.getDiagnosticQuestions(limit);
            setQuestions(data);
            setCurrentIndex(0);
            setAnswersById({});
            setResult(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading diagnostic questions');
        } finally {
            setLoading(false);
        }
    }, []);

    const setAnswer = useCallback((questionId: number, answer: DiagnosticAnswer['answer']) => {
        setAnswersById((prev) => ({ ...prev, [questionId]: answer }));
    }, []);

    const next = useCallback(() => {
        setCurrentIndex((idx) => Math.min(idx + 1, questions.length - 1));
    }, [questions.length]);

    const prev = useCallback(() => {
        setCurrentIndex((idx) => Math.max(idx - 1, 0));
    }, []);

    const submit = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const answers: DiagnosticAnswer[] = questions
                .filter((q) => answersById[q.id] !== undefined)
                .map((q) => ({ question_id: q.id, answer: answersById[q.id] }));

            const res = await questionsService.submitDiagnostic({ answers });
            setResult(res);
            return res;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error submitting diagnostic');
            return null;
        } finally {
            setLoading(false);
        }
    }, [answersById, questions]);

    const progress = useMemo(() => {
        if (!questions.length) return 0;
        const answeredCount = questions.filter((q) => answersById[q.id] !== undefined).length;
        return Math.round((answeredCount / questions.length) * 100);
    }, [answersById, questions]);

    return {
        questions,
        currentIndex,
        currentQuestion,
        answersById,
        loading,
        error,
        result,
        progress,
        loadQuestions,
        setAnswer,
        next,
        prev,
        submit,
    };
}
