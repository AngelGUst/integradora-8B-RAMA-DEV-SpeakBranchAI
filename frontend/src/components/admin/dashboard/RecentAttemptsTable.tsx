import { useEffect, useState } from 'react';
import { dashboardService, type RecentAttempt } from '@/services/dashboardService';

const SKILL_LABELS: Record<string, string> = {
  SPEAKING: 'Speaking',
  READING: 'Reading',
  LISTENING_SHADOWING: 'Shadowing',
  LISTENING_COMPREHENSION: 'Listening',
  WRITING: 'Writing',
};

const SKILL_COLORS: Record<string, string> = {
  SPEAKING: 'bg-violet-500/[0.12] text-violet-400/80',
  READING: 'bg-cyan-500/[0.12] text-cyan-400/80',
  LISTENING_SHADOWING: 'bg-emerald-500/[0.12] text-emerald-400/80',
  LISTENING_COMPREHENSION: 'bg-amber-500/[0.12] text-amber-400/80',
  WRITING: 'bg-pink-500/[0.12] text-pink-400/80',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 animate-pulse">
      <div className="flex-1 h-3 rounded bg-white/[0.05]" />
      <div className="w-20 h-5 rounded-md bg-white/[0.05]" />
      <div className="w-10 h-3 rounded bg-white/[0.05]" />
      <div className="w-12 h-3 rounded bg-white/[0.05]" />
      <div className="w-14 h-3 rounded bg-white/[0.05]" />
    </div>
  );
}

export default function RecentAttemptsTable() {
  const [data, setData] = useState<RecentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService.getRecentAttempts()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const skeletonRows = Array.from({ length: 6 }, (_, index) => `skeleton-${index}`);

  let content = data.map((a, i) => (
    <div
      key={`${a.student_name}-${a.created_at}-${i}`}
      className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015] transition-colors"
    >
      <p className="flex-1 text-[13px] text-white/70 truncate">{a.student_name}</p>

      <span
        className={`w-24 px-2 py-0.5 rounded-md text-[11px] font-semibold ${SKILL_COLORS[a.skill] ?? 'bg-white/[0.06] text-white/40'}`}
      >
        {SKILL_LABELS[a.skill] ?? a.skill}
      </span>

      <span className={`w-12 text-right text-[13px] font-semibold ${scoreColor(a.score)}`}>
        {a.score.toFixed(0)}
      </span>

      <span className="w-14 text-right text-[13px] text-white/40">
        +{a.xp_earned}
      </span>

      <span className="w-16 text-right text-[12px] text-white/25">
        {timeAgo(a.created_at)}
      </span>
    </div>
  ));

  if (loading) {
    content = skeletonRows.map((key) => <SkeletonRow key={key} />);
  } else if (error || data.length === 0) {
    content = [
      <div key="empty" className="flex items-center justify-center py-12">
        <p className="text-[13px] text-white/20">No data yet</p>
      </div>,
    ];
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.05]">
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">Student</span>
        <span className="w-24 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">Skill</span>
        <span className="w-12 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 text-right">Score</span>
        <span className="w-14 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 text-right">XP</span>
        <span className="w-16 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 text-right">When</span>
      </div>

      {content}
    </div>
  );
}
