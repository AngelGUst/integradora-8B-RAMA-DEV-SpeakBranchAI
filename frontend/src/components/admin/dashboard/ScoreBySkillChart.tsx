import { useEffect, useState } from 'react';
import { dashboardService } from '@/services/dashboardService';

const SKILL_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'SPEAKING',                 label: 'Speaking',            color: '#7c3aed' },
  { key: 'READING',                  label: 'Reading',             color: '#0891b2' },
  { key: 'LISTENING_SHADOWING',      label: 'Listening Shadowing', color: '#059669' },
  { key: 'LISTENING_COMPREHENSION',  label: 'Listening Comp.',     color: '#d97706' },
  { key: 'WRITING',                  label: 'Writing',             color: '#db2777' },
];

export default function ScoreBySkillChart() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService.getScores()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30">
          Avg score by skill
        </p>
        <p className="text-[11px] text-white/20 text-right leading-relaxed max-w-[200px]">
          Avg score below 50 → review question difficulty
        </p>
      </div>

      {(() => {
        if (loading) {
          return (
            <div className="space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={`skeleton-${i}`} className="animate-pulse">
                  <div className="h-3 w-28 rounded bg-white/[0.05] mb-2" />
                  <div className="h-2.5 rounded-full bg-white/[0.05]" />
                </div>
              ))}
            </div>
          );
        }
        if (error || !data) {
          return (
            <div className="h-32 flex items-center justify-center">
              <span className="text-[13px] text-white/20">No data yet</span>
            </div>
          );
        }
        return (
          <div className="space-y-4">
          {SKILL_CONFIG.map((cfg) => {
            const score = data[cfg.key] ?? 0;
            const pct = Math.min(100, Math.max(0, score));
            const below50 = score < 50;
            return (
              <div key={cfg.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-white/50">{cfg.label}</span>
                  <span
                    className={`text-[12px] font-semibold ${
                      below50 ? 'text-red-400' : 'text-white/70'
                    }`}
                  >
                    {score.toFixed(1)}%
                  </span>
                </div>

                {/* Track */}
                <div className="relative h-2 rounded-full bg-white/[0.06]">
                  {/* Threshold line at 50% */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-white/20"
                    style={{ left: '50%' }}
                  />
                  {/* Bar */}
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cfg.color,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-2 pt-2">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] text-white/20 shrink-0">50% threshold</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>
        </div>
      );
      })()}
    </div>
  );
}
