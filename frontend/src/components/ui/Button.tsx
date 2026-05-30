/**
 * Button — CoachFit UI primitive
 *
 * Variants: primary | secondary | ghost | danger
 * Sizes:    sm | md | lg
 *
 * All colors reference CSS tokens — no hardcoded hex values.
 */
import * as React from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Render a lucide-react icon on the left */
  leftIcon?: React.ReactNode;
  /** Render a lucide-react icon on the right */
  rightIcon?: React.ReactNode;
  /** Stretch to full container width */
  fullWidth?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const base = [
  // layout
  "inline-flex items-center justify-center gap-2 select-none",
  // typography
  "font-sans font-medium leading-none whitespace-nowrap",
  // behaviour
  "cursor-pointer border transition-all",
  "active:scale-[0.98]",
  "disabled:opacity-50 disabled:pointer-events-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2",
].join(" ");

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--color-accent)] text-white border-transparent",
    "hover:brightness-110 hover:shadow-[var(--shadow-glow)]",
    "focus-visible:outline-[var(--color-accent)]",
  ].join(" "),

  secondary: [
    "bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]",
    "hover:bg-[var(--bg-elevated)] hover:border-[var(--border-default)]",
    "focus-visible:outline-[var(--color-accent)]",
  ].join(" "),

  ghost: [
    "bg-transparent text-[var(--text-secondary)] border-transparent",
    "hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
    "focus-visible:outline-[var(--color-accent)]",
  ].join(" "),

  danger: [
    "bg-[var(--color-danger)] text-white border-transparent",
    "hover:brightness-110",
    "focus-visible:outline-[var(--color-danger)]",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 py-2 rounded-[var(--radius-sm)] text-[length:var(--text-sm)]",
  md: "h-10 px-4 py-2 rounded-[var(--radius-sm)] text-[length:var(--text-base)]",
  lg: "h-12 px-6 py-3 rounded-[var(--radius-md)] text-[length:var(--text-lg)]",
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={clsx(
          base,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...rest}
      >
        {loading ? (
          <Loader2
            className="animate-spin"
            size={size === "sm" ? 14 : size === "lg" ? 18 : 16}
            aria-hidden="true"
          />
        ) : (
          leftIcon && (
            <span className="shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )
        )}

        {children && <span>{children}</span>}

        {!loading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
