/**
 * LearnPathPage — SpeakBranch AI
 *
 * Adaptive curriculum map. Node states are computed dynamically from
 * localStorage (completed exercises + accumulated XP). Clicking a node
 * navigates to /exercise/:id.
 *
 * Layout: [Shared Sidebar] | [Scrollable path] | [Right stats panel]
 */

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Mic, Repeat, Headphones, PenLine,
  Star, Trophy, Lock, CheckCircle2, RefreshCw,
  Flame, Zap, Target, ChevronDown, Loader2, Award,
} from 'lucide-react';
import AppSidebar from '@/shared/components/layout/AppSidebar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLearnProgress } from '@/shared/hooks/useLearnProgress';
import type { SkillAverages } from '@/shared/hooks/useLearnProgress';
import { questionsService, setOrderedQuestionIds } from '@/services/questionsService';
import { examService } from '@/services/examService';
import type { Exam } from '@/types/exam';
import type { Question, Level } from '@/types/question';
import { LEARN_PATH } from '../data/pathData';
import type { LessonNode, CEFRSection, SkillType, NodeState, PosX } from '../data/pathData';
import VocabularyGameDrawer from '../components/VocabularyGameDrawer';

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

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function userCanAccessSection(userLevel: string, sectionLevel: string): boolean {
  const userIdx = CEFR_ORDER.indexOf(userLevel);
  const sectionIdx = CEFR_ORDER.indexOf(sectionLevel);
  if (userIdx === -1) return sectionIdx === 0; // unknown level → only first section
  return userIdx >= sectionIdx;
}

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
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', progress: 'bg-cyan-500', hex: '#06b6d4' },
  sky: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', progress: 'bg-sky-500', hex: '#0ea5e9' },
  indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', progress: 'bg-indigo-500', hex: '#6366f1' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', progress: 'bg-violet-500', hex: '#8b5cf6' },
  pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', progress: 'bg-pink-500', hex: '#ec4899' },
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
  questionScores: Record<string, number>,
  sectionLocked: boolean,
): (LessonNode & { state: NodeState })[] {
  if (sectionLocked) {
    return nodes.map(n => ({ ...n, state: 'locked' }));
  }

  let foundCurrent = false;
  const result = nodes.map((node, i) => {
    if (completedIds.includes(node.id)) return { ...node, state: 'completed' as NodeState };

    const prevAllDone = nodes.slice(0, i).every(n => completedIds.includes(n.id));
    if (prevAllDone && !foundCurrent) {
      foundCurrent = true;
      return { ...node, state: 'current' as NodeState };
    }
    return { ...node, state: 'locked' as NodeState };
  });

  // All exercises completed → mark the one with score < 80 as 'replay' (if any)
  if (!foundCurrent) {
    let worstIdx = -1;
    let worstScore = 80;  // ★ Threshold mínimo de aprobación
    result.forEach((node, i) => {
      const s = questionScores[node.id] ?? 0;
      if (s < worstScore) { worstScore = s; worstIdx = i; }
    });
    // ★ Solo marcar como 'replay' si hay algo con score < 80
    if (worstIdx >= 0) {
      result[worstIdx] = { ...result[worstIdx], state: 'replay' };
    }
  }

  return result;
}
// ─── Path geometry ────────────────────────────────────────────────────────────

const NODE_SIZE = 72;
const SPACING_Y = 116;
const START_Y = 48;
const CONTAINER_W = 412;
const POS_X = { left: 44, center: 170, right: 296 } as const;

function buildPath(nodes: (LessonNode & { state: NodeState })[]): string {
  return nodes.map((n, i) => {
    const cx = POS_X[n.posX] + NODE_SIZE / 2;
    const cy = START_Y + i * SPACING_Y + NODE_SIZE / 2;
    if (i === 0) return `M ${cx} ${cy}`;
    const prev = nodes[i - 1];
    const pcx = POS_X[prev.posX] + NODE_SIZE / 2;
    const pcy = START_Y + (i - 1) * SPACING_Y + NODE_SIZE / 2;
    const midY = (pcy + cy) / 2;
    return `C ${pcx} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
  }).join(' ');
}

// ─── Node Circle ──────────────────────────────────────────────────────────────

function NodeCircle({
  node,
  onClick,
}: Readonly<{
  node: LessonNode & { state: NodeState };
  onClick?: () => void;
}>) {
  const cfg = SKILL_CFG[node.skill];
  const { Icon } = cfg;
  const clickable = node.state === 'current' || node.state === 'completed' || node.state === 'replay';

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
      <button
        type="button"
        className={`${base} ${cfg.border} ${cfg.bg} hover:opacity-90 relative`}
        style={{ width: NODE_SIZE, height: NODE_SIZE }}
        onClick={onClick}
        title="Practicar de nuevo"
      >
        <CheckCircle2 size={NODE_SIZE * 0.42} className={cfg.text} />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#07090F] border border-zinc-800 flex items-center justify-center">
          <Icon size={9} className={cfg.text} />
        </div>
      </button>
    );
  }

  if (node.state === 'replay') {
    return (
      <motion.div
        className={`${base} border-amber-500/50 bg-amber-500/10 hover:opacity-90 relative`}
        style={{ width: NODE_SIZE, height: NODE_SIZE }}
        animate={{
          boxShadow: [
            '0 0 0 0px rgba(245,158,11,0)',
            '0 0 0 10px rgba(245,158,11,0.12)',
            '0 0 0 0px rgba(245,158,11,0)',
          ],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        onClick={onClick}
      >
        <RefreshCw size={NODE_SIZE * 0.38} className="text-amber-400" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#07090F] border border-zinc-800 flex items-center justify-center">
          <Icon size={9} className="text-amber-400" />
        </div>
      </motion.div>
    );
  }
 

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
  questionScores,
  totalXP,
  userLevel,
  collapsed,
  loading,
  onToggle,
  onNodeClick,
  sectionRef,
}: Readonly<{
  section: CEFRSection;
  completedIds: string[];
  questionScores: Record<string, number>;
  totalXP: number;
  userLevel: string;
  collapsed: boolean;
  loading: boolean;
  onToggle: () => void;
  onNodeClick: (nodeId: string) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}>) {
  const accent = ACCENT_CFG[section.accent];
  const [xpMin, xpMax] = section.xpRange;
  const sectionLocked = !userCanAccessSection(userLevel, section.level);

  const nodes = useMemo(
    () => collapsed || section.nodes.length === 0
      ? []
      : computeNodes(section.nodes, completedIds, questionScores, sectionLocked),
    [section.nodes, completedIds, questionScores, sectionLocked, collapsed],
  );

  const completedCount = section.nodes.filter(n => completedIds.includes(n.id)).length;
  const totalCount = section.nodes.length;

  const totalH = nodes.length > 0 ? START_Y + (nodes.length - 1) * SPACING_Y + NODE_SIZE + 60 : 0;
  const fullPath = nodes.length > 0 ? buildPath(nodes) : '';
  const litIdx = nodes.findIndex(n => n.state === 'current');
  const litPath = litIdx > 0 ? buildPath(nodes.slice(0, litIdx + 1)) : null;
  const xpPct = sectionLocked ? 0 : Math.min(1, (totalXP - xpMin) / (xpMax - xpMin));

  return (
    <div ref={sectionRef} className={sectionLocked ? 'opacity-50 pointer-events-none' : ''}>
      {/* Section banner — always visible, clickable to collapse/expand */}
      <div
        className={`mx-6 mt-8 mb-1 rounded-xl border ${accent.border} ${accent.bg} overflow-hidden ${sectionLocked ? '' : 'cursor-pointer select-none'}`}
        {...(!sectionLocked && {
          role: 'button',
          tabIndex: 0,
          onClick: onToggle,
          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); },
        })}
      >
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
            {collapsed && totalCount > 0 && (
              <span className="text-[11px] text-zinc-500 tabular-nums hidden sm:block">
                {completedCount}/{totalCount}
              </span>
            )}
            {!collapsed && (
              <div className="text-right hidden sm:block">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">XP requerido</p>
                {xpMax > 0 ? (
                  <p className={`text-sm font-semibold ${accent.text}`}>{xpMin.toLocaleString()} – {xpMax.toLocaleString()}</p>
                ) : (
                  <div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse mt-0.5" />
                )}
              </div>
            )}
            {sectionLocked
              ? <Lock size={14} className="text-zinc-600" />
              : <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
            }
          </div>
        </div>
        {!sectionLocked && !collapsed && xpPct < 1 && (
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

      {/* Node path — only when expanded */}
      {!collapsed && (
        (() => {
          if (loading) return (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className={`animate-spin ${accent.text}`} />
            </div>
          );
          if (nodes.length > 0) return (
            <div className="relative mx-auto" style={{ width: CONTAINER_W, height: totalH }}>
            <svg className="absolute inset-0 pointer-events-none overflow-visible" width={CONTAINER_W} height={totalH}>
              <defs>
                <linearGradient id={`lg-${section.level}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent.hex} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={accent.hex} stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <path d={fullPath} stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" strokeLinecap="round" />
              {litPath && (
                <path d={litPath} stroke={`url(#lg-${section.level})`} strokeWidth="3" fill="none" strokeLinecap="round" />
              )}
            </svg>

            {nodes.map((node, i) => {
              const x = POS_X[node.posX];
              const y = START_Y + i * SPACING_Y;
              const sCfg = SKILL_CFG[node.skill];
              const canClick = node.state === 'current' || node.state === 'completed';

              return (
                <div key={node.id} style={{ position: 'absolute', left: x, top: y }}>
                  {node.state === 'current' && (
                    <motion.div
                      className="absolute flex flex-col items-center"
                      style={{ bottom: NODE_SIZE + 8, left: '50%', transform: 'translateX(-50%)' }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }}
                        className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg shadow-emerald-500/30 whitespace-nowrap transition-all flex items-center gap-1.5"
                      >
                        ▶ COMENZAR
                      </button>
                      <div className="w-px h-2.5 bg-emerald-500/40 mt-0.5" />
                    </motion.div>
                  )}

                  {node.state === 'replay' && (
                    <motion.div
                      className="absolute flex flex-col items-center"
                      style={{ bottom: NODE_SIZE + 8, left: '50%', transform: 'translateX(-50%)' }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }}
                          className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-amber-500/30 whitespace-nowrap transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw size={11} /> REPASAR
                        </button>
                        <span className="text-[9px] text-amber-500/60 font-medium whitespace-nowrap">
                          score bajo · gana más XP
                        </span>
                      </div>
                      <div className="w-px h-2 bg-amber-500/30 mt-0.5" />
                    </motion.div>
                  )}

                  <NodeCircle
                    node={node}
                    onClick={canClick ? () => onNodeClick(node.id) : undefined}
                  />

                  {(node.state === 'current' || node.state === 'replay') && (
                    <div
                      className="absolute whitespace-nowrap text-center"
                      style={{ top: NODE_SIZE + 6, left: '50%', transform: 'translateX(-50%)' }}
                    >
                      <p className="text-[10px] text-zinc-500">{node.title}</p>
                      <span className={`text-[9px] ${node.state === 'replay' ? 'text-amber-500/70' : sCfg.text} uppercase tracking-wider font-semibold`}>
                        {node.state === 'replay' ? `${Math.round(questionScores[node.id] ?? 0)}pts · mejorar` : node.skill}
                      </span>
                    </div>
                  )}

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
          );
          return null;
        })()
      )}
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({
  totalXP,
  streakDays,
  skillAverages,
  currentSection,
  nextSection,
}: Readonly<{
  totalXP: number;
  streakDays: number;
  skillAverages: SkillAverages;
  currentSection: CEFRSection;
  nextSection: CEFRSection | null;
}>) {
  const dailyGoal = 100;
  const dailyDone = Math.min(totalXP, dailyGoal);
  const pct = dailyDone / dailyGoal;
  const R = 38;
  const circ = 2 * Math.PI * R;

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
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${doneD[i] ? 'bg-amber-500/15 border-amber-500/40' : 'bg-zinc-800/60 border-zinc-800'
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

        {/* Level progress */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
            Progreso {currentSection.level}
          </p>
          <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">XP acumulado</span>
              <span className="font-semibold text-emerald-400">
                {Math.min(totalXP, currentSection.xpRange[1])} / {currentSection.xpRange[1]}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (totalXP / currentSection.xpRange[1]) * 100)}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
              />
            </div>
            <p className="text-xs text-zinc-600">
              {Math.max(0, currentSection.xpRange[1] - totalXP)} XP para completar {currentSection.level}
            </p>
          </div>
        </div>

        {/* Skill scores */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Habilidades</p>
          <div className="space-y-2">
            {[
              { label: 'Reading',   score: Math.round(skillAverages.reading),   bar: 'bg-sky-500',     text: 'text-sky-400'     },
              { label: 'Speaking',  score: Math.round(skillAverages.speaking),  bar: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Shadowing', score: Math.round(skillAverages.listening), bar: 'bg-violet-500',  text: 'text-violet-400'  },
              { label: 'Listening', score: Math.round(skillAverages.listening), bar: 'bg-amber-500',   text: 'text-amber-400'   },
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
                <p className="text-sm font-medium text-zinc-200">
                  {nextSection ? `Nivel ${nextSection.level}` : 'Nivel máximo'}
                </p>
                <p className="text-xs text-zinc-500">{nextSection?.label ?? 'Completado'}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {nextSection
                ? (
                  <>Necesitas <span className="text-cyan-400 font-semibold">{Math.max(0, nextSection.xpRange[0] - totalXP)} XP más</span> para desbloquear {nextSection.level}.</>
                )
                : 'Has completado el nivel más alto.'}
            </p>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2">
          <div className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
            <Flame size={15} className="text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold leading-none">{streakDays}</p>
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

// ── Module-level caches (per-level, survive re-mounts) ────────────────────────
const _cachedByLevel: Record<string, Question[]> = {};

export default function LearnPathPage() {
  const { user } = useAuth();
  const { totalXP, completedIds, streakDays, questionScores, skillAverages } = useLearnProgress();
  const navigate = useNavigate();

  const [xpRanges, setXpRanges] = useState<Record<string, [number, number]>>({});
  const [questionsByLevel, setQuestionsByLevel] = useState<Record<string, Question[]>>({ ..._cachedByLevel });
  const [loadingLevels, setLoadingLevels] = useState<Set<string>>(new Set());
  const [vocabDrawer, setVocabDrawer] = useState(false);
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);

  // Current level — from the user's actual earned level (advances only after passing LEVEL_UP exam)
  const currentLevel = user?.level ?? 'A1';

  // Only current level is expanded by default
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(
    () => new Set([user?.level ?? 'A1']),
  );

  // Ref for auto-scroll to active section
  const activeRef = useRef<HTMLDivElement>(null);

  // ── Fetch a single level (with cache) ───────────────────────────────────────
  const fetchLevel = useCallback(async (level: string) => {
    if (_cachedByLevel[level]) {
      setQuestionsByLevel(prev => ({ ...prev, [level]: _cachedByLevel[level] }));
      return;
    }
    setLoadingLevels(prev => new Set([...prev, level]));
    try {
      const qs = await questionsService.getQuestions({ level: level as Level });
      _cachedByLevel[level] = qs;
      setQuestionsByLevel(prev => ({ ...prev, [level]: qs }));
    } catch { /* keep empty */ }
    finally {
      setLoadingLevels(prev => { const s = new Set(prev); s.delete(level); return s; });
    }
  }, []);

  // ── Toggle expand / collapse ─────────────────────────────────────────────────
  const toggleLevel = useCallback((level: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
        fetchLevel(level);
      }
      return next;
    });
  }, [fetchLevel]);

  // On mount: fetch current level; when currentLevel changes, ensure it's expanded
  useEffect(() => {
    fetchLevel(currentLevel);
    setExpandedLevels(prev => new Set([...prev, currentLevel]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel]);

  // Auto-scroll to active section once it's loaded
  useEffect(() => {
    if (questionsByLevel[currentLevel] && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentLevel, questionsByLevel]);

  // XP ranges from backend — always fetch fresh on mount (lightweight call)
  useEffect(() => {
    const token = localStorage.getItem('sb_access_token');
    fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/system/levels/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setXpRanges({
          A1: [0,                data.xp_level_a1] as [number, number],
          A2: [data.xp_level_a1, data.xp_level_a2] as [number, number],
          B1: [data.xp_level_a2, data.xp_level_b1] as [number, number],
          B2: [data.xp_level_b1, data.xp_level_b2] as [number, number],
        });
      })
      .catch(() => { /* usa defaults */ });
  }, []);

  // Build sections — all LEARN_PATH sections, nodes only when loaded
  const dynamicPath = useMemo((): CEFRSection[] => {
    const sections = LEARN_PATH.map(section => {
      const qs = questionsByLevel[section.level] ?? [];
      const nodes: LessonNode[] = qs.map((q, i) => ({
        id: String(q.id),
        title: q.text.length > 55 ? q.text.slice(0, 55) + '…' : q.text,
        skill: questionToSkill(q),
        state: 'locked' as const,
        xpMax: q.xp_max,

        posX: POS_X_CYCLE[i % 4],
      }));
      // Use backend range if loaded; fall back to section default only for levels
      // not covered by SystemConfig (C1, C2).
      const range = xpRanges[section.level];
      return { ...section, xpRange: range ?? section.xpRange, nodes };
    });

    // Publish ordered IDs so ExercisePage can find the next exercise
    setOrderedQuestionIds(sections.flatMap(s => s.nodes.map(n => n.id)));

    return sections;
  }, [questionsByLevel, xpRanges]);

  const currentSection = useMemo(
    () => dynamicPath.find(s => totalXP >= s.xpRange[0] && totalXP < s.xpRange[1]) ?? dynamicPath[0] ?? LEARN_PATH[0],
    [dynamicPath, totalXP],
  );

  const nextSection = useMemo(() => {
    const idx = dynamicPath.indexOf(currentSection);
    return idx >= 0 && idx < dynamicPath.length - 1 ? dynamicPath[idx + 1] : null;
  }, [dynamicPath, currentSection]);

  const handleNodeClick = (nodeId: string) => navigate(`/exercise/${nodeId}`);
  const handleExamClick = (examId: number) => navigate(`/exam/${examId}`);

  const getLevelIndex = (level: string) => CEFR_ORDER.indexOf(level);
  const currentUserLevelIdx = getLevelIndex(currentLevel);
  const getExamForLevel = (sectionLevel: string) =>
    availableExams.find(e => e.type === 'LEVEL_UP' && e.level === sectionLevel);

  // Fetch available exams on mount
  useEffect(() => {
    examService.getExams()
      .then(setAvailableExams)
      .catch(() => { /* silently ignore */ });
  }, []);

  return (
    <div className="bg-[#07090F] text-zinc-50 h-screen flex font-sans overflow-hidden">
      <AppSidebar />

      {/* Scrollable path */}
      <main className="flex-1 h-screen overflow-y-auto">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 bg-[#07090F]/90 backdrop-blur-md border-b border-white/[0.05]">
          <div className="flex items-center justify-between px-6 py-3.5">
            <div>
              <h1 className="font-semibold text-zinc-100 leading-none">Ruta de Aprendizaje</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {user?.first_name ?? 'Piloto'} · {currentSection.level} {currentSection.label} ·{' '}
                <span className="text-emerald-400 font-medium">{totalXP} XP</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVocabDrawer(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 text-[12px] font-semibold transition-colors"
              >
                <BookOpen size={13} />
                Study Vocabulary
              </button>
              <div className="flex items-center gap-1.5 bg-zinc-900/70 border border-zinc-800 px-3 py-1.5 rounded-full">
                <Flame size={13} className="text-amber-500" />
                <span className="text-sm font-semibold">{streakDays}</span>
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
          {dynamicPath.map(section => {
            const isActive = section.level === currentLevel;
            const examForNextLevel = getExamForLevel(section.level);
            const sectionLevelIdx = getLevelIndex(section.level);
            const sectionLockedByLevel = sectionLevelIdx > currentUserLevelIdx;
            const examPassed = examForNextLevel?.last_attempt?.passed === true;
            const canTakeExam = Boolean(
              examForNextLevel && (examForNextLevel.can_unlock || examForNextLevel.is_unlocked)
            );
            const requiredForLevel = examForNextLevel?.required_xp_for_level ?? examForNextLevel?.xp_required;
            const nextLevel = CEFR_ORDER[sectionLevelIdx + 1] ?? '';

            return (
              <div key={section.level}>
                {/* Level exam gate */}
                {examForNextLevel && !sectionLockedByLevel && (
                  <div className="mx-6 my-6">
                    <div className={`rounded-xl border ${canTakeExam
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-900/50'
                      } p-4`}>
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${canTakeExam ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
                          <Award size={24} className={canTakeExam ? 'text-emerald-400' : 'text-zinc-600'} />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${canTakeExam ? 'text-emerald-300' : 'text-zinc-400'}`}>
                            Examen de Nivel {section.level} → {nextLevel}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {(() => {
                              if (examPassed) return '¡Examen aprobado! Ya subiste de nivel.';
                              if (canTakeExam) return '¡Has alcanzado el XP necesario! Demuestra tus conocimientos para avanzar.';
                              return `Requiere ${requiredForLevel ?? 0} XP acumulado para desbloquear el examen.`;
                            })()}
                          </p>
                        </div>
                        {!examPassed && (
                          <button
                            onClick={() => canTakeExam && handleExamClick(examForNextLevel.id)}
                            disabled={!canTakeExam}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${canTakeExam
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                              }`}
                          >
                            {canTakeExam ? 'Comenzar Examen' : 'Bloqueado'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <PathSection
                    section={section}
                    completedIds={completedIds}
                    questionScores={questionScores}
                    totalXP={totalXP}
                    userLevel={currentLevel}
                    collapsed={!expandedLevels.has(section.level)}
                    loading={loadingLevels.has(section.level)}
                    onToggle={() => toggleLevel(section.level)}
                    onNodeClick={handleNodeClick}
                    sectionRef={isActive ? activeRef : undefined}
                  />
              </div>
            );
          })}

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

      <RightPanel totalXP={totalXP} streakDays={streakDays} skillAverages={skillAverages} currentSection={currentSection} nextSection={nextSection} />

      <VocabularyGameDrawer open={vocabDrawer} onClose={() => setVocabDrawer(false)} />
    </div>
  );
}
