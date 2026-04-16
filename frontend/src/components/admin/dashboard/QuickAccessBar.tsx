import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';

export default function QuickAccessBar() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/admin/questions"
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-[12px] text-white/50 hover:text-white/70 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        New question
      </Link>
      <Link
        to="/admin/vocabulary"
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-[12px] text-white/50 hover:text-white/70 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        New word
      </Link>
      <Link
        to="/admin/users?filter=today"
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-[12px] text-white/50 hover:text-white/70 transition-colors"
      >
        New users today
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <Link
        to="/admin/attempts"
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-[12px] text-white/50 hover:text-white/70 transition-colors"
      >
        View all attempts
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
