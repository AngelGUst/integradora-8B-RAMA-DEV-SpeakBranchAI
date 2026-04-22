/**
 * VicissitudesEngine - Atmospheric Field v3
 *
 * Un solo plano. Sin secciones. Sin estructura de dashboard.
 * Los datos flotan sobre el canvas.
 * The line is the protagonist. The alien lives on it.
 */

import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Headphones, AlignLeft, Languages } from 'lucide-react';

// --- Types ----------------------------------------------------------------------
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type Skill = 'grammar' | 'vocabulary' | 'reading' | 'listening';
interface Attempt { xp: number; difficulty: Difficulty; score: number; correct?: boolean }
interface Exercise { skill: Skill; prompt: string; options: string[]; correct: number }

const SEED: Attempt[] = [
  { xp: 8, difficulty: 'EASY', score: 72, correct: true },
  { xp: 15, difficulty: 'MEDIUM', score: 68, correct: false },
  { xp: 15, difficulty: 'MEDIUM', score: 75, correct: true },
  { xp: 23, difficulty: 'HARD', score: 81, correct: true },
  { xp: 15, difficulty: 'MEDIUM', score: 64, correct: false },
  { xp: 23, difficulty: 'HARD', score: 78, correct: true },
  { xp: 23, difficulty: 'HARD', score: 88, correct: true },
];

const EXERCISES: Exercise[] = [
  { skill: 'vocabulary', prompt: 'What is "perro" in English?', options: ['Cat', 'Dog', 'Bird', 'Fish'], correct: 1 },
  { skill: 'grammar', prompt: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'gone'], correct: 1 },
  { skill: 'reading', prompt: '"The sky is clear tonight." The weather is:', options: ['Rainy', 'Cloudy', 'Clear', 'Stormy'], correct: 2 },
  { skill: 'vocabulary', prompt: '"Ambitious" in Spanish:', options: ['Shy', 'Ambitious', 'Curious', 'Patient'], correct: 1 },
  { skill: 'grammar', prompt: 'Which is Past Simple?', options: ['I have visited.', 'I visited.', 'I was visit.', "I'm visiting."], correct: 1 },
  { skill: 'listening', prompt: '"Could you pass the salt?" is a:', options: ['Statement', 'Order', 'Request', 'Complaint'], correct: 2 },
  { skill: 'grammar', prompt: '"If I ___ more time, I would study."', options: ['have', 'will have', 'had', 'has'], correct: 2 },
  { skill: 'vocabulary', prompt: '"Groundbreaking" means:', options: ['Outdated', 'Revolutionary', 'Common', 'Confusing'], correct: 1 },
  { skill: 'reading', prompt: '"Despite the rain, he continued." He:', options: ['Stopped', 'Continued anyway', 'Enjoyed it', 'Asked help'], correct: 1 },
];

const SKILL_CFG: Record<Skill, { label: string; color: string; Icon: typeof BookOpen }> = {
  grammar: { label: 'Grammar', color: '#818CF8', Icon: AlignLeft },
  vocabulary: { label: 'Vocabulary', color: '#34D399', Icon: Languages },
  reading: { label: 'Lectura', color: '#38BDF8', Icon: BookOpen },
  listening: { label: 'Escucha', color: '#FB923C', Icon: Headphones },
};

// --- SVG Universe ---------------------------------------------------------------
// Wide viewBox. The line travels edge to edge.
// Margen generoso a la derecha para que el alien no quede cortado.

const VW = 1000, VH = 320;
const PL = 20, PR = 110, PT = 64, PB = 58;
const CW = VW - PL - PR;
const CH = VH - PT - PB;

const HARD_S = 72, EASY_S = 40, B2_S = 85;

function toY(s: number) { return PT + CH * (1 - Math.max(0, Math.min(100, s)) / 100); }
function toX(i: number, n: number) { return PL + (n < 2 ? CW / 2 : (i / (n - 1)) * CW); }

const Y_HARD = toY(HARD_S);
const Y_EASY = toY(EASY_S);
const Y_BOT = PT + CH;
const Y_TOP = PT;
const Y_B2 = toY(B2_S);

const ZONE_COLOR = { HARD: '#A78BFA', MEDIUM: '#38BDF8', EASY: '#34D399' } as const;

// --- Catmull-Rom -----------------------------------------------------------------
function catmull(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const c1x = (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1), c1y = (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1);
    const c2x = (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1), c2y = (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function trailFill(pts: [number, number][]): string {
  const line = catmull(pts);
  const last = pts[pts.length - 1], first = pts[0];
  return `${line} L${last[0]},${Y_BOT} L${first[0]},${Y_BOT} Z`;
}

// --- SVG Definitions (defs only, no visible elements) ----------------------------
function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      {/* Atmospheric zone radials */}
      <radialGradient id={`zh-${uid}`} cx="70%" cy="10%" r="80%">
        <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`zm-${uid}`} cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`ze-${uid}`} cx="30%" cy="100%" r="80%">
        <stop offset="0%" stopColor="#059669" stopOpacity="0.11" />
        <stop offset="100%" stopColor="#059669" stopOpacity="0" />
      </radialGradient>

      {/* Multicolor line gradient */}
      <linearGradient id={`lg-${uid}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="35%" stopColor="#38BDF8" />
        <stop offset="75%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#C084FC" />
      </linearGradient>

      {/* Area under line */}
      <linearGradient id={`ag-${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
      </linearGradient>

      {/* Line glow filter - two passes for depth */}
      <filter id={`glow-${uid}`} x="-15%" y="-200%" width="130%" height="500%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur6" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
        <feMerge>
          <feMergeNode in="blur6" />
          <feMergeNode in="blur2" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Alien aura glow */}
      <filter id={`aura-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="8" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>

      {/* Clip to chart area */}
      <clipPath id={`clip-${uid}`}>
        <rect x={PL - 5} y={0} width={CW + 10} height={VH} />
      </clipPath>
    </defs>
  );
}

// --- Zone Atmosphere -------------------------------------------------------------
function Atmosphere({ uid }: { uid: string }) {
  return (
    <g>
      {/* Zone fogs - full width bleed */}
      <rect x={0} y={0} width={VW} height={Y_HARD} fill={`url(#zh-${uid})`} />
      <rect x={0} y={Y_HARD} width={VW} height={Y_EASY - Y_HARD} fill={`url(#zm-${uid})`} />
      <rect x={0} y={Y_EASY} width={VW} height={Y_BOT - Y_EASY} fill={`url(#ze-${uid})`} />

      {/* Zone boundary whiskers - ultra subtle */}
      <line x1={PL} y1={Y_HARD} x2={PL + CW} y2={Y_HARD}
        stroke={ZONE_COLOR.HARD} strokeOpacity="0.07" strokeWidth="0.7" strokeDasharray="2 14" />
      <line x1={PL} y1={Y_EASY} x2={PL + CW} y2={Y_EASY}
        stroke={ZONE_COLOR.EASY} strokeOpacity="0.07" strokeWidth="0.7" strokeDasharray="2 14" />

      {/* B2 target line */}
      <line x1={PL} y1={Y_B2} x2={PL + CW} y2={Y_B2}
        stroke="rgba(52,211,153,0.16)" strokeWidth="0.8" strokeDasharray="3 11" />

      {/* B2 beacon label */}
      <g>
        <circle cx={PL + 8} cy={Y_B2} r={3} fill="#34D399" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <text x={PL + 18} y={Y_B2 - 5}
          fill="rgba(52,211,153,0.5)"
          fontSize="8.5" fontFamily="monospace" fontWeight="700" letterSpacing="2">
          OBJETIVO · B2
        </text>
      </g>

      {/* Zone ghost labels - pure atmosphere, barely visible */}
      <text x={VW - PR - 6} y={(Y_TOP + Y_HARD) / 2 + 3.5}
        textAnchor="end" fill={ZONE_COLOR.HARD} fillOpacity="0.16"
        fontSize="8" fontFamily="monospace" fontWeight="800" letterSpacing="2.5">
        HARD
      </text>
      <text x={VW - PR - 6} y={(Y_HARD + Y_EASY) / 2 + 3.5}
        textAnchor="end" fill={ZONE_COLOR.MEDIUM} fillOpacity="0.14"
        fontSize="8" fontFamily="monospace" fontWeight="800" letterSpacing="2.5">
        MEDIO
      </text>
      <text x={VW - PR - 6} y={(Y_EASY + Y_BOT) / 2 + 3.5}
        textAnchor="end" fill={ZONE_COLOR.EASY} fillOpacity="0.14"
        fontSize="8" fontFamily="monospace" fontWeight="800" letterSpacing="2.5">
        EASY
      </text>
    </g>
  );
}

// --- Trajectory Line -------------------------------------------------------------
function Trayectoria({ pts, attempts, uid }: {
  pts: [number, number][]; attempts: Attempt[]; uid: string
}) {
  if (!pts.length || pts.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) {
    return null;
  }
  const path = catmull(pts);
  const area = trailFill(pts);
  return (
    <g>
      {/* Filled area */}
      <g clipPath={`url(#clip-${uid})`}>
        <motion.path d={area} fill={`url(#ag-${uid})`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }} />
      </g>

      {/* Glowing main line */}
      <g clipPath={`url(#clip-${uid})`} filter={`url(#glow-${uid})`}>
        <motion.path d={path}
          fill="none" stroke={`url(#lg-${uid})`}
          strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }} />
      </g>

      {/* Checkpoint nodes - only past points */}
      {pts.slice(0, -1).map(([cx, cy], i) => {
        const ok = attempts[i].correct !== false;
        const color = ok ? ZONE_COLOR[attempts[i].difficulty] : '#F87171';
        return (
          <motion.circle key={i} cx={cx} cy={cy} r={3.5}
            fill={color} opacity={0.55}
            stroke={color} strokeWidth="1" strokeOpacity={0.25}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 + i * 0.09, type: 'spring', stiffness: 280, damping: 20 }} />
        );
      })}
    </g>
  );
}

// --- AlienPilot - positioned exactly at the line endpoint -------------
function AlienPilot({ cx, cy, color, mood }: {
  cx: number; cy: number; color: string; mood: 'neutral' | 'up' | 'down'
}) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  // La nave mide 28 × 50 unidades SVG.
  // `cy` is the point where the ship nozzle touches the line.
  // Desplazamos el grupo para que el fondo del cuerpo quede en cy.

  const tilt = mood === 'up' ? -5 : mood === 'down' ? 6 : 0;

  const flame = {
    ry: mood === 'up' ? [5, 10, 5] : mood === 'down' ? [2, 3.5, 2] : [3.5, 7, 3.5],
    dur: mood === 'up' ? 0.2 : mood === 'down' ? 0.55 : 0.36,
  };

  return (
    <motion.g
      animate={{ x: cx, y: cy, rotate: tilt }}
      initial={false}
      transition={{ type: 'spring', stiffness: 65, damping: 14 }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <g transform={`translate(-14,-52)`}>
        {/* Gravitational halo */}
        <motion.ellipse cx={14} cy={24} rx={28} ry={20}
          fill={color}
          animate={{ rx: [24, 34, 24], ry: [17, 24, 17], opacity: [0.04, 0.13, 0.04] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />

        {/* -- Hull -- */}
        <path d="M14 2 C8 2 5 8 5 15 L5 40 Q5 46 9.5 46 L18.5 46 Q23 46 23 40 L23 15 C23 8 20 2 14 2 Z"
          fill="#060C1A" stroke={color} strokeWidth="0.9" />
        {/* Hull accents */}
        <path d="M5 22 L5 32 Q5 34 7 34 L9 34 L9 22 Z" fill={color} opacity="0.1" />
        <path d="M23 22 L23 32 Q23 34 21 34 L19 34 L19 22 Z" fill={color} opacity="0.1" />
        {/* Cockpit */}
        <ellipse cx={14} cy={19} rx={6.5} ry={7.5}
          fill={color} opacity="0.08" />
        <ellipse cx={14} cy={19} rx={6.5} ry={7.5}
          fill="none" stroke={color} strokeWidth="0.7" opacity="0.38" />
        <ellipse cx={12} cy={15} rx={2.2} ry={2.8} fill="white" opacity="0.055" />
        {/* Fins */}
        <path d="M5 28 L0 39 L5 36 Z" fill="#0B1929" stroke={color} strokeWidth="0.5" />
        <path d="M23 28 L28 39 L23 36 Z" fill="#0B1929" stroke={color} strokeWidth="0.5" />
        {/* Nozzle */}
        <rect x={9} y={45} width={10} height={5.5} rx={2}
          fill="#030812" stroke={color} strokeWidth="0.6" />

        {/* -- Marcianito -- */}
        {/* Body */}
        <ellipse cx={14} cy={30} rx={4} ry={4.5} fill="#1DA870" />
        {/* Head */}
        <ellipse cx={14} cy={17} rx={5.2} ry={5.5} fill="#22C980" />
        {/* Eyes */}
        <ellipse cx={11.5} cy={15.5} rx={1.9} ry={2.2} fill="white" />
        <ellipse cx={16.5} cy={15.5} rx={1.9} ry={2.2} fill="white" />
        {/* Pupils */}
        <motion.circle cx={11.5} cy={16} r={1.1} fill="#030812"
          animate={{ cx: mood === 'up' ? 12 : mood === 'down' ? 11 : 11.5 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }} />
        <motion.circle cx={16.5} cy={16} r={1.1} fill="#030812"
          animate={{ cx: mood === 'up' ? 17 : mood === 'down' ? 16 : 16.5 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }} />
        {/* Glints */}
        <circle cx={12.2} cy={15} r={0.5} fill="white" opacity="0.88" />
        <circle cx={17.2} cy={15} r={0.5} fill="white" opacity="0.88" />
        {/* Antennae */}
        <line x1={12.5} y1={12} x2={10.2} y2={8.5} stroke="#22C980" strokeWidth="0.7" />
        <circle cx={9.8} cy={8} r={1.1} fill="#5EEBB0" />
        <line x1={15.5} y1={12} x2={17.8} y2={8.5} stroke="#22C980" strokeWidth="0.7" />
        <circle cx={18.2} cy={8} r={1.1} fill="#5EEBB0" />
        {/* Mouth */}
        {mood === 'up' && <path d="M12 21 Q14 22.5 16 21" stroke="#030812" strokeWidth="0.7" fill="none" strokeLinecap="round" />}
        {mood === 'down' && <path d="M12 22 Q14 20.5 16 22" stroke="#030812" strokeWidth="0.7" fill="none" strokeLinecap="round" />}
        {mood === 'neutral' && <path d="M12 21.5 Q14 21.8 16 21.5" stroke="#030812" strokeWidth="0.7" fill="none" strokeLinecap="round" />}

        {/* -- Engine flame -- */}
        <motion.ellipse cx={14} cy={53} rx={4.5} ry={0}
          fill="#FCD34D"
          animate={{ ry: flame.ry, opacity: [0.95, 0.5, 0.95] }}
          transition={{ duration: flame.dur, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.ellipse cx={14} cy={55.5} rx={2.8} ry={0}
          fill="#F97316"
          animate={{ ry: flame.ry.map(v => v * 0.52) }}
          transition={{ duration: flame.dur * 0.75, repeat: Infinity }} />
        {mood === 'down' && (
          <motion.ellipse cx={14} cy={58} rx={8} ry={0}
            fill="#1E293B"
            animate={{ ry: [2, 5, 2], opacity: [0.25, 0.07, 0.25] }}
            transition={{ duration: 1, repeat: Infinity }} />
        )}
      </g>
    </motion.g>
  );
}

// --- Floating stats - posicionados sobre el canvas SVG como texto -----------------
// Todo en el mismo layer: nada por encima, nada por debajo.

function FloatingStats({ attempts, uid: _uid }: {
  attempts: Attempt[]; uid: string
}) {
  const totalXP = attempts.reduce((s, a) => s + a.xp, 0);
  const lastDiff = attempts.at(-1)?.difficulty ?? 'MEDIUM';
  const lastColor = ZONE_COLOR[lastDiff];
  const streak = (() => {
    let s = 0;
    for (let i = attempts.length - 1; i >= 0; i--) { if (attempts[i].correct !== false) s++; else break; }
    return s;
  })();
  const bestScore = Math.max(...attempts.map(a => a.score));
  const b2Pct = Math.min(100, Math.round((bestScore / B2_S) * 100));

  // Progress bar segments (5 segs) as SVG rects
  const barSegs = Math.round(b2Pct / 20);
  const barY = VH - 16;
  const barX = VW / 2 - 62;

  return (
    <g fontFamily="monospace">
      {/* -- TOP LEFT: XP -- */}
      <text x={PL} y={PT - 28}
        fontSize="8.5" fontWeight="700" fill="rgba(255,255,255,0.22)"
        letterSpacing="2">XP ACUMULADO</text>
      <text x={PL} y={PT - 10}
        fontSize="26" fontWeight="900" fill={lastColor}
        style={{ filter: `drop-shadow(0 0 12px ${lastColor}66)` }}>
        {totalXP}
      </text>

      {/* -- TOP RIGHT: Streak -- */}
      <text x={VW - PR} y={PT - 28} textAnchor="end"
        fontSize="8.5" fontWeight="700" fill="rgba(255,255,255,0.22)"
        letterSpacing="2">STREAK</text>
      <text x={VW - PR} y={PT - 10} textAnchor="end"
        fontSize="26" fontWeight="900" fill="#FB923C"
        style={{ filter: 'drop-shadow(0 0 12px rgba(251,146,60,0.55))' }}>
        {streak}
      </text>

      {/* -- BOTTOM LEFT: attempts + zona -- */}
      <text x={PL} y={VH - 26}
        fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.2)"
        letterSpacing="2">INTENTOS</text>
      <text x={PL} y={VH - 10}
        fontSize="18" fontWeight="900" fill="rgba(255,255,255,0.65)">
        {attempts.length}
      </text>

      <text x={PL + 56} y={VH - 26}
        fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.2)"
        letterSpacing="2">ZONA</text>
      <text x={PL + 56} y={VH - 10}
        fontSize="18" fontWeight="900" fill={lastColor}
        style={{ filter: `drop-shadow(0 0 8px ${lastColor}55)` }}>
        {lastDiff}
      </text>

      {/* -- BOTTOM CENTER: B2 progress bar -- */}
      <text x={barX + 62} y={barY - 12} textAnchor="middle"
        fontSize="7.5" fontWeight="700" fill="rgba(255,255,255,0.2)"
        letterSpacing="2">HACIA B2</text>
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i}
          x={barX + i * 25} y={barY - 7}
          width={22} height={4} rx={2}
          fill={i < barSegs ? '#34D399' : 'rgba(255,255,255,0.07)'} />
      ))}
      <text x={barX + 132} y={barY - 2.5}
        fontSize="8.5" fontWeight="700" fill="rgba(52,211,153,0.55)">
        {b2Pct}%
      </text>

      {/* -- BOTTOM RIGHT: mejor score -- */}
      <text x={VW - PR} y={VH - 26} textAnchor="end"
        fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.2)"
        letterSpacing="2">MEJOR</text>
      <text x={VW - PR} y={VH - 10} textAnchor="end"
        fontSize="18" fontWeight="900" fill="rgba(255,255,255,0.55)">
        {bestScore}<tspan fontSize="10" fill="rgba(255,255,255,0.22)">pts</tspan>
      </text>
    </g>
  );
}

// --- ExerciseSheet -------------------------------------------------------------
function ExerciseSheet({ exercise, index, onAnswer, onClose }: {
  exercise: Exercise; index: number;
  onAnswer: (c: boolean, s: number) => void;
  onClose: () => void
}) {
  const [sel, setSel] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { color, label, Icon } = SKILL_CFG[exercise.skill];

  function confirm() {
    if (sel === null || revealed) return;
    const ok = sel === exercise.correct;
    const score = ok ? Math.round(65 + Math.random() * 30) : Math.round(30 + Math.random() * 30);
    setRevealed(true);
    setTimeout(() => { onAnswer(ok, score); setSel(null); setRevealed(false); }, 700);
  }

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 overflow-hidden rounded-b-2xl"
      style={{
        background: 'rgba(5,7,15,0.97)',
        backdropFilter: 'blur(28px)',
        borderTop: `1px solid ${color}22`,
        zIndex: 20,
      }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '105%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div className="flex items-start gap-4 px-6 py-5">
        <span className="mt-0.5 flex shrink-0 h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${color}14`, color }}>
          <Icon size={12} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="mb-2" style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color }}>
            {label} · {index + 1}
          </p>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {exercise.prompt}
          </p>
        </div>
        <div className="flex w-56 shrink-0 flex-col gap-1.5">
          {exercise.options.map((opt, i) => {
            let bg = 'rgba(255,255,255,0.03)', bc = 'rgba(255,255,255,0.07)', tc = '#64748B';
            if (revealed) {
              if (i === exercise.correct) { bg = 'rgba(16,185,129,0.1)'; bc = '#10B981'; tc = '#6EE7B7'; }
              else if (i === sel) { bg = 'rgba(239,68,68,0.08)'; bc = '#EF4444'; tc = '#FCA5A5'; }
            } else if (i === sel) { bg = `${color}10`; bc = `${color}55`; tc = '#F1F5F9'; }
            return (
              <motion.button key={i}
                onClick={() => { if (!revealed) setSel(i); }}
                whileHover={!revealed ? { x: 2 } : {}}
                className="rounded-xl px-3 py-2 text-left text-xs font-medium transition-all"
                style={{ background: bg, border: `1px solid ${bc}`, color: tc }}>
                <span style={{ fontFamily: 'monospace', fontSize: 8, opacity: 0.25, marginRight: 4 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </motion.button>
            );
          })}
        </div>
        <div className="flex shrink-0 flex-col gap-2 items-center justify-between self-stretch">
          <motion.button onClick={confirm}
            disabled={sel === null || revealed}
            whileHover={sel !== null && !revealed ? { scale: 1.05 } : {}}
            whileTap={sel !== null && !revealed ? { scale: 0.95 } : {}}
            className="rounded-xl px-5 py-2"
            style={{
              fontFamily: 'monospace', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em',
              background: sel !== null && !revealed ? color : 'rgba(255,255,255,0.04)',
              color: sel !== null && !revealed ? '#030812' : '#334155',
              boxShadow: sel !== null && !revealed ? `0 0 22px ${color}45` : 'none',
              transition: 'all 0.2s',
            }}>
            OK
          </motion.button>
          <button onClick={onClose}
            style={{ fontFamily: 'monospace', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#334155' }}
            className="hover:text-slate-500 transition-colors">
            esc
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- Main ------------------------------------------------------------------------
export default function VicissitudesEngine() {
  const uid = useId().replace(/:/g, '');
  const [attempts, setAttempts] = useState<Attempt[]>(SEED);
  const [practicing, setPracticing] = useState(false);
  const [exIdx, setExIdx] = useState(0);
  const [mood, setMood] = useState<'neutral' | 'up' | 'down'>('neutral');

  const n = attempts.length;
  const pts = attempts.map<[number, number]>((a, i) => [toX(i, n), toY(a.score)]);
  const last = pts[pts.length - 1];
  const lastD = attempts.at(-1)?.difficulty ?? 'MEDIUM';

  function handleAnswer(ok: boolean, score: number) {
    const diff = score >= HARD_S ? 'HARD' : score >= EASY_S ? 'MEDIUM' : 'EASY';
    const xp = diff === 'HARD' ? 23 : diff === 'MEDIUM' ? 15 : 8;
    setAttempts(prev => [...prev, { xp, difficulty: diff, score, correct: ok }]);
    setMood(ok ? 'up' : 'down');
    setTimeout(() => setMood('neutral'), 1500);
    const next = exIdx + 1;
    if (next >= EXERCISES.length) { setPracticing(false); setExIdx(0); }
    else setExIdx(next);
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        background:
          'radial-gradient(ellipse 130% 90% at 75% 25%,#0D1528 0%,#060911 55%,#030610 100%)',
      }}
    >
      {/* Scanline texture overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,transparent 0,transparent 3px,rgba(255,255,255,0.011) 3px,rgba(255,255,255,0.011) 4px)',
        zIndex: 1,
      }} />

      {/* -- Single SVG universe - EVERYTHING lives here -- */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', position: 'relative', zIndex: 2 }}
      >
        <Defs uid={uid} />
        <Atmosphere uid={uid} />
        {n > 1 && <Trayectoria pts={pts} attempts={attempts} uid={uid} />}
        <FloatingStats attempts={attempts} uid={uid} />
        {n > 0 && (
          <AlienPilot
            cx={last[0]} cy={last[1]}
            color={ZONE_COLOR[lastD]}
            mood={mood}
          />
        )}
      </svg>

      {/* Vocabulary flows below the canvas without a separate section break */}
      <motion.div
        className="flex flex-wrap gap-1.5 px-5 pb-5 pt-3"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.038)',
          background: 'rgba(3,6,15,0.65)',
          position: 'relative', zIndex: 3,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.7 }}
      >
        {([
          { word: 'eloquent', level: 'B2', ok: true },
          { word: 'scrutinize', level: 'C1', ok: true },
          { word: 'meticulous', level: 'B2', ok: false },
          { word: 'perseverance', level: 'B2', ok: false },
          { word: 'ambiguous', level: 'B1', ok: false },
          { word: 'endeavour', level: 'B2', ok: true },
          { word: 'nuance', level: 'B2', ok: false },
        ] as const).map((v, i) => (
          <motion.span key={v.word}
            style={{
              fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
              color: v.ok ? '#34D399' : 'rgba(255,255,255,0.28)',
              background: v.ok ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.025)',
              border: `1px solid ${v.ok ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 8, padding: '5px 11px',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              cursor: 'default',
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 + i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
            whileHover={{ y: -1 }}
          >
            {v.word}
            <span style={{
              fontSize: 7.5, fontWeight: 800,
              color: v.ok ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.18)',
              letterSpacing: '0.1em',
            }}>
              {v.level}
            </span>
          </motion.span>
        ))}

        {/* Practice button lives inline with vocab, right-aligned */}
        <motion.button
          onClick={() => { setExIdx(0); setPracticing(true); }}
          className="ml-auto rounded-full"
          style={{
            fontFamily: 'monospace', fontSize: 8.5, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.22em',
            padding: '7px 18px',
            background: `${ZONE_COLOR[lastD]}10`,
            color: ZONE_COLOR[lastD],
            border: `1px solid ${ZONE_COLOR[lastD]}28`,
            boxShadow: `0 0 16px ${ZONE_COLOR[lastD]}16`,
          }}
          whileHover={{ scale: 1.05, boxShadow: `0 0 28px ${ZONE_COLOR[lastD]}35` }}
          whileTap={{ scale: 0.94 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          + practicar
        </motion.button>
      </motion.div>

      {/* -- Exercise sheet overlay -- */}
      <AnimatePresence>
        {practicing && (
          <ExerciseSheet
            key={exIdx}
            exercise={EXERCISES[exIdx % EXERCISES.length]}
            index={exIdx}
            onAnswer={handleAnswer}
            onClose={() => setPracticing(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

