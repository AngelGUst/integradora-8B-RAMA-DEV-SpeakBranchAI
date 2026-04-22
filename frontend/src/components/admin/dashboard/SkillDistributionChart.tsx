import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';

const SKILL_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'SPEAKING',                 label: 'Speaking',  color: '#7c3aed' },
  { key: 'READING',                  label: 'Reading',   color: '#0891b2' },
  { key: 'LISTENING_SHADOWING',      label: 'Shadowing', color: '#059669' },
  { key: 'LISTENING_COMPREHENSION',  label: 'Listening', color: '#d97706' },
  { key: 'WRITING',                  label: 'Writing',   color: '#db2777' },
];

interface TooltipPayload {
  value: number;
  payload: { skill: string };
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const cfg = SKILL_CONFIG.find((s) => s.key === payload[0].payload.skill);
  return (
    <div className="bg-[#0D0D12] border border-white/[0.08] rounded-xl px-3 py-2">
      <p className="text-[11px] text-white/40 mb-1">{cfg?.label ?? payload[0].payload.skill}</p>
      <p className="text-[13px] font-semibold text-white/90">
        {payload[0].value} attempts
      </p>
    </div>
  );
}

export default function SkillDistributionChart() {
  const [chartData, setChartData] = useState<{ skill: string; label: string; count: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService.getDistributions()
      .then((d) => {
        setChartData(
          SKILL_CONFIG.map((cfg) => ({
            skill: cfg.key,
            label: cfg.label,
            count: d.by_skill[cfg.key] ?? 0,
            color: cfg.color,
          }))
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-5">
        Attempts by skill
      </p>

      {loading ? (
        <div className="h-44 rounded-xl bg-white/[0.03] animate-pulse" />
      ) : error || chartData.every((d) => d.count === 0) ? (
        <div className="h-44 flex items-center justify-center">
          <span className="text-[13px] text-white/20">No data yet</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 320 }}>
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.skill} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
