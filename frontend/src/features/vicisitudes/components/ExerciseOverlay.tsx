import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Headphones, AlignLeft, Languages } from 'lucide-react';
import type { Skill } from '../types/game.types';
import { useGame } from '../store/GameContext';

const SKILL_META: Record<Skill, { label: string; Icon: typeof BookOpen; color: string }> = {
  grammar:    { label: 'Grammar',   Icon: AlignLeft,  color: '#818CF8' },
  vocabulary: { label: 'Vocabulary', Icon: Languages,  color: '#34D399' },
  reading:    { label: 'Lectura',     Icon: BookOpen,   color: '#38BDF8' },
  listening:  { label: 'Escucha',     Icon: Headphones, color: '#FB923C' },
};

export function ExerciseOverlay() {
  const { state, submitAnswer } = useGame();
  const [selected, setSelected]   = useState<string | null>(null);
  const [revealed, setRevealed]   = useState(false);

  const cp = state.activeCheckpoint;
  if (!cp) return null;

  const { exercise } = cp;
  const meta = SKILL_META[exercise.skill];
  const { Icon, color } = meta;

  function handleSelect(id: string) {
    if (revealed) return;
    setSelected(id);
  }

  function handleConfirm() {
    if (!selected || revealed) return;
    const opt = exercise.options.find(o => o.id === selected);
    if (!opt) return;
    setRevealed(true);
    setTimeout(() => {
      submitAnswer(opt.correct);
      setSelected(null);
      setRevealed(false);
    }, 900);
  }

  return (
    <AnimatePresence>
      <motion.div
        key="overlay-backdrop"
        className="absolute inset-0 z-40 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          key="overlay-card"
          className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl"
          initial={{ y: 40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{
            background: '#0D1117',
            border: `1.5px solid ${color}30`,
            boxShadow: `0 0 40px ${color}18`,
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center gap-2.5 px-5 py-3"
            style={{ borderBottom: `1px solid ${color}20` }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: `${color}18`, color }}
            >
              <Icon size={14} />
            </span>
            <span className="font-mono text-xs font-bold tracking-[0.15em] uppercase" style={{ color }}>
              {meta.label}
            </span>
            <span className="ml-auto font-mono text-[10px] text-slate-600">
              CP {cp.id} / 9
            </span>
          </div>

          {/* ── Prompt ── */}
          <div className="px-5 pb-3 pt-4">
            <p className="text-sm font-medium leading-relaxed text-slate-200">
              {exercise.prompt}
            </p>
          </div>

          {/* ── Options ── */}
          <div className="flex flex-col gap-2 px-5 pb-5">
            {exercise.options.map(opt => {
              const isSelected = selected === opt.id;
              const isCorrect  = opt.correct;
              let bg      = 'rgba(255,255,255,0.04)';
              let border  = 'rgba(255,255,255,0.08)';
              let textCol = '#CBD5E1';

              if (revealed) {
                if (isCorrect) { bg = '#052e16'; border = '#16a34a'; textCol = '#86efac'; }
                else if (isSelected && !isCorrect) { bg = '#2d0a0a'; border = '#dc2626'; textCol = '#fca5a5'; }
              } else if (isSelected) {
                bg = `${color}14`; border = color; textCol = '#F1F5F9';
              }

              return (
                <motion.button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  whileHover={!revealed ? { scale: 1.015 } : {}}
                  whileTap={!revealed ? { scale: 0.985 } : {}}
                  className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors"
                  style={{ background: bg, border: `1.5px solid ${border}`, color: textCol }}
                >
                  <span className="font-mono mr-2.5 text-[10px] uppercase tracking-widest opacity-50">{opt.id}.</span>
                  {opt.text}
                </motion.button>
              );
            })}
          </div>

          {/* ── Confirm button ── */}
          <div className="px-5 pb-5">
            <motion.button
              onClick={handleConfirm}
              disabled={!selected || revealed}
              whileHover={selected && !revealed ? { scale: 1.02 } : {}}
              whileTap={selected && !revealed ? { scale: 0.97 } : {}}
              className="w-full rounded-xl py-3 font-mono text-sm font-bold tracking-widest uppercase transition-all"
              style={{
                background: selected && !revealed ? color : 'rgba(255,255,255,0.05)',
                color:      selected && !revealed ? '#0F172A' : '#475569',
                cursor:     selected && !revealed ? 'pointer' : 'default',
              }}
            >
              Confirmar
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
