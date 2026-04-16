/**
 * DashboardPage — SpeakBranch AI
 *
 * Stats & overview hub. XP and completion state come from localStorage via
 * useLearnProgress so they always reflect the user's actual progress.
 *
 * Key features:
 *  - Live "next exercise" CTA → navigates directly to /exercise/:id
 *  - "Practicar" per skill → finds the next unlocked exercise for that skill
 *  - Adaptive engine window (last 3 XP scores → derived difficulty)
 *  - Certification path timeline
 *  - Performance trajectory chart (VicissitudesEngine)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, Headphones, BookOpen, Repeat,
  Trophy, Flame, Zap, ArrowRight, CheckCircle2, Lock, GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLearnProgress } from '@/shared/hooks/useLearnProgress';
import AppSidebar from '@/shared/components/layout/AppSidebar';
import VicissitudesEngine from '../components/VicissitudesEngine';
import { LEARN_PATH } from '@/features/learn/data/pathData';
import type { LessonNode } from '@/features/learn/data/pathData';
import { examService } from '@/services/examService';
import type { Exam } from '@/types/exam';

// ─── Adaptive engine constants (mirrors backend) ──────────────────────────────

const WINDOW_SIZE = 3;
const THRESHOLD_UP = 16;
const THRESHOLD_DOWN = 10;

// ─── CEFR path data ───────────────────────────────────────────────────────────

const CEFR_STEPS = [
  { level: 'A1', label: 'Beginner' },
  { level: 'A2', label: 'Elementary' },
  { level: 'B1', label: 'Intermediate' },
  { level: 'B2', label: 'Upper-Int.' },
] as const;

const CEFR_ORDER = CEFR_STEPS.map(step => step.level);
const PLACEMENT_RESULT_LEVEL_KEY = 'sb_placement_result_level';
const CEFR_LEVEL_LABEL: Record<string, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper-Intermediate',
  C1: 'Advanced',
  C2: 'Mastery',
};

// ─── Skill definitions ────────────────────────────────────────────────────────

const SKILLS = [
  { key: 'reading', label: 'Reading', Icon: BookOpen, desc: 'Comprensión lectora con textos CEFR.' },
  { key: 'speaking', label: 'Speaking', Icon: Mic, desc: 'Pronunciación evaluada por IA (Whisper).' },
  { key: 'shadowing', label: 'Listening · Shadow', Icon: Repeat, desc: 'Escucha y replica: entrena oído y pronunciación.' },
  { key: 'comprehension', label: 'Listening · Comp.', Icon: Headphones, desc: 'Audio + preguntas. Máximo 3 reproducciones.' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the first unlocked, uncompleted node across all sections. */
function findCurrentNode(completedIds: string[], totalXP: number): LessonNode | null {
  for (const section of LEARN_PATH) {
    if (totalXP < section.xpRange[0]) continue;
    for (let i = 0; i < section.nodes.length; i++) {
      const node = section.nodes[i];
      if (completedIds.includes(node.id)) continue;
      const prevDone = section.nodes.slice(0, i).every(n => completedIds.includes(n.id));
      if (prevDone) return node;
    }
  }
  return null;
}

/** Returns the next unlocked, uncompleted node for a specific skill type. */
function findNextBySkill(skill: string, completedIds: string[], totalXP: number): string | null {
  for (const section of LEARN_PATH) {
    if (totalXP < section.xpRange[0]) continue;
    for (let i = 0; i < section.nodes.length; i++) {
      const node = section.nodes[i];
      if (node.skill !== skill) continue;
      if (completedIds.includes(node.id)) continue;
      const prevDone = section.nodes.slice(0, i).every(n => completedIds.includes(n.id));
      if (prevDone) return node.id;
    }
  }
  return null;
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'hard' | 'medium' | 'easy';
const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-300',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/15  text-amber-400  border border-amber-500/20',
  hard: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  medium: 'bg-sky-500/15    text-sky-400    border border-sky-500/20',
  easy: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
};

function Badge({ children, variant = 'default' }: Readonly<{ children: React.ReactNode; variant?: BadgeVariant }>) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${BADGE_STYLES[variant]}`}>
      {children}
    </span>
  );
}

const SKILL_META: Record<string, { text: string; Icon: React.ElementType }> = {
  reading: { text: 'text-sky-400', Icon: BookOpen },
  speaking: { text: 'text-emerald-400', Icon: Mic },
  shadowing: { text: 'text-violet-400', Icon: Repeat },
  comprehension: { text: 'text-amber-400', Icon: Headphones },
  checkpoint: { text: 'text-yellow-400', Icon: Trophy },
  exam: { text: 'text-rose-400', Icon: Trophy },
};

function parsePlacementLevel(): string | null {
  const level = sessionStorage.getItem(PLACEMENT_RESULT_LEVEL_KEY);
  if (!level) return null;
  const clean = String(level).toUpperCase();
  if (!/^(A1|A2|B1|B2|C1|C2)$/.test(clean)) {
    sessionStorage.removeItem(PLACEMENT_RESULT_LEVEL_KEY);
    return null;
  }
  const label = CEFR_LEVEL_LABEL[clean] ?? 'Nivel asignado';
  sessionStorage.removeItem(PLACEMENT_RESULT_LEVEL_KEY);
  return `Diagnóstico completado. Tu nivel asignado es ${clean} (${label}).`;
}

// ─── Derived-state helpers ────────────────────────────────────────────────────

function deriveActiveLvl(userLevel?: string) {
  const valid = userLevel && ['A1', 'A2', 'B1', 'B2'].includes(userLevel);
  return valid ? userLevel : 'A1';
}

function deriveNextLvl(activeLvlIdx: number) {
  if (activeLvlIdx >= 0 && activeLvlIdx < CEFR_ORDER.length - 1) {
    return CEFR_ORDER[activeLvlIdx + 1];
  }
  return null;
}

function deriveAdaptiveWindow(questionScores: Record<string, number>) {
  const recentScores = Object.values(questionScores).slice(-WINDOW_SIZE);
  const recentXP = recentScores.length > 0 ? recentScores : [0];
  const recentXPItems = recentXP.map((xp, idx) => ({ key: `w${idx}`, xp }));
  const avg = recentXP.reduce((a, b) => a + b, 0) / recentXP.length;
  const baseDiff = avg < THRESHOLD_DOWN ? 'EASY' : 'MEDIUM';
  const nextDiff = avg >= THRESHOLD_UP ? 'HARD' : baseDiff;
  return { recentXPItems, avg, nextDiff };
}

function deriveExamInfo(availableExams: Exam[], activeLvl: string, levelProgress: { current_level_xp?: number } | undefined) {
  const currentExam = availableExams.find(e => e.level === activeLvl);
  const canTakeExam = currentExam && (currentExam.can_unlock || currentExam.is_unlocked);
  const examPassedAlready = currentExam?.last_attempt?.passed === true;
  const requiredLevelXp = currentExam?.required_xp_for_level ?? currentExam?.xp_required ?? 0;
  const currentLevelXp = levelProgress?.current_level_xp ?? 0;
  const remainingForExam = Math.max(0, requiredLevelXp - currentLevelXp);
  return { currentExam, canTakeExam, examPassedAlready, requiredLevelXp, currentLevelXp, remainingForExam };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { totalXP, completedIds, streakDays, questionScores, levelProgress } = useLearnProgress();
  const navigate = useNavigate();
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [placementLevelMessage, setPlacementLevelMessage] = useState<string | null>(null);

  // Fetch exams on mount
  useEffect(() => {
    examService.getExams()
      .then(setAvailableExams)
      .catch(() => { /* silently ignore */ });
  }, []);

  useEffect(() => {
    const message = parsePlacementLevel();
    if (message) setPlacementLevelMessage(message);
  }, []);

  const currentNode = findCurrentNode(completedIds, totalXP);
  const currentMeta = currentNode ? SKILL_META[currentNode.skill] : null;
  const CurrentIcon = currentMeta?.Icon;

  const activeLvl = deriveActiveLvl(user?.level);
  const activeLvlIdx = CEFR_STEPS.findIndex(s => s.level === activeLvl);
  const nextLvl = deriveNextLvl(activeLvlIdx);

  const { currentExam, canTakeExam, examPassedAlready, requiredLevelXp, currentLevelXp, remainingForExam } =
    deriveExamInfo(availableExams, activeLvl, levelProgress);

  const { recentXPItems, avg, nextDiff } = deriveAdaptiveWindow(questionScores);

  // Average score across all completed exercises
  const allScores = Object.values(questionScores);
  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;
  const lowestSkill = SKILLS.reduce<string>((lowest, skill) => {
    return skill.key === 'shadowing' ? skill.key : lowest;
  }, SKILLS[0].key);

  return (
    <div className="bg-[#07090F] text-zinc-50 h-screen flex font-sans overflow-hidden">
      <AppSidebar />

      <main className="flex-1 h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

          {placementLevelMessage && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-emerald-300">{placementLevelMessage}</p>
                <button
                  type="button"
                  onClick={() => setPlacementLevelMessage(null)}
                  className="text-xs font-semibold text-emerald-200/80 transition-colors hover:text-emerald-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* ── Header ── */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight leading-none mb-1">
                Hola, {user?.first_name || 'Piloto'}
              </h1>
              <p className="text-zinc-400 text-sm">
                Nivel <span className="text-zinc-200 font-medium">{activeLvl}</span> · Sigue practicando para avanzar.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
              <div className="flex items-center gap-3 px-3">
                <div className="p-2 bg-amber-500/10 rounded-lg"><Flame size={18} className="text-amber-500" /></div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Racha</p>
                  <p className="text-lg font-semibold leading-none">{streakDays} <span className="text-sm font-normal text-zinc-500">días</span></p>
                </div>
              </div>
              <div className="w-px h-9 bg-zinc-800" />
              <div className="flex items-center gap-3 px-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><Zap size={18} className="text-emerald-400" /></div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total XP</p>
                  <p className="text-lg font-semibold leading-none text-emerald-400">{totalXP} <span className="text-sm font-normal text-zinc-500">XP</span></p>
                </div>
              </div>
            </div>
          </header>

          {/* ── Next exercise CTA ── */}
          {currentNode ? (
            <button
              onClick={() => navigate(`/exercise/${currentNode.id}`)}
              className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10] hover:border-emerald-500/40 transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                {CurrentIcon && (
                  <div className={`p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25`}>
                    <CurrentIcon size={22} className={currentMeta?.text ?? 'text-emerald-400'} />
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-semibold mb-0.5">Continuar donde lo dejaste</p>
                  <p className="font-semibold text-zinc-100 text-base leading-tight">{currentNode.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 capitalize">{currentNode.skill.replace('_', ' ')} · {currentNode.xpMax} XP máx</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500 group-hover:bg-emerald-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0">
                Comenzar <ArrowRight size={15} />
              </div>
            </button>
          ) : (
            <div className="w-full flex items-center gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Trophy size={22} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-zinc-100">¡Nivel {activeLvl} completado!</p>
                <p className="text-sm text-zinc-500">
                  {nextLvl
                    ? `Espera el desbloqueo de ${nextLvl} o practica ejercicios anteriores.`
                    : 'Has completado el nivel más alto. Practica ejercicios anteriores.'}
                </p>
              </div>
            </div>
          )}

          {/* ── Level-Up Exam CTA ── */}
          {currentExam && !examPassedAlready && (
            <div
              className={`w-full flex items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${canTakeExam
                ? 'border-violet-500/25 bg-violet-500/[0.06] hover:bg-violet-500/[0.10] hover:border-violet-500/40'
                : 'border-zinc-800 bg-zinc-900/40'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${canTakeExam ? 'bg-violet-500/15 border border-violet-500/25' : 'bg-zinc-800 border border-zinc-700'}`}>
                  <GraduationCap size={22} className={canTakeExam ? 'text-violet-400' : 'text-zinc-500'} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-violet-400/80 font-semibold mb-0.5">
                    Examen de Nivel
                  </p>
                  <p className="font-semibold text-zinc-100 text-base leading-tight">
                    {currentExam.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {canTakeExam
                      ? `${currentExam.question_count} preguntas · ${currentExam.time_limit_minutes} min · Aprobar con ${currentExam.passing_score}%`
                      : `Necesitas ${requiredLevelXp} XP en el nivel actual (llevas ${currentLevelXp})`
                    }
                  </p>
                </div>
              </div>

              {canTakeExam ? (
                <button
                  onClick={() => navigate(`/exam/${currentExam.id}`)}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0"
                >
                  Presentar examen <ArrowRight size={15} />
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-zinc-600 border border-zinc-800 cursor-not-allowed shrink-0">
                  <Lock size={13} />
                  {remainingForExam} XP restantes
                </div>
              )}
            </div>
          )}

          {/* ── Performance chart ── */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-zinc-100">Trayectoria de Rendimiento</h2>
                <Badge variant="success">Motor Activo</Badge>
              </div>
              <button
                onClick={() => navigate('/learn')}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                Ver ruta completa <ArrowRight size={12} />
              </button>
            </div>
            <div className="h-64 w-full bg-[#06080F] relative">
              <div className="absolute top-3 left-5 z-10">
                <p className="text-xs text-zinc-600 font-mono">Últimas {WINDOW_SIZE} interacciones</p>
              </div>
              <VicissitudesEngine />
            </div>
          </section>

          {/* ── Bottom grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left col: engine window + cert path */}
            <div className="space-y-6">

              {/* Sliding window */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-medium text-zinc-100 text-sm">Ventana Adaptativa</h3>
                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">n={WINDOW_SIZE}</span>
                </div>

                <div className="flex items-end gap-2 h-20 mb-5">
                  {recentXPItems.map(({ key, xp }) => {
                    const pct = (xp / 100) * 100;
                    const baseBarColor = xp < THRESHOLD_DOWN ? 'bg-emerald-500' : 'bg-sky-500';
                    const color = xp >= THRESHOLD_UP ? 'bg-purple-500' : baseBarColor;
                    return (
                      <div key={key} className="flex-1 flex flex-col justify-end gap-1">
                        <div className="relative bg-zinc-950 border border-zinc-800 rounded-t-sm overflow-hidden" style={{ height: `${Math.max(10, pct)}%` }}>
                          <div className={`absolute bottom-0 w-full h-1 ${color}`} />
                        </div>
                        <p className="text-center text-[10px] text-zinc-600 font-mono tabular-nums">{xp}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Promedio</p>
                    <p className="text-sm font-semibold text-zinc-200">{avg.toFixed(1)} / 100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Dificultad</p>
                    <Badge variant={nextDiff.toLowerCase() as BadgeVariant}>{nextDiff}</Badge>
                  </div>
                </div>
              </section>

              {/* Certification path */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <h3 className="font-medium text-zinc-100 text-sm mb-5">Ruta de Certificación</h3>
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-4 w-px bg-zinc-800" />
                  <div className="space-y-5">
                    {CEFR_STEPS.map((step, idx) => {
                      const isCurrent = step.level === activeLvl;
                      const isPast = idx < activeLvlIdx;
                      const pastOrDefaultCircle = isPast ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-950 border-zinc-800';
                      const circleClass = isCurrent ? 'bg-emerald-500 border-emerald-500' : pastOrDefaultCircle;
                      const pastOrDefaultText = isPast ? 'text-zinc-400' : 'text-zinc-700';
                      const textClass = isCurrent ? 'text-emerald-400' : pastOrDefaultText;
                      return (
                        <div key={step.level} className="flex gap-4 relative z-10">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors
                            ${circleClass}`}>
                            {isPast && <CheckCircle2 size={11} className="text-zinc-400" />}
                            {isCurrent && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${textClass}`}>
                              {step.level}
                            </p>
                            <p className="text-xs text-zinc-600">{step.label}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 h-6 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center shrink-0">
                        <Trophy size={11} className="text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-600">TOEFL</p>
                        <p className="text-xs text-zinc-700">Examen final</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right col: skill modules */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Módulos de Práctica</h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  El motor sugiere la habilidad con menor rendimiento. Puedes practicar cualquiera.
                </p>
              </div>

              {SKILLS.map(skill => {
                const nextId = findNextBySkill(skill.key, completedIds, totalXP);
                const recommended = skill.key === lowestSkill;

                return (
                  <div
                    key={skill.key}
                    className={`flex items-center justify-between p-5 rounded-xl border transition-all ${recommended
                      ? 'bg-emerald-950/20 border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.04)]'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${recommended ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        <skill.Icon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-zinc-100 font-medium text-sm">{skill.label}</h4>
                          {recommended && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              Sugerido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{skill.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden sm:block text-right">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Score</p>
                        <div className="flex items-end gap-0.5">
                          <span className="text-lg font-semibold text-zinc-200 leading-none">{avgScore}</span>
                          <span className="text-xs text-zinc-600 mb-0.5">/100</span>
                        </div>
                      </div>

                      {nextId ? (
                        <button
                          onClick={() => navigate(`/exercise/${nextId}`)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all shrink-0 ${recommended
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                            }`}
                        >
                          Practicar
                          {recommended && <ArrowRight size={14} />}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-zinc-600 border border-zinc-800 cursor-not-allowed shrink-0">
                          <Lock size={13} />
                          Bloqueado
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
