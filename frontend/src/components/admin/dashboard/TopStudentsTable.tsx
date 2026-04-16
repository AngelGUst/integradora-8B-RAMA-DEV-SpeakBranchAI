import { useEffect, useState } from 'react';
import { dashboardService, type TopStudent } from '@/services/dashboardService';
import { Flame } from 'lucide-react';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 animate-pulse">
      <div className="w-6 h-3 rounded bg-white/[0.05] shrink-0" />
      <div className="flex-1 h-3 rounded bg-white/[0.05]" />
      <div className="w-10 h-5 rounded-md bg-white/[0.05]" />
      <div className="w-16 h-3 rounded bg-white/[0.05]" />
      <div className="w-12 h-3 rounded bg-white/[0.05]" />
    </div>
  );
}

function rankColor(rank: number) {
  if (rank === 1) return 'text-violet-400 font-black';
  if (rank <= 3) return 'text-white/40 font-semibold';
  return 'text-white/20 font-medium';
}

export default function TopStudentsTable() {
  const [data, setData] = useState<TopStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService.getTopStudents()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.05]">
        <span className="w-6 text-[11px] text-white/20 font-mono">#</span>
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">Student</span>
        <span className="w-10 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 text-center">Level</span>
        <span className="w-20 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 text-right">XP</span>
        <span className="w-16 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 text-right">Streak</span>
      </div>

      {(() => {
        if (loading) {
          return ['s1', 's2', 's3', 's4', 's5'].map((id) => <SkeletonRow key={id} />);
        }
        if (error || data.length === 0) {
          return (
            <div className="flex items-center justify-center py-12">
              <p className="text-[13px] text-white/20">No data yet</p>
            </div>
          );
        }
        return data.map((s) => (
          <div
            key={s.rank}
            className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015] transition-colors"
          >
            <span className={`w-6 text-[13px] font-mono ${rankColor(s.rank)}`}>
              {s.rank}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white/80 font-medium truncate">{s.first_name}</p>
              <p className="text-[11px] text-white/25 truncate">{s.email}</p>
            </div>

            <span className="w-10 text-center">
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-violet-500/[0.08] text-violet-400/60">
                {s.level}
              </span>
            </span>

            <span className="w-20 text-right text-[13px] text-white/60 font-medium">
              {s.total_xp.toLocaleString()}
            </span>

            <div className="w-16 flex items-center justify-end gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-400/70" />
              <span className="text-[13px] text-white/40">{s.streak_days}d</span>
            </div>
          </div>
        ));
      })()}
    </div>
  );
}
