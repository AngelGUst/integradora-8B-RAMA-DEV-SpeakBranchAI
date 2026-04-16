import type { Level } from '../../../types/question';

export default function LevelBadge({ level }: Readonly<{ level: Level }>) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-400/60 bg-violet-500/[0.08]">
      {level}
    </span>
  );
}
