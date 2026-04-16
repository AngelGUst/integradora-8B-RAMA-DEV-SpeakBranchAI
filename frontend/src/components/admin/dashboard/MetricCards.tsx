import { useEffect, useState } from 'react';
import { Users, Activity, Zap, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { dashboardService, type DashboardMetrics } from '@/services/dashboardService';

function SkeletonCard() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-5 animate-pulse">
      <div className="h-3 w-20 rounded bg-white/[0.05] mb-4" />
      <div className="h-8 w-24 rounded bg-white/[0.05] mb-3" />
      <div className="h-3 w-14 rounded bg-white/[0.05]" />
    </div>
  );
}

interface CardProps {
  label: string;
  value: number | string;
  trend: number;
  icon: React.ReactNode;
  format?: (n: number) => string;
}

function MetricCard({ label, value, trend, icon }: CardProps) {
  const up = trend >= 0;
  return (
    <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-4 right-4 text-white/10">{icon}</div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-3">
        {label}
      </p>
      <p className="text-[32px] font-black tracking-[-0.03em] text-[#f5f3ff] leading-none mb-2">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div className={`flex items-center gap-1 text-[12px] font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        <span>{Math.abs(trend).toFixed(1)}% vs yesterday</span>
      </div>
    </div>
  );
}

export default function MetricCards() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService.getMetrics()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-5 flex items-center justify-center">
            <span className="text-[12px] text-white/20">No data</span>
          </div>
        ))}
      </div>
    );
  }

  const iconClass = "h-6 w-6";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        label="Total usuarios"
        value={data.total_users}
        trend={data.trends.total_users}
        icon={<Users className={iconClass} />}
      />
      <MetricCard
        label="Activos hoy"
        value={data.active_today}
        trend={data.trends.active_today}
        icon={<Activity className={iconClass} />}
      />
      <MetricCard
        label="Intentos hoy"
        value={data.attempts_today}
        trend={data.trends.attempts_today}
        icon={<Zap className={iconClass} />}
      />
      <MetricCard
        label="XP promedio global"
        value={data.avg_xp.toFixed(0)}
        trend={data.trends.avg_xp}
        icon={<TrendingUp className={iconClass} />}
      />
    </div>
  );
}
