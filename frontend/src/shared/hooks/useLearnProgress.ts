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
  average_speaking: number;
  average_reading: number;
  average_listening: number;
  average_writing: number;
}

export interface SkillAverages {
  speaking: number;
  reading: number;
  listening: number;
  writing: number;
}

export function useLearnProgress() {
  const [totalXP, setTotalXP] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [skillAverages, setSkillAverages] = useState<SkillAverages>({
    speaking: 0, reading: 0, listening: 0, writing: 0,
  });

  useEffect(() => {
    apiFetch<ProgressResponse>('/auth/progress/')
      .then(data => {
        setTotalXP(data.total_xp);
        setCompletedIds(data.completed_question_ids);
        setStreakDays(data.streak_days);
        setQuestionScores(data.question_scores ?? {});
        setSkillAverages({
          speaking:  data.average_speaking  ?? 0,
          reading:   data.average_reading   ?? 0,
          listening: data.average_listening ?? 0,
          writing:   data.average_writing   ?? 0,
        });
      })
      .catch(() => {
        setTotalXP(Number(localStorage.getItem('sb_total_xp') ?? 0));
        try {
          setCompletedIds(JSON.parse(localStorage.getItem('sb_completed_exercises') ?? '[]'));
        } catch { /* empty */ }
      });
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
        setTotalXP(updatedProgress.total_xp);
        setStreakDays(updatedProgress.streak_days);
        setCompletedIds(updatedProgress.completed_question_ids);
        setQuestionScores(updatedProgress.question_scores ?? {});
        setSkillAverages({
          speaking:  updatedProgress.average_speaking  ?? 0,
          reading:   updatedProgress.average_reading   ?? 0,
          listening: updatedProgress.average_listening ?? 0,
          writing:   updatedProgress.average_writing   ?? 0,
        });
        localStorage.setItem('sb_total_xp', String(updatedProgress.total_xp));
      } catch (err) {
        console.error('Error completing exercise:', err);
        // Keep optimistic update — will sync on next load
      }
    },
    []
  );

  return { totalXP, completedIds, streakDays, questionScores, skillAverages, completeExercise };
}