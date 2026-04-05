/**
 * LearnPathPage — SpeakBranch AI
 *
 * Adaptive curriculum map. Node states are computed dynamically from
 * localStorage (completed exercises + accumulated XP). Clicking a node
 * navigates to /exercise/:id.
 *
 * Layout: [Shared Sidebar] | [Scrollable path] | [Right stats panel]
 */

import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Mic, Repeat, Headphones, PenLine,
  Star, Trophy, Lock, CheckCircle2,
  Flame, Zap, Target,
} from 'lucide-react';
import AppSidebar from '@/shared/components/layout/AppSidebar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLearnProgress } from '@/shared/hooks/useLearnProgress';
import { questionsService } from '@/services/questionsService';
import type { Question } from '@/types/question';
import { LEARN_PATH } from '../data/pathData';
import type { LessonNode, CEFRSection, SkillType, NodeState, PosX } from '../data/pathData';

// ─── Skill / Accent config ────────────────────────────────────────────────────

const SKILL_CFG: Record<SkillType, {
  Icon: React.ElementType;
  bg: string; border: string; text: string; glowRgb: string;
}> = {
  reading:       { Icon: BookOpen,   bg: 'bg-sky-500/15',     border: 'border-sky-500/50',     text: 'text-sky-400',     glowRgb: '14,165,233'  },
  speaking:      { Icon: Mic,        bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-400', glowRgb: '16,185,129'  },
  shadowing:     { Icon: Repeat,     bg: 'bg-violet-500/15',  border: 'border-violet-500/50',  text: 'text-violet-400',  glowRgb: '139,92,246'  },
  comprehension: { Icon: Headphones, bg: 'bg-amber-500/15',   border: 'border-amber-500/50',   text: 'text-amber-400',   glowRgb: '245,158,11'  },
  writing:       { Icon: PenLine,    bg: 'bg-rose-500/15',    border: 'border-rose-500/50',    text: 'text-rose-400',    glowRgb: '244,63,94'   },
  checkpoint:    { Icon: Star,       bg: 'bg-yellow-500/15',  border: 'border-yellow-500/50',  text: 'text-yellow-400',  glowRgb: '234,179,8'   },
  exam:          { Icon: Trophy,     bg: 'bg-rose-500/15',    border: 'border-rose-500/50',    text: 'text-rose-400',    glowRgb: '244,63,94'   },
};

const POS_X_CYCLE: PosX[] = ['center', 'right', 'center', 'left'];

function questionToSkill(q: Question): SkillType {
  if (q.category === 'DIAGNOSTIC') return 'checkpoint';
  if (q.category === 'LEVEL_UP')   return 'exam';
  const map: Record<string, SkillType> = {
    SPEAKING:                'speaking',
    READING:                 'reading',
    LISTENING_SHADOWING:     'shadowing',
    LISTENING_COMPREHENSION: 'comprehension',
    WRITING:                 'writing',
  };
  return map[q.type] ?? 'reading';
}

const ACCENT_CFG = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', progress: 'bg-emerald-500', hex: '#10b981' },
  cyan:    { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    progress: 'bg-cyan-500',    hex: '#06b6d4' },
  sky:     { text: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     progress: 'bg-sky-500',     hex: '#0ea5e9' },
  indigo:  { text: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  progress: 'bg-indigo-500',  hex: '#6366f1' },
  violet:  { text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  progress: 'bg-violet-500',  hex: '#8b5cf6' },
  pink:    { text: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20',    progress: 'bg-pink-500',    hex: '#ec4899' },
} as const;

// ─── Dynamic node state computation ──────────────────────────────────────────

/**
 * Computes live NodeState for each node based on:
 * - Whether the section is XP-unlocked
 * - Which exercise IDs have been completed (localStorage)
 * Sequential unlock: each node opens only after the previous is completed.
 */
function computeNodes(
  nodes: LessonNode[],
  completedIds: string[],
  sectionLocked: boolean,
): (LessonNode & { state: NodeState })[] {
  if (sectionLocked) {
    return nodes.map(n => ({ ...n, state: 'locked' }));
  }

  let foundCurrent = false;
  return nodes.map((node, i) => {
    if (completedIds.includes(node.id)) return { ...node, state: 'completed' };

    const prevAllDone = nodes.slice(0, i).every(n => completedIds.includes(n.id));
    if (prevAllDone && !foundCurrent) {
      foundCurrent = true;
      return { ...node, state: 'current' };
    }
    return { ...node, state: 'locked' };
  });
}

// ─── Path geometry ────────────────────────────────────────────────────────────

const NODE_SIZE   = 72;
const SPACING_Y   = 116;
const START_Y     = 48;
const CONTAINER_W = 412;
const POS_X = { left: 44, center: 170, right: 296 } as const;

function buildPath(nodes: (LessonNode & { state: NodeState })[]): string {
  return nodes.map((n, i) => {
    const cx = POS_X[n.posX] + NODE_SIZE / 2;
    const cy = START_Y + i * SPACING_Y + NODE_SIZE / 2;
    if (i === 0) return `M ${cx} ${cy}`;
    const prev = nodes[i - 1];
    const pcx  = POS_X[prev.posX] + NODE_SIZE / 2;
    const pcy  = START_Y + (i - 1) * SPACING_Y + NODE_SIZE / 2;
    const midY = (pcy + cy) / 2;
    return `C ${pcx} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
  }).join(' ');
}

// ─── Node Circle ──────────────────────────────────────────────────────────────

function NodeCircle({
  node,
  onClick,
}: {
  node: LessonNode & { state: NodeState };
  onClick?: () => void;
}) {
  const cfg = SKILL_CFG[node.skill];
  const { Icon } = cfg;
  const clickable = node.state === 'current' || node.state === 'completed';

  const base = `rounded-full border-2 flex items-center justify-center transition-all
    ${clickable ? 'cursor-pointer' : 'cursor-default'}`;

  if (node.state === 'locked') {
    return (
      <div className={`${base} border-zinc-800 bg-zinc-900/80`} style={{ width: NODE_SIZE, height: NODE_SIZE }}>
        <Lock size={NODE_SIZE * 0.33} className="text-zinc-700" />
      </div>
    );
  }

  if (node.state === 'completed') {
    return (
      <div
        className={`${base} ${cfg.border} ${cfg.bg} hover:opacity-90 relative`}
        style={{ width: NODE_SIZE, height: NODE_SIZE }}
        onClick={onClick}
        title="Practicar de nuevo"
      >
        <CheckCircle2 size={NODE_SIZE * 0.42} className={cfg.text} />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#07090F] border border-zinc-800 flex items-center justify-center">
          <Icon size={9} className={cfg.text} />
        </div>
      </div>
    );
  }

  // current
  return (
    <motion.div
      className={`${base} ${cfg.border} ${cfg.bg} hover:opacity-90`}
      style={{ width: NODE_SIZE, height: NODE_SIZE }}
      animate={{
        boxShadow: [
          `0 0 0 0px rgba(${cfg.glowRgb},0)`,
          `0 0 0 10px rgba(${cfg.glowRgb},0.12)`,
          `0 0 0 0px rgba(${cfg.glowRgb},0)`,
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      onClick={onClick}
    >
      <Icon size={NODE_SIZE * 0.4} className={cfg.text} />
    </motion.div>
  );
}

// ─── Path Section ─────────────────────────────────────────────────────────────

function PathSection({
  section,
  completedIds,
  totalXP,
  onNodeClick,
}: {
  section: CEFRSection;
  completedIds: string[];
  totalXP: number;
  onNodeClick: (nodeId: string) => void;
}) {
  const accent = ACCENT_CFG[section.accent];
  const [xpMin, xpMax] = section.xpRange;
  const sectionLocked  = totalXP < xpMin;

  const nodes = useMemo(
    () => computeNodes(section.nodes, completedIds, sectionLocked),
    [section.nodes, completedIds, sectionLocked],
  );

  const totalH   = START_Y + (nodes.length - 1) * SPACING_Y + NODE_SIZE + 60;
  const fullPath = buildPath(nodes);
  const litIdx   = nodes.findIndex(n => n.state === 'current');
  const litPath  = litIdx > 0 ? buildPath(nodes.slice(0, litIdx + 1)) : null;
  const xpPct    = sectionLocked ? 0 : Math.min(1, (totalXP - xpMin) / (xpMax - xpMin));

  return (
    <div className={sectionLocked ? 'opacity-50 pointer-events-none' : ''}>
      {/* Section banner */}
      <div className={`mx-6 mt-8 mb-1 rounded-xl border ${accent.border} ${accent.bg} overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-4">
            <span className={`text-3xl font-black tracking-tight ${accent.text}`}>{section.level}</span>
            <div className="w-px h-8 bg-white/[0.07]" />
            <div>
              <p className="font-semibold text-zinc-200 leading-none">{section.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{section.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">XP requerido</p>
              <p className={`text-sm font-semibold ${accent.text}`}>{xpMin.toLocaleString()} – {xpMax.toLocaleString()}</p>
            </div>
            {sectionLocked && <Lock size={14} className="text-zinc-600" />}
          </div>
        </div>
        {!sectionLocked && xpPct < 1 && (
          <div className="h-0.5 bg-zinc-800/60">
            <motion.div
              className={`h-full ${accent.progress}`}
              initial={{ width: 0 }}
              animate={{ width: `${xpPct * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* Node path */}
      <div className="relative mx-auto" style={{ width: CONTAINER_W, height: totalH }}>
        <svg className="absolute inset-0 pointer-events-none overflow-visible" width={CONTAINER_W} height={totalH}>
          <defs>
            <linearGradient id={`lg-${section.level}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={accent.hex} stopOpacity="0.7" />
              <stop offset="100%" stopColor={accent.hex} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d={fullPath} stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" strokeLinecap="round" />
          {litPath && (
            <path d={litPath} stroke={`url(#lg-${section.level})`} strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
        </svg>

        {nodes.map((node, i) => {
          const x    = POS_X[node.posX];
          const y    = START_Y + i * SPACING_Y;
          const sCfg = SKILL_CFG[node.skill];
          const canClick = node.state === 'current' || node.state === 'completed';

          return (
            <div key={node.id} style={{ position: 'absolute', left: x, top: y }}>
              {/* CTA above current node */}
              {node.state === 'current' && (
                <motion.div
                  className="absolute flex flex-col items-center"
                  style={{ bottom: NODE_SIZE + 8, left: '50%', transform: 'translateX(-50%)' }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <button
                    onClick={() => onNodeClick(node.id)}
                    className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg shadow-emerald-500/30 whitespace-nowrap transition-all flex items-center gap-1.5"
                  >
                    ▶ COMENZAR
                  </button>
                  <div className="w-px h-2.5 bg-emerald-500/40 mt-0.5" />
                </motion.div>
              )}

              <NodeCircle
                node={node}
                onClick={canClick ? () => onNodeClick(node.id) : undefined}
              />

              {/* Label below current/available */}
              {(node.state === 'current') && (
                <div
                  className="absolute whitespace-nowrap text-center"
                  style={{ top: NODE_SIZE + 6, left: '50%', transform: 'translateX(-50%)' }}
                >
                  <p className="text-[10px] text-zinc-500">{node.title}</p>
                  <span className={`text-[9px] ${sCfg.text} uppercase tracking-wider font-semibold`}>
                    {node.skill}
                  </span>
                </div>
              )}

              {/* XP badge on non-locked nodes */}
              {node.state !== 'locked' && (
                <div
                  className="absolute -top-2 -right-2 bg-[#07090F] border border-zinc-800 rounded-full px-1.5"
                  style={{ fontSize: 9, fontWeight: 700, color: '#71717a', lineHeight: '18px' }}
                >
                  +{node.xpMax}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ totalXP }: { totalXP: number }) {
  const dailyGoal = 100;
  const dailyDone = Math.min(totalXP, dailyGoal);
  const pct       = dailyDone / dailyGoal;
  const R         = 38;
  const circ      = 2 * Math.PI * R;

  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const doneD = [true, true, true, false, false, false, false];

  return (
    <aside className="w-72 shrink-0 h-screen overflow-y-auto border-l border-white/[0.05] bg-[#0C1018]">
      <div className="p-5 space-y-6">

        {/* Daily goal */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Meta del Día</p>
          <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="relative w-[72px] h-[72px] shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <motion.circle
                    cx="50" cy="50" r={R} fill="none"
                    stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${circ} ${circ}`}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ * (1 - pct) }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[17px] font-bold leading-none">{dailyDone}</span>
                  <span className="text-[9px] text-zinc-600">/{dailyGoal}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-200 mb-0.5">XP hoy</p>
                <p className="text-xs text-zinc-500 mb-2.5">
                  {Math.max(0, dailyGoal - dailyDone)} XP para tu meta
                </p>
                <div className="flex gap-1">
                  {days.map((d, i) => (
                    <div key={d} className="flex flex-col items-center gap-0.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                        doneD[i] ? 'bg-amber-500/15 border-amber-500/40' : 'bg-zinc-800/60 border-zinc-800'
                      }`}>
                        {doneD[i] && <Flame size={10} className="text-amber-500" />}
                      </div>
                      <span className="text-[8px] text-zinc-700">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* A1 progress */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Progreso A1</p>
          <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">XP acumulado</span>
              <span className="font-semibold text-emerald-400">{totalXP} / 200</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (totalXP / 200) * 100)}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
              />
            </div>
            <p className="text-xs text-zinc-600">
              {Math.max(0, 200 - totalXP)} XP para completar A1
            </p>
          </div>
        </div>

        {/* Skill scores */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Habilidades</p>
          <div className="space-y-2">
            {[
              { label: 'Reading',   score: 82, bar: 'bg-sky-500',     text: 'text-sky-400'     },
              { label: 'Speaking',  score: 68, bar: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Shadowing', score: 45, bar: 'bg-violet-500',  text: 'text-violet-400'  },
              { label: 'Listening', score: 59, bar: 'bg-amber-500',   text: 'text-amber-400'   },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 bg-zinc-900/40 rounded-lg px-3 py-2.5">
                <span className="text-xs text-zinc-500 w-16 shrink-0">{s.label}</span>
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${s.score}%` }} />
                </div>
                <span className={`text-xs font-semibold ${s.text} w-7 text-right tabular-nums`}>{s.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next unlock */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Próximo Desbloqueo</p>
          <div className="bg-cyan-500/[0.04] border border-cyan-500/15 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Target size={15} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Nivel A2</p>
                <p className="text-xs text-zinc-500">Elementary</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Necesitas <span className="text-cyan-400 font-semibold">{Math.max(0, 200 - totalXP)} XP más</span> para desbloquear A2.
            </p>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2">
          <div className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
            <Flame size={15} className="text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold leading-none">3</p>
            <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider">Racha</p>
          </div>
          <div className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
            <Zap size={15} className="text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-bold leading-none">{totalXP}</p>
            <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider">Total XP</p>
          </div>
        </div>

      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearnPathPage() {
  const { user }                   = useAuth();
  const { totalXP, completedIds }  = useLearnProgress();
  const navigate                   = useNavigate();

  const [questions, setQuestions]   = useState<Question[]>([]);
  const [loadingQ, setLoadingQ]     = useState(true);

  useEffect(() => {
    questionsService.getQuestions()
      .then(setQuestions)
      .catch(() => {})
      .finally(() => setLoadingQ(false));
  }, []);

  // Build sections from backend questions, keeping CEFR metadata from pathData
  const dynamicPath = useMemo((): CEFRSection[] => {
    return LEARN_PATH.map(section => {
      const sectionQs = questions.filter(q => q.level === section.level);
      const nodes: LessonNode[] = sectionQs.map((q, i) => ({
        id: String(q.id),
        title: q.text.length > 55 ? q.text.slice(0, 55) + '…' : q.text,
        skill: questionToSkill(q),
        state: 'locked' as const,
        xpMax: q.xp_max,
        posX: POS_X_CYCLE[i % 4],
      }));
      return { ...section, nodes };
    }).filter(s => s.nodes.length > 0);
  }, [questions]);

  const handleNodeClick = (nodeId: string) => {
    navigate(`/exercise/${nodeId}`);
  };

  return (
    <div className="bg-[#07090F] text-zinc-50 min-h-screen flex font-sans">
      <AppSidebar />

      {/* Scrollable path */}
      <main className="flex-1 h-screen overflow-y-auto">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 bg-[#07090F]/90 backdrop-blur-md border-b border-white/[0.05]">
          <div className="flex items-center justify-between px-6 py-3.5">
            <div>
              <h1 className="font-semibold text-zinc-100 leading-none">Ruta de Aprendizaje</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {user?.first_name ?? 'Piloto'} · A1 Beginner ·{' '}
                <span className="text-emerald-400 font-medium">{totalXP} XP</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-zinc-900/70 border border-zinc-800 px-3 py-1.5 rounded-full">
                <Flame size={13} className="text-amber-500" />
                <span className="text-sm font-semibold">3</span>
                <span className="text-[11px] text-zinc-500">días</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-900/70 border border-zinc-800 px-3 py-1.5 rounded-full">
                <Zap size={13} className="text-emerald-400" />
                <span className="text-sm font-semibold">{totalXP}</span>
                <span className="text-[11px] text-zinc-500">XP</span>
              </div>
            </div>
          </div>
        </header>

        <div className="pb-28">
          {loadingQ ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/[0.06] border-t-emerald-500" />
            </div>
          ) : dynamicPath.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Trophy size={32} className="text-zinc-700" />
              <p className="text-sm text-zinc-500">No hay ejercicios disponibles todavía.</p>
            </div>
          ) : (
            dynamicPath.map(section => (
              <PathSection
                key={section.level}
                section={section}
                completedIds={completedIds}
                totalXP={totalXP}
                onNodeClick={handleNodeClick}
              />
            ))
          )}

          {/* End marker */}
          <div className="flex flex-col items-center gap-2 mt-8 mb-4 opacity-25">
            <div className="w-px h-10 bg-gradient-to-b from-indigo-500/40 to-transparent" />
            <div className="p-3 rounded-full border border-indigo-500/20 bg-indigo-500/5">
              <Trophy size={20} className="text-indigo-400" />
            </div>
            <p className="text-xs text-zinc-600 font-medium">TOEFL · Certificación Final</p>
          </div>
        </div>
      </main>

      <RightPanel totalXP={totalXP} />
    </div>
  );
}
