interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  /** 'color' uses violet accent, 'white' renders all-white for dark overlays */
  variant?: 'color' | 'white';
}

const CONFIG = {
  xs: { icon: 22, text: 'text-xs'  },
  sm: { icon: 28, text: 'text-sm'  },
  md: { icon: 34, text: 'text-base'},
  lg: { icon: 42, text: 'text-xl'  },
  xl: { icon: 54, text: 'text-3xl' },
} as const;

/**
 * SpeakBranch AI brand mark.
 * Icon: speech waveform lines + violet accent dot.
 */
export default function Logo({
  size = 'md',
  showText = true,
  variant = 'color',
}: LogoProps) {
  const { icon: s, text: textClass } = CONFIG[size];
  const accent       = variant === 'color' ? '#7C3AED' : '#ffffff';
  const accentBright = variant === 'color' ? '#A78BFA' : '#ffffff';
  const bgFill       = variant === 'color' ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.12)';
  const bgStroke     = variant === 'color' ? 'rgba(124,58,237,0.35)'  : 'rgba(255,255,255,0.3)';
  const wordColor    = variant === 'color' ? '#f5f3ff' : '#ffffff';

  return (
    <div className="inline-flex select-none items-center gap-2.5" role="img" aria-label="SpeakBranch AI">
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="9" fill={bgFill} />
        <rect width="36" height="36" rx="9" stroke={bgStroke} strokeWidth="1" />
        <line x1="8"  y1="12" x2="28" y2="12" stroke={accentBright} strokeWidth="2.4" strokeLinecap="round" />
        <line x1="8"  y1="18" x2="22" y2="18" stroke={accent}       strokeWidth="2.4" strokeLinecap="round" />
        <line x1="8"  y1="24" x2="25" y2="24" stroke={accentBright} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="28" cy="24" r="3" fill={accent} />
      </svg>
      {showText && (
        <span className={`font-bold leading-none tracking-tight ${textClass}`}>
          <span style={{ color: wordColor }}>Speak</span>
          <span style={{ color: accentBright }}>Branch</span>
        </span>
      )}
    </div>
  );
}
