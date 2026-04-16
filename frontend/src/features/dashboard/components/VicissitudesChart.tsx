import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────

interface SessionPoint {
  session: number;
  score: number; // 0-100
  label?: string;
}

interface VicissitudesChartProps {
  data?: SessionPoint[];
  title?: string;
  subtitle?: string;
}

// ── Chart constants ───────────────────────────────────────────

const VB_W = 1000;
const VB_H = 300;
const C = { x: 72, y: 24, w: 888, h: 240 } as const; // chart area

// Zone thresholds (score)
const HARD_THRESHOLD = 68; // score >= 68 → Difícil zone
const EASY_THRESHOLD = 32; // score <= 32 → Fácil zone

// Default mock data — dramatic learning journey
const DEFAULT_DATA: SessionPoint[] = [
  { session: 1,  score: 48 },
  { session: 2,  score: 79 },
  { session: 3,  score: 33 },
  { session: 4,  score: 87 },
  { session: 5,  score: 22 },
  { session: 6,  score: 74 },
  { session: 7,  score: 52 },
  { session: 8,  score: 91 },
  { session: 9,  score: 38 },
  { session: 10, score: 66 },
  { session: 11, score: 55 },
  { session: 12, score: 83 },
  { session: 13, score: 28 },
  { session: 14, score: 77 },
  { session: 15, score: 42 },
  { session: 16, score: 88 },
  { session: 17, score: 35 },
  { session: 18, score: 71 },
];

// ── SVG math helpers ──────────────────────────────────────────

function scoreToY(score: number): number {
  return C.y + (1 - score / 100) * C.h;
}

function indexToX(i: number, total: number): number {
  if (total <= 1) return C.x + C.w / 2;
  return C.x + (i / (total - 1)) * C.w;
}

interface Pt { x: number; y: number }

function buildLinePath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  const d: string[] = [`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = ((pts[i].x + pts[i + 1].x) / 2).toFixed(2);
    d.push(
      `C ${cpX} ${pts[i].y.toFixed(2)} ${cpX} ${pts[i + 1].y.toFixed(2)} ${pts[i + 1].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`
    );
  }
  return d.join(' ');
}

function buildAreaPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) {
    const bottomY = (C.y + C.h).toFixed(2);
    return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} L ${pts[0].x.toFixed(2)} ${bottomY} Z`;
  }
  const line = buildLinePath(pts);
  const bottomY = (C.y + C.h).toFixed(2);
  return `${line} L ${pts.at(-1)?.x.toFixed(2) ?? pts[0].x.toFixed(2)} ${bottomY} L ${pts[0].x.toFixed(2)} ${bottomY} Z`;
}

// ── Tooltip ───────────────────────────────────────────────────

interface TooltipData {
  x: number;
  y: number;
  session: number;
  score: number;
  svgX: number;
  svgY: number;
}

function getZoneLabel(score: number): { label: string; color: string } {
  if (score >= HARD_THRESHOLD) return { label: 'Difícil', color: '#ef4444' };
  if (score <= EASY_THRESHOLD) return { label: 'Fácil', color: '#60a5fa' };
  return { label: 'Medio', color: '#10b981' };
}

// ── Main component ────────────────────────────────────────────

export default function VicissitudesChart({
  data = DEFAULT_DATA,
  title = 'Tu travesía de aprendizaje',
  subtitle = 'Rendimiento por sesión',
}: Readonly<VicissitudesChartProps>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [animated, setAnimated] = useState(false);

  // Trigger draw animation on mount
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  const pts: Pt[] = data.map((d, i) => ({
    x: indexToX(i, data.length),
    y: scoreToY(d.score),
  }));

  const linePath = buildLinePath(pts);
  const areaPath = buildAreaPath(pts);

  const lastPt = pts.at(-1) ?? null;
  const lastScore = data.at(-1)?.score ?? 0;
  const lastZone = getZoneLabel(lastScore);

  // Zone Y coordinates
  const hardY = scoreToY(HARD_THRESHOLD);
  const easyY = scoreToY(EASY_THRESHOLD);
  const middleY = scoreToY(50);

  // Hover interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * VB_W;

    // Find closest data point
    let closest = 0;
    let minDist = Infinity;
    pts.forEach((p, i) => {
      const dist = Math.abs(p.x - rawX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });

    if (minDist < C.w / data.length) {
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        session: data[closest].session,
        score: data[closest].score,
        svgX: pts[closest].x,
        svgY: pts[closest].y,
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0C1018]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Zone legend */}
          {[
            { label: 'Difícil', color: 'bg-red-500/70' },
            { label: 'Medio', color: 'bg-emerald-500/70' },
            { label: 'Fácil', color: 'bg-blue-500/70' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
              <span className="text-[11px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative px-2 pb-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          height="auto"
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            {/* Line gradient: violet → emerald */}
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#7c3aed" />
              <stop offset="50%"  stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Area fill gradient */}
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>

            {/* Glow filter for the line */}
            <filter id="lineGlow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow for dot */}
            <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clip to chart area */}
            <clipPath id="chartClip">
              <rect x={C.x} y={C.y - 4} width={C.w} height={C.h + 8} />
            </clipPath>
          </defs>

          {/* ── Zone backgrounds ── */}
          {/* Difícil (top) */}
          <rect
            x={C.x} y={C.y}
            width={C.w} height={hardY - C.y}
            fill="rgba(239,68,68,0.05)"
            rx="0"
          />
          {/* Fácil (bottom) */}
          <rect
            x={C.x} y={easyY}
            width={C.w} height={C.y + C.h - easyY}
            fill="rgba(96,165,250,0.05)"
          />

          {/* ── Zone threshold lines ── */}
          {/* Difícil line */}
          <line
            x1={C.x} y1={hardY} x2={C.x + C.w} y2={hardY}
            stroke="rgba(239,68,68,0.35)" strokeWidth="1"
            strokeDasharray="6 4"
          />
          {/* Medio line (center reference) */}
          <line
            x1={C.x} y1={middleY} x2={C.x + C.w} y2={middleY}
            stroke="rgba(16,185,129,0.2)" strokeWidth="1"
          />
          {/* Fácil line */}
          <line
            x1={C.x} y1={easyY} x2={C.x + C.w} y2={easyY}
            stroke="rgba(96,165,250,0.35)" strokeWidth="1"
            strokeDasharray="6 4"
          />

          {/* ── Zone labels (right side) ── */}
          <text x={C.x + C.w + 10} y={hardY - 6} fontSize="11" fill="rgba(239,68,68,0.7)" fontFamily="Inter,sans-serif" fontWeight="600">Difícil</text>
          <text x={C.x + C.w + 10} y={middleY + 4}  fontSize="11" fill="rgba(16,185,129,0.6)" fontFamily="Inter,sans-serif" fontWeight="600">Medio</text>
          <text x={C.x + C.w + 10} y={easyY + 14}  fontSize="11" fill="rgba(96,165,250,0.7)" fontFamily="Inter,sans-serif" fontWeight="600">Fácil</text>

          {/* "0" marker on medio line */}
          <text x={C.x + C.w + 10} y={middleY + 16} fontSize="10" fill="rgba(255,255,255,0.2)" fontFamily="Inter,sans-serif">0</text>

          {/* ── Vertical hover line ── */}
          {tooltip && (
            <line
              x1={tooltip.svgX} y1={C.y}
              x2={tooltip.svgX} y2={C.y + C.h}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}

          {/* ── Area fill (clipped) ── */}
          <g clipPath="url(#chartClip)">
            <motion.path
              d={areaPath}
              fill="url(#areaGrad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: animated ? 1 : 0 }}
              transition={{ duration: 1.2, delay: 1.5, ease: 'easeOut' }}
            />
          </g>

          {/* ── Main line (animated draw) ── */}
          <g clipPath="url(#chartClip)" filter="url(#lineGlow)">
            <motion.path
              d={linePath}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: animated ? 1 : 0, opacity: animated ? 1 : 0 }}
              transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            />
          </g>

          {/* ── Session dots (appear after line drawn) ── */}
          {animated && pts.map((p, i) => {
            const isHovered = tooltip?.session === data[i].session;
            return (
              <motion.circle
                key={data[i].session}
                cx={p.x} cy={p.y} r={isHovered ? 5 : 3}
                fill={isHovered ? '#10b981' : 'rgba(255,255,255,0.3)'}
                stroke={isHovered ? 'rgba(16,185,129,0.4)' : 'none'}
                strokeWidth="4"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: isHovered ? 1 : 0.6 }}
                transition={{ delay: 0.1 + (i / pts.length) * 1.8, duration: 0.3 }}
                style={{ cursor: 'crosshair' }}
              />
            );
          })}

          {/* ── Current position pulsating dot ── */}
          {animated && lastPt && (
            <>
              {/* Outer pulse ring */}
              <motion.circle
                cx={lastPt.x} cy={lastPt.y} r={10}
                fill={`${lastZone.color}22`}
                animate={{ r: [10, 16, 10], opacity: [0.6, 0.1, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Inner dot */}
              <motion.circle
                cx={lastPt.x} cy={lastPt.y} r={5}
                fill={lastZone.color}
                filter="url(#dotGlow)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2.5, duration: 0.4, type: 'spring' }}
              />
              {/* Score label above dot */}
              <motion.g
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.7, duration: 0.4 }}
              >
                <rect
                  x={lastPt.x - 18} y={lastPt.y - 28}
                  width={36} height={18}
                  rx="5"
                  fill="rgba(16,185,129,0.18)"
                  stroke="rgba(16,185,129,0.35)"
                  strokeWidth="1"
                />
                <text
                  x={lastPt.x} y={lastPt.y - 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#10b981"
                  fontFamily="Inter,sans-serif"
                  fontWeight="700"
                >
                  {lastScore}%
                </text>
              </motion.g>
            </>
          )}

          {/* ── X-axis session markers ── */}
          {data.map((d, i) => {
            const x = indexToX(i, data.length);
            const showLabel = i === 0 || i === data.length - 1 || i % 3 === 0;
            return showLabel ? (
              <g key={d.session}>
                <line
                  x1={x} y1={C.y + C.h}
                  x2={x} y2={C.y + C.h + 4}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
                <text
                  x={x} y={C.y + C.h + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(255,255,255,0.25)"
                  fontFamily="Inter,sans-serif"
                >
                  S{d.session}
                </text>
              </g>
            ) : null;
          })}

          {/* ── Tooltip hover dot (active point) ── */}
          {tooltip && (
            <>
              <circle
                cx={tooltip.svgX} cy={tooltip.svgY} r={7}
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
              />
              <circle
                cx={tooltip.svgX} cy={tooltip.svgY} r={3.5}
                fill="white"
              />
            </>
          )}
        </svg>

        {/* ── HTML Tooltip ── */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              className="pointer-events-none absolute z-20 rounded-lg border border-white/[0.1] bg-[#0C1018]/95 px-3 py-2 shadow-xl backdrop-blur-sm"
              style={{
                left: tooltip.x + 14,
                top: tooltip.y - 36,
                transform: tooltip.x > 700 ? 'translateX(-110%)' : undefined,
              }}
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">S{tooltip.session}</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: getZoneLabel(tooltip.score).color }}
                >
                  {tooltip.score}%
                </span>
                <span
                  className="rounded px-1 py-0.5 text-[9px] font-semibold"
                  style={{
                    color: getZoneLabel(tooltip.score).color,
                    background: `${getZoneLabel(tooltip.score).color}22`,
                  }}
                >
                  {getZoneLabel(tooltip.score).label}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
