import { useState, useCallback } from 'react';

const XP_KEY   = 'sb_total_xp';
const DONE_KEY = 'sb_completed_exercises';

function readXP(): number {
  return Number(localStorage.getItem(XP_KEY) ?? 0);
}

function readCompleted(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function useLearnProgress() {
  const [totalXP,      setTotalXP]      = useState<number>(readXP);
  const [completedIds, setCompletedIds] = useState<string[]>(readCompleted);

  const completeExercise = useCallback((exerciseId: string, xpEarned: number) => {
    setCompletedIds(prev => {
      const next = [...new Set([...prev, exerciseId])];
      localStorage.setItem(DONE_KEY, JSON.stringify(next));
      return next;
    });
    setTotalXP(prev => {
      const next = prev + xpEarned;
      localStorage.setItem(XP_KEY, String(next));
      return next;
    });
  }, []);

  return { totalXP, completedIds, completeExercise };
}
