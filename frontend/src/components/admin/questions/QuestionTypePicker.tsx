import { Mic, BookOpen, Headphones, PenLine, type LucideIcon } from 'lucide-react';
import type { QuestionType } from '../../../types/question';

const TYPE_OPTIONS: { type: QuestionType; Icon: LucideIcon; label: string; desc: string }[] = [
  { type: 'SPEAKING',               Icon: Mic,       label: 'Speaking',      desc: 'Pronunciation & fluency' },
  { type: 'READING',                Icon: BookOpen,  label: 'Reading',       desc: 'Comprehension & options' },
  { type: 'LISTENING_SHADOWING',    Icon: Headphones, label: 'Shadowing',    desc: 'Repeat what you hear' },
  { type: 'LISTENING_COMPREHENSION',Icon: Headphones, label: 'Comprehension',desc: 'Listen & answer' },
  { type: 'WRITING',                Icon: PenLine,   label: 'Writing',       desc: 'Free text, AI graded' },
];

interface Props {
  selected: QuestionType | null;
  onSelect: (type: QuestionType) => void;
}

export default function QuestionTypePicker({ selected, onSelect }: Readonly<Props>) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {TYPE_OPTIONS.slice(0, 4).map((opt) => (
          <TypeCard key={opt.type} {...opt} active={selected === opt.type} onSelect={onSelect} />
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <div className="w-[calc(50%-6px)]">
          <TypeCard {...TYPE_OPTIONS[4]} active={selected === TYPE_OPTIONS[4].type} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

interface TypeCardProps {
  type: QuestionType;
  Icon: LucideIcon;
  label: string;
  desc: string;
  active: boolean;
  onSelect: (type: QuestionType) => void;
}

function TypeCard({ type, Icon, label, desc, active, onSelect }: Readonly<TypeCardProps>) {
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={`w-full text-left p-4 rounded-xl border transition-colors duration-150 ${
        active
          ? 'border-violet-500/50 bg-violet-500/[0.07]'
          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <Icon className={`h-4 w-4 mb-2.5 ${active ? 'text-violet-400' : 'text-white/40'}`} />
      <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] mb-0.5 ${active ? 'text-violet-300' : 'text-white/70'}`}>
        {label}
      </p>
      <p className="text-[12px] text-white/30">{desc}</p>
    </button>
  );
}
