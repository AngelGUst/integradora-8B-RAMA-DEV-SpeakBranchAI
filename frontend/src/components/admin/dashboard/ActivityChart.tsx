import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService, type ActivityDataPoint } from '@/services/dashboardService';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface TooltipPayload {
  value: number;
}

function CustomTooltip({ active, payload, label }: Readonly<{
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D0D12] border border-white/[0.08] rounded-xl px-3 py-2">
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-white/90">
        {payload[0].value} attempts
      </p>
    </div>
  );
}

export default function ActivityChart() {
  const [data, setData] = useState<ActivityDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService.getActivity(30)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    attempts: d.attempts,
  }));

  let content = (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 480 }}>
        <ResponsiveContainer width="100%" height={192}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              stroke="#ffffff"
              strokeOpacity={0.04}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(124,58,237,0.3)', strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="attempts"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (loading) {
    content = <div className="h-48 rounded-xl bg-white/[0.03] animate-pulse" />;
  } else if (error) {
    content = (
      <div className="h-48 flex items-center justify-center">
        <span className="text-[13px] text-white/20">Failed to load activity data</span>
      </div>
    );
  } else if (chartData.length === 0) {
    content = (
      <div className="h-48 flex items-center justify-center">
        <span className="text-[13px] text-white/20">No data yet</span>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-5">
        Activity — last 30 days
      </p>

      {content}
    </div>
  );
}
