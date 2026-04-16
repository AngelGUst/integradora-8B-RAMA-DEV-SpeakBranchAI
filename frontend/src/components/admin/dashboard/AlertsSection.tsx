import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { dashboardService, type Alerts } from '@/services/dashboardService';

function SkeletonAlert() {
  return (
    <div className="h-12 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.05]" />
  );
}

interface AlertRowProps {
  level: 'red' | 'yellow';
  message: string;
  linkTo: string;
  linkLabel: string;
}

function AlertRow({ level, message, linkTo, linkLabel }: AlertRowProps) {
  const isRed = level === 'red';
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        isRed
          ? 'bg-red-500/[0.06] border-red-500/20'
          : 'bg-yellow-500/[0.06] border-yellow-500/20'
      }`}
    >
      {isRed ? (
        <AlertCircle className="h-4 w-4 text-red-400/80 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-400/80 shrink-0" />
      )}
      <p className={`flex-1 text-[13px] ${isRed ? 'text-red-400/80' : 'text-yellow-400/80'}`}>
        {message}
      </p>
      <Link
        to={linkTo}
        className="text-[12px] text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap shrink-0"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

export default function AlertsSection() {
  const [data, setData] = useState<Alerts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getAlerts()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonAlert />
        <SkeletonAlert />
      </div>
    );
  }

  if (!data) return null;

  const alerts: AlertRowProps[] = [];

  if (data.hard_questions > 0) {
    alerts.push({
      level: 'red',
      message: `${data.hard_questions} question${data.hard_questions > 1 ? 's are' : ' is'} too hard — students score below 30 on average`,
      linkTo: '/admin/questions?filter=hard_to_solve',
      linkLabel: 'Review',
    });
  }

  if (data.easy_questions > 0) {
    alerts.push({
      level: 'yellow',
      message: `${data.easy_questions} question${data.easy_questions > 1 ? 's are' : ' is'} too easy — consider increasing difficulty`,
      linkTo: '/admin/questions?filter=too_easy',
      linkLabel: 'Review',
    });
  }

  if (data.inactive_users > 0) {
    alerts.push({
      level: 'red',
      message: `${data.inactive_users} student${data.inactive_users > 1 ? 's haven\'t' : ' hasn\'t'} practiced in over a week`,
      linkTo: '/admin/users?filter=inactive',
      linkLabel: 'View users',
    });
  }

  if (data.no_diagnostic > 0) {
    alerts.push({
      level: 'yellow',
      message: `${data.no_diagnostic} student${data.no_diagnostic > 1 ? 's' : ''} registered but never took the placement test`,
      linkTo: '/admin/users?filter=no_diagnostic',
      linkLabel: 'View users',
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
        <div className="h-2 w-2 rounded-full bg-emerald-400/60 shrink-0" />
        <p className="text-[13px] text-white/30">No issues detected — everything looks good.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((a, i) => <AlertRow key={i} {...a} />)}
    </div>
  );
}
