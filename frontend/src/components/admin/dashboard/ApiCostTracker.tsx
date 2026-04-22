import { useEffect, useState } from 'react';
import { dashboardService, type ApiUsage } from '@/services/dashboardService';

function fmt(n: number) {
  return `$${n.toFixed(2)} USD`;
}

export default function ApiCostTracker() {
  const [data, setData] = useState<ApiUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getApiUsage()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 animate-pulse">
        <div className="h-3 w-32 rounded bg-white/[0.05] mb-5" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-white/[0.05]" />
          <div className="h-4 w-full rounded bg-white/[0.05]" />
          <div className="h-px w-full rounded bg-white/[0.05] my-4" />
          <div className="h-4 w-48 rounded bg-white/[0.05]" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 flex items-center justify-center">
        <span className="text-[12px] text-white/20">API usage data unavailable</span>
      </div>
    );
  }

  const whisperWeekCost = data.whisper_minutes_week * 0.006;
  const gptWeekCost = data.gpt_texts_week * 0.0004;
  const whisperMonthCost = data.whisper_minutes_month * 0.006;
  const gptMonthCost = data.gpt_texts_month * 0.0004;
  const monthTotal = whisperMonthCost + gptMonthCost;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-5">
        API Cost Tracker
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] text-white/60">Whisper this week</span>
            <span className="text-[12px] text-white/30 ml-2">
              {data.whisper_minutes_week.toFixed(1)} min processed
            </span>
          </div>
          <span className="text-[13px] font-semibold text-violet-400">
            ~{fmt(whisperWeekCost)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] text-white/60">GPT this week</span>
            <span className="text-[12px] text-white/30 ml-2">
              {data.gpt_texts_week.toLocaleString()} texts evaluated
            </span>
          </div>
          <span className="text-[13px] font-semibold text-violet-400">
            ~{fmt(gptWeekCost)}
          </span>
        </div>

        <div className="h-px bg-white/[0.06] my-1" />

        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white/70">
            Estimated this month
          </span>
          <span className="text-[15px] font-black text-[#f5f3ff]">
            ~{fmt(monthTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
