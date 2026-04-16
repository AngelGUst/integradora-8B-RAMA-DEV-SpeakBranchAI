import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Rendered as a <label> above the field. */
  label?: string;
  /** Marks the field as required with a visual indicator. */
  required?: boolean;
  /** Validation error message rendered below the field in red. */
  error?: string;
  /** Subtle hint rendered below the field when there is no error. */
  hint?: string;
  /** Icon placed on the left side of the input. */
  leadingIcon?: ReactNode;
  /** Icon or action placed on the right side of the input. */
  trailingIcon?: ReactNode;
}

// ── Component ────────────────────────────────────────────────

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      required,
      error,
      hint,
      leadingIcon,
      trailingIcon,
      id,
      className = '',
      ...rest
    },
    ref,
  ) => {
    // Derive a stable id from the label when none is provided
    const inputId = id ?? label?.toLowerCase().replaceAll(/\s+/g, '-');
    const hintDescribedBy = hint ? `${inputId}-hint` : undefined;
    const describedById = error ? `${inputId}-error` : hintDescribedBy;

    const baseInput = [
      'w-full h-[52px] rounded-xl text-sm text-slate-100',
      'bg-white/[0.03] border transition-all duration-200',
      'placeholder:text-slate-600',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      leadingIcon ? 'pl-11' : 'pl-4',
      trailingIcon ? 'pr-11' : 'pr-4',
      error
        ? 'border-red-500/40 focus:border-red-500/70 focus:ring-red-500/10'
        : 'border-white/[0.07] focus:border-violet-500/50 focus:ring-violet-500/10',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-400 select-none"
          >
            {label}
            {required && (
              <span className="ml-1 text-violet-400" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {leadingIcon && (
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            >
              {leadingIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={describedById}
            className={baseInput}
            {...rest}
          />

          {trailingIcon && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              {trailingIcon}
            </span>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-red-400"
          >
            <svg
              className="h-3.5 w-3.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export type { InputProps };
export default Input;
