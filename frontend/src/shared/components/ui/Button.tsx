import { forwardRef, type ButtonHTMLAttributes } from 'react';

// ── Types ────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button. Defaults to `primary`. */
  variant?: ButtonVariant;
  /** Height / padding preset. Defaults to `md`. */
  size?: ButtonSize;
  /** When true, renders an animated spinner and disables the button. */
  loading?: boolean;
  /** When true, stretches the button to its container's full width. */
  fullWidth?: boolean;
}

// ── Style maps ───────────────────────────────────────────────

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: [
    'bg-violet-600 text-white',
    'hover:bg-violet-500',
    'shadow-lg shadow-violet-600/25 hover:shadow-violet-500/35',
    'active:scale-[0.97]',
  ].join(' '),
  secondary: [
    'border border-white/[0.1] text-slate-300',
    'hover:border-violet-500/40 hover:text-white hover:bg-white/[0.05]',
    'active:scale-[0.97]',
  ].join(' '),
  ghost: [
    'text-slate-400',
    'hover:text-white hover:bg-white/[0.06]',
    'active:scale-[0.97]',
  ].join(' '),
  danger: [
    'bg-red-500 text-white',
    'hover:bg-red-400',
    'shadow-lg shadow-red-500/20',
    'active:scale-[0.97]',
  ].join(' '),
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 px-5 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
};

// ── Component ────────────────────────────────────────────────

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      disabled,
      className = '',
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
        className={[
          'inline-flex items-center justify-center gap-2',
          'font-semibold cursor-pointer',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06060A]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export type { ButtonVariant, ButtonSize, ButtonProps };
export default Button;
