import { Mic, BookOpen, Headphones, PenLine, Pencil, Trash2, Play, type LucideIcon } from 'lucide-react';
import type { Question, QuestionType } from '../../../types/question';
import DifficultyBadge from './DifficultyBadge';
import LevelBadge from './LevelBadge';

const TYPE_ICONS: Record<QuestionType, LucideIcon> = {
  SPEAKING:               Mic,
  READING:                BookOpen,
  LISTENING_SHADOWING:    Headphones,
  LISTENING_COMPREHENSION:Headphones,
  WRITING:                PenLine,
};

const CATEGORY_LABEL: Record<string, string> = {
  DIAGNOSTIC: 'Diagnostic',
  PRACTICE:   'Ejercicio',
  LEVEL_UP:   'Level up',
};

interface Props {
  question: Question;
  index: number;
  onEdit: (q: Question) => void;
  onDelete: (id: number) => void;
  onTry: (q: Question) => void;
}

export default function QuestionRow({ question, index, onEdit, onDelete, onTry }: Props) {
  const Icon = TYPE_ICONS[question.type];
  const truncated = question.text.length > 80
    ? question.text.slice(0, 80) + '…'
    : question.text;

  return (
    <div className="group flex items-center gap-4 px-5 py-4 border-b border-white/[0.05] hover:bg-white/[0.015] transition-colors duration-200 last:border-b-0">
      {/* Index */}
      <span className="font-mono text-[11px] text-white/20 w-6 shrink-0 text-right">
        {String(index).padStart(2, '0')}
      </span>

      {/* Type icon */}
      <div className="shrink-0 w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.05] flex items-center justify-center">
        <Icon className="h-4 w-4 text-violet-400/70" />
      </div>

      {/* Question text */}
      <p className="flex-1 text-[14px] text-white/55 truncate min-w-0">{truncated}</p>

      {/* Badges */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <LevelBadge level={question.level} />
        <DifficultyBadge difficulty={question.difficulty} />
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 bg-white/[0.04]">
          {CATEGORY_LABEL[question.category]}
        </span>
      </div>

      {/* XP badge */}
      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold text-violet-400/70 bg-violet-500/[0.07] shrink-0">
        {question.xp_max} XP
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={() => onTry(question)}
          title="Try exercise"
          className="p-1.5 rounded-lg text-white/30 hover:text-emerald-400/80 hover:bg-emerald-500/[0.07] transition-colors"
        >
          <Play className="h-4 w-4" />
        </button>
        <button
          onClick={() => onEdit(question)}
          title="Edit"
          className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(question.id)}
          title="Delete"
          className="p-1.5 rounded-lg text-white/30 hover:text-red-400/70 hover:bg-red-500/[0.06] transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
