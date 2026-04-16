import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';

const LEVEL_COLORS: Record<string, string> = {
  A1: '#7c3aed',
  A2: '#6d28d9',
  B1: '#5b21b6',
  B2: '#4c1d95',
  C1: '#6d28d9',
  C2: '#7c3aed',
};

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface TooltipPayload {
  value: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D0D12] border border-white/[0.08] rounded-xl px-3 py-2">
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-white/90">
        {payload[0].value} students
      </p>
    </div>
  );
}

export default function LevelDistributionChart() {
  const [chartData, setChartData] = useState<{ level: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService.getDistributions()
      .then((d) => {
        setChartData(
          LEVELS.map((l) => ({ level: l, count: d.by_level[l] ?? 0 }))
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-5">
        Users by level
      </p>

      {loading ? (
        <div className="h-44 rounded-xl bg-white/[0.03] animate-pulse" />
      ) : error || chartData.every((d) => d.count === 0) ? (
        <div className="h-44 flex items-center justify-center">
          <span className="text-[13px] text-white/20">No data yet</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 300 }}>
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="level"
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
                    <Cell key={entry.level} fill={LEVEL_COLORS[entry.level] ?? '#7c3aed'} />
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
