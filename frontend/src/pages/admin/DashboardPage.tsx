import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import AppSidebar from '@/shared/components/layout/AppSidebar';
import QuickAccessBar from '@/components/admin/dashboard/QuickAccessBar';
import MetricCards from '@/components/admin/dashboard/MetricCards';
import ActivityChart from '@/components/admin/dashboard/ActivityChart';
import LevelDistributionChart from '@/components/admin/dashboard/LevelDistributionChart';
import SkillDistributionChart from '@/components/admin/dashboard/SkillDistributionChart';
import ScoreBySkillChart from '@/components/admin/dashboard/ScoreBySkillChart';
import AlertsSection from '@/components/admin/dashboard/AlertsSection';
import TopStudentsTable from '@/components/admin/dashboard/TopStudentsTable';
import RecentAttemptsTable from '@/components/admin/dashboard/RecentAttemptsTable';
import ApiCostTracker from '@/components/admin/dashboard/ApiCostTracker';

// ── Animation ─────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE, delay: i * 0.07 },
  }),
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-72px' });
  return { ref, inView };
}

// ── Section wrapper ────────────────────────────────────────────

function Section({
  label,
  number,
  children,
  custom = 0,
  inView,
}: {
  label: string;
  number: string;
  children: React.ReactNode;
  custom?: number;
  inView: boolean;
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      custom={custom}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[11px] text-white/20 tracking-widest">{number}</span>
        <span className="h-px flex-1 max-w-[32px] bg-white/[0.06]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
          {label}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { ref, inView } = useReveal();

  return (
    <div className="flex h-screen bg-[#06060A] text-[#f5f3ff]">
      <AppSidebar />

      <div className="flex-1 overflow-y-auto">
        <div ref={ref} className="mx-auto px-6 py-5 max-w-[1280px] space-y-10">

          {/* ── Header ── */}
          <motion.div
            variants={reveal}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            custom={0}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[11px] text-white/20 tracking-widest">000</span>
                  <span className="h-px flex-1 max-w-[32px] bg-white/[0.06]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
                    Admin Dashboard
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-[-0.03em] text-[#f5f3ff]">
                  Platform overview.
                </h1>
              </div>
              <div className="sm:pt-1">
                <QuickAccessBar />
              </div>
            </div>
          </motion.div>

          {/* ── Metrics ── */}
          <Section label="Key metrics" number="001" custom={1} inView={inView}>
            <MetricCards />
          </Section>

          {/* ── Activity chart ── */}
          <Section label="Activity" number="002" custom={2} inView={inView}>
            <ActivityChart />
          </Section>

          {/* ── Distribution charts ── */}
          <Section label="Distributions" number="003" custom={3} inView={inView}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LevelDistributionChart />
              <SkillDistributionChart />
            </div>
          </Section>

          {/* ── Score by skill ── */}
          <Section label="Average scores" number="004" custom={4} inView={inView}>
            <ScoreBySkillChart />
          </Section>

          {/* ── Alerts ── */}
          <Section label="Alerts" number="005" custom={5} inView={inView}>
            <AlertsSection />
          </Section>

          {/* ── Top students ── */}
          <Section label="Top students" number="006" custom={6} inView={inView}>
            <TopStudentsTable />
          </Section>

          {/* ── Recent attempts ── */}
          <Section label="Recent attempts" number="007" custom={7} inView={inView}>
            <RecentAttemptsTable />
          </Section>

          {/* ── API Cost ── */}
          <Section label="API usage" number="008" custom={8} inView={inView}>
            <ApiCostTracker />
          </Section>

          {/* Bottom padding */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
