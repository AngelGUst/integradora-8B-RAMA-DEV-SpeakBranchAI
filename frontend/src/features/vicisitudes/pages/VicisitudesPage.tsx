import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { GameProvider, useGame } from '../store/GameContext';
import { Spaceship } from '../components/Spaceship';
import { HUD } from '../components/HUD';
import { ExerciseOverlay } from '../components/ExerciseOverlay';
import type { CefrZone } from '../types/game.types';

// ─── Star field (generated once) ─────────────────────────────────────────────
function rnd(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
const STARS = Array.from({ length: 120 }, (_, i) => ({
  x:    rnd(i * 3 + 1) * 100,
  y:    rnd(i * 3 + 2) * 300,   // 0-300vh world space
  size: rnd(i * 3 + 3) * 2 + 0.5,
  op:   rnd(i * 7 + 11) * 0.6 + 0.2,
}));

// ─── Zone visual data ─────────────────────────────────────────────────────────
const ZONES: { id: CefrZone; from: number; to: number; skyTop: string; skyBot: string; label: string }[] = [
  { id: 'atmosfera', from: 0,   to: 44,  skyTop: '#0B1A2C', skyBot: '#061022', label: 'A T M O S P H E R E' },
  { id: 'orbita',    from: 44,  to: 77,  skyTop: '#0D0525', skyBot: '#07031A', label: 'O R B I T' },
  { id: 'vacio',     from: 77,  to: 100, skyTop: '#030307', skyBot: '#020204', label: 'V O I D' },
];

const ZONE_ACCENT: Record<CefrZone, string> = {
  atmosfera: '#38BDF8',
  orbita:    '#A78BFA',
  vacio:     '#F472B6',
};

// ─── Inner game scene ─────────────────────────────────────────────────────────
function GameScene() {
  const { state, startGame, tick, dismissResult, reset } = useGame();
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  // Motion value for smooth world scroll
  const worldY = useMotionValue(0);
  const smoothY = useSpring(worldY, { stiffness: 60, damping: 20 });

  // Animate world offset: altitude 0% → world stays at 0; 100% → world scrolls up 200vh
  useEffect(() => {
    // worldOffsetPct 0→100 maps to 0→-200vh
    worldY.set(-(state.worldOffsetPct / 100) * 200);
  }, [state.worldOffsetPct, worldY]);

  // Game loop
  const gameLoop = useCallback((ts: number) => {
    if (lastRef.current === 0) lastRef.current = ts;
    const delta = ts - lastRef.current;
    lastRef.current = ts;
    tick(delta);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [tick]);

  useEffect(() => {
    if (state.phase === 'flying') {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.phase, gameLoop]);

  // Auto-dismiss result flash after 0.9s
  useEffect(() => {
    if (state.phase === 'result_correct' || state.phase === 'result_wrong') {
      const t = setTimeout(() => dismissResult(), 900);
      return () => clearTimeout(t);
    }
  }, [state.phase, dismissResult]);

  const currentZone: CefrZone = state.altitude < 44 ? 'atmosfera' : state.altitude < 77 ? 'orbita' : 'vacio';
  const accentColor = ZONE_ACCENT[currentZone];

  // Ship vertical position: stays roughly 35% from top while world scrolls
  const shipY = '62%';

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ fontFamily: 'monospace' }}>

      {/* ══ WORLD (scrolls vertically) ══════════════════════════════ */}
      <motion.div
        className="absolute inset-x-0"
        style={{
          top: 0,
          height: '300vh',   // 3 viewports tall
          y: smoothY as unknown as number,
        }}
      >
        {/* ── Atmospheric gradient (bottom 0-44%) ── */}
        <div
          className="absolute inset-x-0"
          style={{
            bottom: 0,
            height: '44%',
            background: 'linear-gradient(to top, #061022, #0B1A2C)',
          }}
        />
        {/* ── Orbit gradient (44-77%) ── */}
        <div
          className="absolute inset-x-0"
          style={{
            bottom: '44%',
            height: '33%',
            background: 'linear-gradient(to top, #07031A, #0D0525)',
          }}
        />
        {/* ── Void (77-100%) ── */}
        <div
          className="absolute inset-x-0"
          style={{
            bottom: '77%',
            height: '23%',
            background: 'linear-gradient(to top, #020204, #030307)',
          }}
        />

        {/* ── Stars ── */}
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left:    `${s.x}%`,
              bottom:  `${s.y / 3}%`,   // map 0-300vh to 0-100% of world height
              width:   s.size,
              height:  s.size,
              opacity: s.op,
            }}
          />
        ))}

        {/* ── Zone labels (watermark) ── */}
        {ZONES.map(z => (
          <div
            key={z.id}
            className="pointer-events-none absolute inset-x-0 flex items-center justify-center"
            style={{
              bottom:    `${(z.from + (z.to - z.from) / 2) / 3}%`,
              transform: 'translateY(50%)',
            }}
          >
            <span
              className="font-mono text-[10px] font-bold tracking-[0.4em]"
              style={{ color: `${ZONE_ACCENT[z.id]}18` }}
            >
              {z.label}
            </span>
          </div>
        ))}

        {/* ── Checkpoint rings on the world ── */}
        {state.checkpoints.map(cp => (
          <div
            key={cp.id}
            className="pointer-events-none absolute inset-x-0 flex items-center justify-center"
            style={{
              bottom:    `${cp.altitudePct / 3}%`,
              transform: 'translateY(50%)',
            }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold"
              style={{
                border: `1.5px solid ${ZONE_ACCENT[cp.zone]}${cp.cleared ? 'CC' : '40'}`,
                color:  `${ZONE_ACCENT[cp.zone]}${cp.cleared ? 'FF' : '60'}`,
                background: cp.cleared ? `${ZONE_ACCENT[cp.zone]}18` : 'transparent',
                boxShadow: cp.cleared ? `0 0 16px ${ZONE_ACCENT[cp.zone]}40` : 'none',
              }}
            >
              {cp.id}
            </div>
            <div
              className="absolute inset-x-8"
              style={{
                height: 1,
                background: `linear-gradient(to right, transparent, ${ZONE_ACCENT[cp.zone]}30, transparent)`,
              }}
            />
          </div>
        ))}

        {/* ── Space station at the top (97% altitude) ── */}
        <div
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
          style={{ bottom: '96%', transform: 'translateY(50%)' }}
        >
          <motion.div
            className="flex flex-col items-center gap-1"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Station body */}
            <div
              className="rounded-xl px-6 py-2 font-mono text-xs font-bold tracking-widest"
              style={{
                background: '#0F172A',
                border: '1.5px solid #F472B660',
                color: '#F472B6',
                boxShadow: '0 0 30px #F472B630',
              }}
            >
              ★ ORBITAL STATION
            </div>
            {/* Docking arms */}
            <div className="flex items-center gap-1">
              <div className="h-1 w-10 rounded-full" style={{ background: '#F472B640' }} />
              <div className="h-3 w-3 rounded-full border" style={{ borderColor: '#F472B6', background: '#F472B618' }} />
              <div className="h-1 w-10 rounded-full" style={{ background: '#F472B640' }} />
            </div>
          </motion.div>
        </div>

        {/* ── Ground / launch pad ── */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center"
          style={{ height: 48 }}
        >
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(to right, transparent, #38BDF830, #38BDF860, #38BDF830, transparent)' }}
          />
          <div
            className="mt-1 font-mono text-[9px] tracking-[0.4em] uppercase"
            style={{ color: '#38BDF840' }}
          >
            PLATAFORMA DE LANZAMIENTO
          </div>
        </div>
      </motion.div>

      {/* ══ SPACESHIP (fixed in viewport) ══════════════════════════ */}
      <AnimatePresence>
        {state.phase !== 'intro' && state.phase !== 'victory' && state.phase !== 'gameover' && (
          <motion.div
            className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
            style={{ top: shipY }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Spaceship tilt={state.shipTilt} thruster={state.thrusterOn} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result flash overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {(state.phase === 'result_correct' || state.phase === 'result_wrong') && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              background: state.phase === 'result_correct'
                ? 'radial-gradient(circle at center, #16a34a60 0%, transparent 70%)'
                : 'radial-gradient(circle at center, #dc262660 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── HUD ─────────────────────────────────────────────────── */}
      {state.phase !== 'intro' && state.phase !== 'victory' && state.phase !== 'gameover' && (
        <HUD />
      )}

      {/* ─── Exercise overlay ─────────────────────────────────────── */}
      {state.phase === 'checkpoint' && <ExerciseOverlay />}

      {/* ══ INTRO SCREEN ════════════════════════════════════════════ */}
      <AnimatePresence>
        {state.phase === 'intro' && (
          <motion.div
            key="intro"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: '#030307' }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.8, ease: 'easeIn' }}
          >
            {/* Stars behind title */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {STARS.slice(0, 60).map((s, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{ left: `${s.x}%`, top: `${(i / 60) * 100}%`, width: s.size + 1, height: s.size + 1, opacity: s.op * 0.7 }}
                  animate={{ opacity: [s.op * 0.4, s.op, s.op * 0.4] }}
                  transition={{ duration: 2 + s.op * 2, repeat: Infinity, delay: i * 0.05 }}
                />
              ))}
            </div>

            {/* Glow orb */}
            <motion.div
              className="absolute rounded-full"
              style={{ width: 300, height: 300, background: 'radial-gradient(circle, #38BDF815 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Title */}
            <motion.div
              className="relative flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <span className="font-mono text-[10px] font-bold tracking-[0.4em] text-slate-500 uppercase">
                SpeakBranch · Mission
              </span>
              <h1
                className="text-center font-mono text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl"
                style={{ textShadow: '0 0 40px #38BDF850' }}
              >
                RUTA DE<br />
                <span style={{ color: '#38BDF8' }}>VICISITUDES</span><br />
                ESPACIAL
              </h1>
              <p className="max-w-xs text-center font-mono text-xs leading-relaxed text-slate-500">
                Responde correctamente para ascender.<br />
                El combustible es tu tiempo. Las estrellas, tu destino.
              </p>
            </motion.div>

            {/* Zones preview */}
            <motion.div
              className="relative mt-8 flex gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              {ZONES.map(z => (
                <div key={z.id} className="flex flex-col items-center gap-1.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: ZONE_ACCENT[z.id], boxShadow: `0 0 8px ${ZONE_ACCENT[z.id]}` }}
                  />
                  <span className="font-mono text-[9px] tracking-widest" style={{ color: ZONE_ACCENT[z.id] }}>
                    {z.id.toUpperCase()}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.button
              onClick={startGame}
              className="relative mt-10 overflow-hidden rounded-2xl px-10 py-3.5 font-mono text-sm font-bold tracking-widest uppercase"
              style={{
                background: '#38BDF8',
                color: '#030307',
                boxShadow: '0 0 30px #38BDF840',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 50px #38BDF860' }}
              whileTap={{ scale: 0.96 }}
            >
              <Rocket size={14} className="mr-2 inline-block" />
              Iniciar Mission
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ VICTORY SCREEN ══════════════════════════════════════════ */}
      <AnimatePresence>
        {state.phase === 'victory' && (
          <motion.div
            key="victory"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(3,3,7,0.92)', backdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="flex flex-col items-center gap-5"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            >
              <motion.div
                className="text-6xl"
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                🛸
              </motion.div>
              <span className="font-mono text-[10px] font-bold tracking-[0.4em] text-slate-500 uppercase">
                Mission completed
              </span>
              <h2
                className="font-mono text-4xl font-black text-white"
                style={{ textShadow: '0 0 40px #F472B670' }}
              >
                YOU ARRIVED!
              </h2>
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-sm text-slate-400">Final score</span>
                <span
                  className="font-mono text-5xl font-black"
                  style={{ color: '#34D399' }}
                >
                  {state.score.toLocaleString()}
                </span>
              </div>
              <button
                onClick={reset}
                className="mt-4 rounded-2xl px-8 py-3 font-mono text-sm font-bold tracking-widest uppercase"
                style={{ background: '#F472B6', color: '#030307', boxShadow: '0 0 30px #F472B640' }}
              >
                Jugar de nuevo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ GAME OVER SCREEN ════════════════════════════════════════ */}
      <AnimatePresence>
        {state.phase === 'gameover' && (
          <motion.div
            key="gameover"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(3,3,7,0.92)', backdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-5xl">💀</span>
              <h2 className="font-mono text-3xl font-black text-white">MISSION FAILED</h2>
              <p className="font-mono text-xs tracking-widest text-slate-500">
                Altitud alcanzada: {Math.round(state.altitude)}%
              </p>
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="font-mono text-xs text-slate-500">Puntos obtenidos</span>
                <span className="font-mono text-3xl font-black text-slate-300">
                  {state.score.toLocaleString()}
                </span>
              </div>
              <button
                onClick={reset}
                className="mt-4 rounded-2xl px-8 py-3 font-mono text-sm font-bold tracking-widest uppercase"
                style={{ background: '#F87171', color: '#030307', boxShadow: '0 0 30px #F8717140' }}
              >
                Retry
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Vignette ── */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)' }}
      />

      {/* ── Scanlines ── */}
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)',
      }} />

      {/* ── Zone accent border flash on change ── */}
      <motion.div
        key={currentZone}
        className="pointer-events-none absolute inset-0 z-20"
        style={{ border: `1px solid ${accentColor}`, borderRadius: 0 }}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.5 }}
      />
    </div>
  );
}

// ─── Page wrapper (provides context) ─────────────────────────────────────────
export default function VicisitudesPage() {
  return (
    <GameProvider>
      <GameScene />
    </GameProvider>
  );
}
