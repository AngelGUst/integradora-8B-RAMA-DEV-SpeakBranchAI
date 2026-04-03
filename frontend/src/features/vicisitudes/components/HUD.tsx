import { motion } from 'framer-motion';
import { Heart, Zap } from 'lucide-react';
import { useGame } from '../store/GameContext';

const ZONE_LABEL: Record<string, string> = {
  atmosfera: 'ATMÓSFERA · A1',
  orbita:    'ÓRBITA · A2',
  vacio:     'EL VACÍO · B1+',
};

const ZONE_COLOR: Record<string, string> = {
  atmosfera: '#38BDF8',
  orbita:    '#A78BFA',
  vacio:     '#F472B6',
};

function currentZone(alt: number): string {
  if (alt < 44) return 'atmosfera';
  if (alt < 77) return 'orbita';
  return 'vacio';
}

export function HUD() {
  const { state } = useGame();
  const { altitude, fuel, score, streak, lives, checkpoints } = state;
  const zone = currentZone(altitude);
  const zoneColor = ZONE_COLOR[zone];

  const totalCPs   = checkpoints.length;
  const clearedCPs = checkpoints.filter(c => c.cleared).length;

  return (
    <>
      {/* ── TOP BAR ────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-3">
        {/* Zone name */}
        <motion.span
          key={zone}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-xs font-bold tracking-[0.2em] uppercase"
          style={{ color: zoneColor, textShadow: `0 0 12px ${zoneColor}` }}
        >
          {ZONE_LABEL[zone]}
        </motion.span>

        {/* Score + streak */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-lg font-black tabular-nums text-white">
            {score.toLocaleString()}
          </span>
          {streak >= 2 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="font-mono text-[10px] font-bold tracking-widest"
              style={{ color: '#FCD34D' }}
            >
              ×{streak} RACHA
            </motion.span>
          )}
        </div>

        {/* Lives */}
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              size={16}
              fill={i < lives ? '#F87171' : 'transparent'}
              stroke={i < lives ? '#F87171' : '#374151'}
            />
          ))}
        </div>
      </div>

      {/* ── LEFT VERTICAL BAR — FUEL ───────────────────────────────── */}
      <div className="pointer-events-none absolute left-4 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5">
        <Zap size={12} color="#FCD34D" />
        <div
          className="relative overflow-hidden rounded-full"
          style={{ width: 8, height: 120, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <motion.div
            className="absolute bottom-0 w-full rounded-full"
            style={{ background: fuel > 30 ? '#34D399' : '#F87171' }}
            animate={{ height: `${fuel}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          />
        </div>
        <span className="font-mono text-[9px] font-bold tracking-widest text-slate-500">
          {Math.round(fuel)}%
        </span>
        <span className="font-mono text-[8px] tracking-widest text-slate-600 uppercase">fuel</span>
      </div>

      {/* ── RIGHT VERTICAL BAR — ALTITUDE ─────────────────────────── */}
      <div className="pointer-events-none absolute right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5">
        <span className="font-mono text-[9px] font-bold text-slate-400">ALT</span>
        <div
          className="relative overflow-hidden rounded-full"
          style={{ width: 8, height: 120, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <motion.div
            className="absolute bottom-0 w-full rounded-full"
            style={{ background: zoneColor }}
            animate={{ height: `${altitude}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          />
        </div>
        <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: zoneColor }}>
          {Math.round(altitude)}%
        </span>
      </div>

      {/* ── BOTTOM CHECKPOINT DOTS ─────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {checkpoints.map(cp => {
            const zc = ZONE_COLOR[cp.zone];
            return (
              <motion.div
                key={cp.id}
                className="rounded-full"
                style={{
                  width:      cp.cleared ? 8 : 6,
                  height:     cp.cleared ? 8 : 6,
                  background: cp.cleared ? zc : 'rgba(255,255,255,0.15)',
                  border:     `1px solid ${zc}`,
                  boxShadow:  cp.cleared ? `0 0 8px ${zc}` : 'none',
                }}
                animate={{ scale: cp.cleared ? [1, 1.4, 1] : 1 }}
                transition={{ duration: 0.4 }}
              />
            );
          })}
        </div>
        <span className="font-mono text-[9px] tracking-widest text-slate-600 uppercase">
          {clearedCPs}/{totalCPs} checkpoints
        </span>
      </div>
    </>
  );
}
