import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, type Variants } from 'framer-motion';
import {
  Mic, BookOpen, Headphones, PenLine,
  ArrowRight, ArrowUpRight, ChevronRight,
} from 'lucide-react';

// ── Shared constants ──────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, ease: EASE, delay: i * 0.07 },
  }),
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-72px' });
  return { ref, inView };
}

// ── Marquee ───────────────────────────────────────────────────

const MARQUEE_WORDS = [
  'speaking', 'fluency', 'listening', 'reading', 'writing',
  'grammar', 'vocabulary', 'confidence', 'mastery', 'comprehension',
];

function MarqueeStrip() {
  const items = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.05] py-3.5 select-none">
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((w, i) => (
          <span key={i} className="flex items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/20">
            {w}
            <span className="text-violet-600/50">×</span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#06060A]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#06060A]" />
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.05] bg-[#06060A]/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-8 h-14 flex items-center justify-between">

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Skills', href: '#skills' },
            { label: 'Levels', href: '#levels' },
            { label: 'How it works', href: '#process' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[13px] text-white/40 hover:text-white/80 transition-colors duration-200 tracking-wide"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-[13px] text-white/40 hover:text-white/80 transition-colors tracking-wide"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-8 max-w-7xl mx-auto">
      {/* Subtle dot grid, no orbs */}
      <div className="pointer-events-none absolute inset-0 bg-dot opacity-30" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-16 items-end">
        {/* Left — Display type */}
        <div>
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mb-8 flex items-center gap-3"
          >
            <span className="h-px w-8 bg-violet-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">
              AI English Platform
            </span>
          </motion.div>

          {/* Headline — staggered lines */}
          <div className="space-y-0">
            {[
              { text: 'ENGLISH.', color: 'text-white' },
              { text: 'WITHOUT', color: 'text-white/30' },
              { text: 'LIMITS.', color: 'gradient-text' },
            ].map(({ text, color }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.1 }}
              >
                <h1
                  className={`text-[clamp(4rem,11vw,9.5rem)] font-black tracking-[-0.04em] leading-[0.88] ${color}`}
                >
                  {text}
                </h1>
              </motion.div>
            ))}
          </div>

          {/* Thin rule */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
            style={{ transformOrigin: 'left' }}
            className="mt-10 h-px bg-white/[0.08]"
          />
        </div>

        {/* Right — copy + CTA column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.45 }}
          className="lg:pb-3 flex flex-col gap-8"
        >
          {/* Section index */}
          <span className="text-[11px] font-mono text-white/20 tracking-widest">001</span>

          <p className="text-[15px] text-white/50 leading-relaxed">
            Take a free placement test, get your exact CEFR level, and train
            the four core English skills — built around your specific gaps by AI.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              to="/register"
              className="group inline-flex items-center justify-between rounded-xl border border-white/[0.1] px-5 py-3.5 text-[13px] font-semibold text-white hover:border-violet-500/40 hover:bg-violet-500/[0.06] transition-all duration-200"
            >
              <span>Create free account</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="text-center text-[13px] text-white/30 hover:text-white/60 transition-colors"
            >
              Already have an account →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Stats band ────────────────────────────────────────────────

const STATS = [
  { n: '4',    label: 'Core skills' },
  { n: '6',    label: 'CEFR levels' },
  { n: '∞',    label: 'AI exercises' },
  { n: '100%', label: 'Adaptive path' },
];

function StatsBand() {
  const { ref, inView } = useReveal();
  return (
    <section className="border-y border-white/[0.05]">
      <div ref={ref} className="mx-auto max-w-7xl px-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.05]">
        {STATS.map(({ n, label }, i) => (
          <motion.div
            key={label}
            custom={i}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={reveal}
            className="py-10 px-8 flex flex-col gap-1.5"
          >
            <span className="text-[clamp(2.25rem,4vw,3.5rem)] font-black tracking-[-0.03em] text-white leading-none">
              {n}
            </span>
            <span className="text-[12px] text-white/30 uppercase tracking-[0.15em] font-medium">
              {label}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Skills list ───────────────────────────────────────────────

const SKILLS = [
  {
    icon: Mic,
    index: '01',
    label: 'Speaking',
    heading: 'Practice speaking without judgment.',
    body: 'AI analyzes pronunciation, fluency, and clarity in real time. Get instant feedback and track improvement across sessions.',
    stat: '4.8× faster fluency',
  },
  {
    icon: Headphones,
    index: '02',
    label: 'Listening',
    heading: 'Train your ear for real-world English.',
    body: 'Native accents, natural speeds, real contexts — not textbook audio. Comprehension exercises that evolve as you do.',
    stat: '93% accuracy gain',
  },
  {
    icon: BookOpen,
    index: '03',
    label: 'Reading',
    heading: 'Read texts at exactly your level.',
    body: 'Passages chosen to challenge without frustrating. Vocabulary in context, grammar revealed naturally mid-text.',
    stat: '2× reading speed',
  },
  {
    icon: PenLine,
    index: '04',
    label: 'Writing',
    heading: 'Write clearly. Write confidently.',
    body: 'Sentences to paragraphs. AI corrects grammar, coherence, and tone — with explanations, not just red marks.',
    stat: '85% fewer errors',
  },
];

function SkillRow({
  skill,
  i,
}: {
  skill: typeof SKILLS[number];
  i: number;
}) {
  const { ref, inView } = useReveal();
  const Icon = skill.icon;

  return (
    <motion.div
      ref={ref}
      custom={i}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={reveal}
      className="group grid grid-cols-[auto_1fr_auto] items-start gap-8 border-b border-white/[0.05] py-8 hover:bg-white/[0.015] transition-colors duration-200 px-8 -mx-8"
    >
      {/* Left: index + icon */}
      <div className="flex items-center gap-4 pt-0.5">
        <span className="text-[11px] font-mono text-white/20 w-6">{skill.index}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.07] group-hover:border-violet-500/30 group-hover:bg-violet-500/[0.07] transition-all duration-200">
          <Icon className="h-4 w-4 text-white/40 group-hover:text-violet-400 transition-colors duration-200" />
        </div>
      </div>

      {/* Center: text */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-400/60">
            {skill.label}
          </span>
        </div>
        <h3 className="text-[17px] font-semibold text-white/90 leading-snug">{skill.heading}</h3>
        <p className="text-[14px] text-white/35 leading-relaxed max-w-lg">{skill.body}</p>
      </div>

      {/* Right: stat + arrow */}
      <div className="flex flex-col items-end gap-3 pt-0.5">
        <span className="text-[12px] font-semibold text-white/20 group-hover:text-violet-300/60 transition-colors duration-200 whitespace-nowrap">
          {skill.stat}
        </span>
        <ArrowUpRight className="h-4 w-4 text-white/10 group-hover:text-violet-400/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </motion.div>
  );
}

function SkillsSection() {
  return (
    <section id="skills" className="py-24 px-8 max-w-7xl mx-auto">
      {/* Section header */}
      <div className="mb-1 flex items-end justify-between border-b border-white/[0.05] pb-6">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-white/20 tracking-widest">002</span>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Four skills
          </h2>
        </div>
        <p className="text-[13px] text-white/25 hidden md:block">Adaptive AI · All levels</p>
      </div>

      {/* Display heading */}
      <div className="py-10 mb-4">
        <p className="text-[clamp(1.8rem,4vw,3.2rem)] font-black tracking-[-0.03em] text-white leading-tight max-w-2xl">
          One platform covers everything a language learner needs.
        </p>
      </div>

      {/* Skill rows */}
      <div>
        {SKILLS.map((skill, i) => (
          <SkillRow key={skill.index} skill={skill} i={i} />
        ))}
      </div>
    </section>
  );
}

// ── CEFR path ─────────────────────────────────────────────────

const LEVELS = [
  { label: 'A1', name: 'Beginner',      desc: 'First words, simple phrases.' },
  { label: 'A2', name: 'Elementary',    desc: 'Everyday situations.' },
  { label: 'B1', name: 'Intermediate',  desc: 'Travel & experience.' },
  { label: 'B2', name: 'Upper-Int.',    desc: 'Complex texts, fluency.' },
  { label: 'C1', name: 'Advanced',      desc: 'Professional precision.' },
  { label: 'C2', name: 'Mastery',       desc: 'Near-native command.' },
];

function LevelsSection() {
  const { ref, inView } = useReveal();

  return (
    <section id="levels" className="border-t border-white/[0.05] py-24 px-8 max-w-7xl mx-auto">
      <div className="mb-1 flex items-end justify-between border-b border-white/[0.05] pb-6">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-white/20 tracking-widest">003</span>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/40">
            CEFR levels
          </h2>
        </div>
        <p className="text-[13px] text-white/25 hidden md:block">We detect yours in 15 min</p>
      </div>

      <div className="py-10">
        <p className="text-[clamp(1.8rem,4vw,3.2rem)] font-black tracking-[-0.03em] text-white leading-tight max-w-2xl mb-14">
          Every level from first words to native command.
        </p>

        {/* Timeline */}
        <div ref={ref} className="relative">
          {/* Connecting line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
            style={{ transformOrigin: 'left' }}
            className="absolute top-4 left-4 right-4 h-px bg-white/[0.08]"
          />

          <div className="grid grid-cols-3 md:grid-cols-6 gap-0">
            {LEVELS.map(({ label, name, desc }, i) => (
              <motion.div
                key={label}
                custom={i}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                variants={reveal}
                className="group relative pt-10 pr-6"
              >
                {/* Node dot */}
                <div className={`absolute top-[10px] left-3.5 h-2 w-2 rounded-full border transition-all duration-300 ${
                  i === 0
                    ? 'bg-violet-500 border-violet-500'
                    : 'bg-[#06060A] border-white/20 group-hover:border-violet-500/50'
                }`} />

                <div className="space-y-1.5">
                  <span className={`text-[11px] font-mono font-bold ${i === 0 ? 'text-violet-400' : 'text-white/30'}`}>
                    {label}
                  </span>
                  <p className="text-[13px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">{name}</p>
                  <p className="text-[12px] text-white/25 leading-snug">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Process ───────────────────────────────────────────────────

const STEPS = [
  { n: '01', title: 'Take the test', body: '15 minutes. Adaptive questions across all four skills. No prior knowledge required.' },
  { n: '02', title: 'Get your path', body: 'AI maps your gaps and builds a personalized learning sequence. No fluff, no filler.' },
  { n: '03', title: 'Practice daily', body: 'Short sessions that compound. Every exercise generated fresh, every repetition intentional.' },
];

function ProcessSection() {
  const { ref, inView } = useReveal();

  return (
    <section id="process" className="border-t border-white/[0.05] py-24 px-8 max-w-7xl mx-auto">
      <div className="mb-1 flex items-end justify-between border-b border-white/[0.05] pb-6">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-white/20 tracking-widest">004</span>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/40">
            How it works
          </h2>
        </div>
      </div>

      <div className="py-10">
        <p className="text-[clamp(1.8rem,4vw,3.2rem)] font-black tracking-[-0.03em] text-white leading-tight max-w-2xl mb-16">
          From placement to fluency — three steps.
        </p>

        <div ref={ref} className="grid md:grid-cols-3 gap-0 border border-white/[0.05] rounded-2xl overflow-hidden">
          {STEPS.map(({ n, title, body }, i) => (
            <motion.div
              key={n}
              custom={i}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={reveal}
              className={`group p-8 space-y-4 ${i < STEPS.length - 1 ? 'border-b md:border-b-0 md:border-r border-white/[0.05]' : ''} hover:bg-white/[0.02] transition-colors duration-200`}
            >
              <span className="text-[11px] font-mono text-white/20">{n}</span>
              <h3 className="text-[17px] font-bold text-white/85">{title}</h3>
              <p className="text-[14px] text-white/35 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────

function CtaSection() {
  const { ref, inView } = useReveal();

  return (
    <section className="border-t border-white/[0.05]">
      <div ref={ref} className="mx-auto max-w-7xl px-8 py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] items-end gap-12">
          {/* Left: Big text */}
          <div className="space-y-6">
            <motion.div
              custom={0}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={reveal}
              className="flex items-center gap-3"
            >
              <span className="h-px w-8 bg-violet-500" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">
                Start free today
              </span>
            </motion.div>
            <motion.h2
              custom={1}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={reveal}
              className="text-[clamp(2.5rem,7vw,7rem)] font-black tracking-[-0.04em] leading-[0.9] text-white"
            >
              Your first lesson<br />
              <span className="gradient-text">is waiting.</span>
            </motion.h2>
            <motion.p
              custom={2}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={reveal}
              className="text-[14px] text-white/30 max-w-sm"
            >
              Free account. No credit card. No commitment.
              Just better English, starting now.
            </motion.p>
          </div>

          {/* Right: CTA */}
          <motion.div
            custom={3}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={reveal}
            className="flex flex-col items-start lg:items-end gap-4 lg:pb-4"
          >
            <Link
              to="/register"
              className="group inline-flex items-center gap-3 rounded-2xl bg-violet-600 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-all hover:shadow-violet-500/30 hover:scale-[1.01] active:scale-[0.99]"
            >
              Create free account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-[12px] text-white/20">
              Free · No card · Cancel any time
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/[0.05]">
      <div className="mx-auto max-w-7xl px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[12px] text-white/15 font-mono">
          © {new Date().getFullYear()} SpeakBranch AI
        </p>
        <div className="flex gap-6">
          {['Privacy', 'Terms', 'Contact'].map((item) => (
            <a
              key={item}
              href="#"
              className="text-[12px] text-white/15 hover:text-white/40 transition-colors tracking-wide"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative bg-[#06060A] text-[#f5f3ff] min-h-screen">
      <Navbar />
      <main className="pt-14">
        <Hero />
        <MarqueeStrip />
        <StatsBand />
        <SkillsSection />
        <LevelsSection />
        <ProcessSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

// Silence unused import warnings
void ChevronRight;