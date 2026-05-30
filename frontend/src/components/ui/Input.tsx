/**
 * Input — CoachFit UI primitive
 *
 * Sizes: sm | md | lg
 * States: default | focus (accent border + glow) | error | disabled
 *
 * Includes:
 *  - <Input>        core input element
 *  - <InputGroup>   wraps label + input + helper/error text
 *
 * All colors reference CSS tokens — no hardcoded hex values.
 */
import * as React from "react";
import { clsx } from "clsx";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
  /** Show error styling */
  error?: boolean;
  /** Left adornment (icon, prefix text) */
  leftAdornment?: React.ReactNode;
  /** Right adornment (icon, suffix, button) */
  rightAdornment?: React.ReactNode;
}

export interface InputGroupProps {
  /** <label> text — renders above input */
  label?: string;
  /** Associates label with input — must match input id */
  htmlFor?: string;
  /** Helper text rendered below input */
  helperText?: string;
  /** Error message — takes priority over helperText */
  errorText?: string;
  /** Required asterisk beside label */
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Size map                                                            */
/* ------------------------------------------------------------------ */

const sizeMap: Record<InputSize, { height: string; text: string; px: string }> = {
  sm: {
    height: "h-9", // 36px
    text: "text-[length:var(--text-sm)]",
    px: "px-[var(--space-3)]",
  },
  md: {
    height: "h-10", // 40px
    text: "text-[length:var(--text-base)]",
    px: "px-[var(--space-3)]",
  },
  lg: {
    height: "h-12", // 48px
    text: "text-[length:var(--text-base)]",
    px: "px-[var(--space-4)]",
  },
};

/* ------------------------------------------------------------------ */
/*  Input                                                               */
/* ------------------------------------------------------------------ */

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      inputSize = "md",
      error = false,
      leftAdornment,
      rightAdornment,
      className,
      disabled,
      ...rest
    },
    ref
  ) {
    const sz = sizeMap[inputSize];

    const hasLeft = Boolean(leftAdornment);
    const hasRight = Boolean(rightAdornment);

    return (
      <div className="relative flex items-center w-full">
        {/* Left adornment */}
        {hasLeft && (
          <span
            className="absolute left-0 flex items-center pl-[var(--space-3)] text-[var(--text-muted)] pointer-events-none"
            aria-hidden="true"
          >
            {leftAdornment}
          </span>
        )}

        <input
          ref={ref}
          disabled={disabled}
          className={clsx(
            // Base layout
            "w-full font-sans appearance-none",
            sz.height,
            sz.text,
            sz.px,
            "rounded-[var(--radius-sm)]",

            // Colors (token-based)
            "bg-[var(--bg-input)]",
            "text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]",

            // Border
            error
              ? "border border-[var(--color-danger)]"
              : "border border-[var(--border-default)]",

            // Focus ring (custom — overrides global :focus-visible to add glow)
            "outline-none",
            error
              ? "focus:border-[var(--color-danger)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
              : "focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.2)]",

            // Transition
            "transition-all duration-[var(--duration-micro)] ease-out",

            // Disabled
            "disabled:opacity-50 disabled:cursor-not-allowed",

            // Adornment insets
            hasLeft && "pl-9",
            hasRight && "pr-9",

            className
          )}
          {...rest}
        />

        {/* Right adornment */}
        {hasRight && (
          <span
            className="absolute right-0 flex items-center pr-[var(--space-3)] text-[var(--text-muted)]"
            aria-hidden="true"
          >
            {rightAdornment}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

/* ------------------------------------------------------------------ */
/*  InputGroup                                                          */
/* ------------------------------------------------------------------ */

export function InputGroup({
  label,
  htmlFor,
  helperText,
  errorText,
  required,
  children,
  className,
}: InputGroupProps) {
  const hasError = Boolean(errorText);

  return (
    <div className={clsx("flex flex-col gap-[var(--space-1)]", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[length:var(--text-sm)] font-medium text-[var(--text-secondary)] select-none"
        >
          {label}
          {required && (
            <span
              className="ml-0.5 text-[var(--color-danger)]"
              aria-hidden="true"
            >
              {" "}
              *
            </span>
          )}
        </label>
      )}

      {children}

      {(hasError || helperText) && (
        <p
          className={clsx(
            "text-[length:var(--text-xs)] leading-snug",
            hasError
              ? "text-[var(--color-danger)]"
              : "text-[var(--text-muted)]"
          )}
          role={hasError ? "alert" : undefined}
          aria-live={hasError ? "polite" : undefined}
        >
          {hasError ? errorText : helperText}
        </p>
      )}
    </div>
  );
}
