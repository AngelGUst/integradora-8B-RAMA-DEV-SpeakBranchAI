import type { Difficulty } from '../../../types/question';

const MAP: Record<Difficulty, string> = {
  EASY:   'text-green-400/60 bg-green-500/[0.08]',
  MEDIUM: 'text-yellow-400/60 bg-yellow-500/[0.08]',
  HARD:   'text-red-400/60 bg-red-500/[0.08]',
};

export default function DifficultyBadge({ difficulty }: Readonly<{ difficulty: Difficulty }>) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] ${MAP[difficulty]}`}>
      {difficulty}
    </span>
  );
}
