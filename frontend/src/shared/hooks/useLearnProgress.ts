import { useState, useCallback, useEffect } from 'react';

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
  return res.json() as Promise<T>;
}

interface ProgressResponse {
  total_xp: number;
  streak_days: number;
  completed_question_ids: string[];
  question_scores: Record<string, number>;
  average_speaking?: number;
  average_reading?: number;
  average_listening?: number;
  average_writing?: number;
  level_progress?: {
    current_level: string;
    next_level: string | null;
    required_xp: number;
    current_xp: number;
    current_level_xp: number;
    remaining_xp: number;
    progress_percentage: number;
    diagnostic_completed: boolean;
    can_take_level_exam: boolean;
    at_max_level: boolean;
  };
}

export type SkillAverages = {
  speaking: number;
  reading: number;
  listening: number;
  writing: number;
};

// ── Module-level cache — shared across all hook instances ─────────────────────
// Prevents duplicate /auth/progress/ fetches when navigating between pages.
let _cachedProgress: ProgressResponse | null = null;
let _lastFetch = 0;
const STALE_MS = 30_000; // re-fetch only after 30 s

function applyProgress(
  data: ProgressResponse,
  setters: {
    setTotalXP: (v: number) => void;
    setCompletedIds: (v: string[]) => void;
    setStreakDays: (v: number) => void;
    setQuestionScores: (v: Record<string, number>) => void;
    setLevelProgress: (v: ProgressResponse['level_progress']) => void;
    setSkillAverages: (v: SkillAverages) => void;
  },
) {
  setters.setTotalXP(data.total_xp);
  setters.setCompletedIds(data.completed_question_ids);
  setters.setStreakDays(data.streak_days);
  setters.setQuestionScores(data.question_scores ?? {});
  setters.setLevelProgress(data.level_progress);
  setters.setSkillAverages({
    speaking:  data.average_speaking  ?? 0,
    reading:   data.average_reading   ?? 0,
    listening: data.average_listening ?? 0,
    writing:   data.average_writing   ?? 0,
  });
}

export function useLearnProgress() {
  const [totalXP, setTotalXP] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [levelProgress, setLevelProgress] = useState<ProgressResponse['level_progress']>(undefined);
  const [skillAverages, setSkillAverages] = useState<SkillAverages>({ speaking: 0, reading: 0, listening: 0, writing: 0 });

  const setters = { setTotalXP, setCompletedIds, setStreakDays, setQuestionScores, setLevelProgress, setSkillAverages };

  useEffect(() => {
    // If we have a fresh cache, hydrate from it without a network round-trip.
    if (_cachedProgress && Date.now() - _lastFetch < STALE_MS) {
      applyProgress(_cachedProgress, setters);
      return;
    }

    apiFetch<ProgressResponse>('/auth/progress/')
      .then(data => {
        _cachedProgress = data;
        _lastFetch = Date.now();
        applyProgress(data, setters);
      })
      .catch(() => {
        setTotalXP(Number(localStorage.getItem('sb_total_xp') ?? 0));
        try {
          setCompletedIds(JSON.parse(localStorage.getItem('sb_completed_exercises') ?? '[]'));
        } catch { /* empty */ }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeExercise = useCallback(
    async (
      exerciseId: string,
      xpEarned: number,
      questionType?: string,
      score?: number,
    ) => {
      // Optimistic update
      setCompletedIds(prev => [...new Set([...prev, exerciseId])]);
      setTotalXP(prev => prev + xpEarned);
      if (score !== undefined) {
        setQuestionScores(prev => ({
          ...prev,
          [exerciseId]: Math.max(prev[exerciseId] ?? 0, score),
        }));
      }

      try {
        // POST to complete exercise
        await apiFetch<{ total_xp: number; streak_days: number }>(
          '/auth/progress/complete/',
          {
            method: 'POST',
            body: JSON.stringify({
              question_id: exerciseId,
              question_type: questionType ?? '',
              score: score ?? 0,
              xp_earned: xpEarned,
            }),
          }
        );

        // ★ RE-FETCH full progress to sync with server
        const updatedProgress = await apiFetch<ProgressResponse>(
          '/auth/progress/'
        );
        _cachedProgress = updatedProgress;
        _lastFetch = Date.now();
        applyProgress(updatedProgress, setters);
        localStorage.setItem('sb_total_xp', String(updatedProgress.total_xp));
      } catch (err) {
        console.error('Error completing exercise:', err);
        // Keep optimistic update — will sync on next load
      }
    },
    []
  );

  return { totalXP, completedIds, streakDays, questionScores, skillAverages, levelProgress, completeExercise };
}
