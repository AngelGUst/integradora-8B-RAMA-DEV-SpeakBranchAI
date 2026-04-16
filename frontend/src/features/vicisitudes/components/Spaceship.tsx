import { motion } from 'framer-motion';

interface Props {
  tilt:      number;   // degrees  (-ve = lean left ascending, +ve = lean right descending)
  thruster:  boolean;
}

export function Spaceship({ tilt, thruster }: Readonly<Props>) {
  return (
    <motion.div
      className="relative select-none"
      style={{ width: 72, height: 96 }}
      animate={{ rotate: tilt }}
      transition={{ type: 'spring', stiffness: 120, damping: 12 }}
    >
      <svg
        viewBox="0 0 72 96"
        width={72}
        height={96}
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* ── Engine glow behind hull ── */}
        {thruster && (
          <motion.ellipse
            cx={36} cy={88}
            rx={10} ry={14}
            fill="#38BDF8"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.6, 1, 0.6], ry: [10, 16, 10] }}
            transition={{ duration: 0.4, repeat: Infinity }}
            style={{ filter: 'blur(6px)' }}
          />
        )}

        {/* ── Hull body ── */}
        <path
          d="M36 4 C22 4 14 22 14 40 L14 72 Q14 80 22 80 L50 80 Q58 80 58 72 L58 40 C58 22 50 4 36 4 Z"
          fill="#1E293B"
          stroke="#38BDF8"
          strokeWidth={1.2}
        />

        {/* ── Cockpit bubble ── */}
        <ellipse cx={36} cy={34} rx={12} ry={15} fill="#0EA5E9" opacity={0.25} />
        <ellipse cx={36} cy={34} rx={10} ry={13} fill="#0EA5E9" opacity={0.15} />

        {/* ── Porthole glass highlight ── */}
        <ellipse cx={31} cy={28} rx={3} ry={4} fill="white" opacity={0.12} />

        {/* ── Left fin ── */}
        <path d="M14 60 L2 76 L14 72 Z" fill="#1E3A5F" stroke="#38BDF8" strokeWidth={0.8} />
        {/* ── Right fin ── */}
        <path d="M58 60 L70 76 L58 72 Z" fill="#1E3A5F" stroke="#38BDF8" strokeWidth={0.8} />

        {/* ── Nozzle ── */}
        <rect x={28} y={78} width={16} height={8} rx={3} fill="#0F172A" stroke="#38BDF8" strokeWidth={0.8} />

        {/* ══ MARCIANITO inside cockpit ══ */}
        {/* Body */}
        <ellipse cx={36} cy={40} rx={7} ry={8} fill="#34D399" />
        {/* Head */}
        <ellipse cx={36} cy={30} rx={6} ry={6} fill="#34D399" />
        {/* Eyes */}
        <ellipse cx={33.5} cy={28.5} rx={1.8} ry={2.2} fill="#fff" />
        <ellipse cx={38.5} cy={28.5} rx={1.8} ry={2.2} fill="#fff" />
        <ellipse cx={33.5} cy={29} rx={0.9} ry={1} fill="#0F172A" />
        <ellipse cx={38.5} cy={29} rx={0.9} ry={1} fill="#0F172A" />
        {/* Eye shine */}
        <circle cx={33.9} cy={28.5} r={0.4} fill="white" />
        <circle cx={38.9} cy={28.5} r={0.4} fill="white" />
        {/* Antennae */}
        <line x1={34} y1={24} x2={31} y2={19} stroke="#34D399" strokeWidth={1} />
        <circle cx={31} cy={18.5} r={1.5} fill="#6EE7B7" />
        <line x1={38} y1={24} x2={41} y2={19} stroke="#34D399" strokeWidth={1} />
        <circle cx={41} cy={18.5} r={1.5} fill="#6EE7B7" />
        {/* Smile */}
        <path d="M33.5 33 Q36 35.5 38.5 33" stroke="#0F172A" strokeWidth={0.8} fill="none" strokeLinecap="round" />
        {/* Arms */}
        <line x1={29} y1={40} x2={24} y2={44} stroke="#34D399" strokeWidth={1.2} strokeLinecap="round" />
        <line x1={43} y1={40} x2={48} y2={44} stroke="#34D399" strokeWidth={1.2} strokeLinecap="round" />

        {/* ── Thruster flame particles ── */}
        {thruster && (
          <>
            <motion.ellipse
              cx={36} cy={86}
              rx={5} ry={9}
              fill="#FCD34D"
              animate={{ ry: [7, 11, 7], opacity: [0.9, 0.5, 0.9] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
            <motion.ellipse
              cx={32} cy={88}
              rx={3} ry={6}
              fill="#F97316"
              animate={{ ry: [5, 8, 5], cx: [32, 33, 32] }}
              transition={{ duration: 0.25, repeat: Infinity }}
            />
            <motion.ellipse
              cx={40} cy={88}
              rx={3} ry={6}
              fill="#F97316"
              animate={{ ry: [5, 8, 5], cx: [40, 39, 40] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
          </>
        )}
      </svg>
    </motion.div>
  );
}
