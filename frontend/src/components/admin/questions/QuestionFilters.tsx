import { Search } from 'lucide-react';
import type { QuestionType, Level, Difficulty, Category } from '../../../types/question';

export interface FilterState {
  type: QuestionType | '';
  level: Level | '';
  difficulty: Difficulty | '';
  category: Category | '';
  search: string;
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

const SELECT =
  'bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/70 text-[13px] ' +
  'px-3 py-2 focus:border-violet-500/50 focus:outline-none transition-colors appearance-none cursor-pointer';

export default function QuestionFilters({ filters, onChange }: Props) {
  const set =
    (key: keyof FilterState) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={set('search')}
          placeholder="Search questions…"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 text-[13px] pl-9 pr-4 py-2 focus:border-violet-500/50 focus:outline-none transition-colors"
        />
      </div>

      <select value={filters.type} onChange={set('type')} className={SELECT} style={{ colorScheme: 'dark' }}>
        <option value="">All types</option>
        <option value="SPEAKING">Speaking</option>
        <option value="READING">Reading</option>
        <option value="LISTENING_SHADOWING">Shadowing</option>
        <option value="LISTENING_COMPREHENSION">Comprehension</option>
        <option value="WRITING">Writing</option>
      </select>

      <select value={filters.level} onChange={set('level')} className={SELECT} style={{ colorScheme: 'dark' }}>
        <option value="">All levels</option>
        {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as Level[]).map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <select value={filters.difficulty} onChange={set('difficulty')} className={SELECT} style={{ colorScheme: 'dark' }}>
        <option value="">All difficulties</option>
        <option value="EASY">Easy</option>
        <option value="MEDIUM">Medium</option>
        <option value="HARD">Hard</option>
      </select>

      <select value={filters.category} onChange={set('category')} className={SELECT} style={{ colorScheme: 'dark' }}>
        <option value="">All categories</option>
        <option value="DIAGNOSTIC">Examen diagnóstico</option>
        <option value="PRACTICE">Solo ejercicio</option>
        <option value="LEVEL_UP">Examen subir nivel</option>
      </select>
    </div>
  );
}
