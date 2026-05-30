/**
 * Card — CoachFit UI primitive
 *
 * Variants: default | interactive | highlighted
 * - highlighted accepts a `accentColor` CSS var string for the left-border sport/zone color
 *
 * All colors reference CSS tokens — no hardcoded hex values.
 */
import * as React from "react";
import { clsx } from "clsx";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type CardVariant = "default" | "interactive" | "highlighted";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /**
   * CSS var string used as the highlighted left-border color.
   * e.g. "var(--sport-cycling)" or "var(--zone-4)"
   * Only applied when variant="highlighted"
   */
  accentColor?: string;
  /** Remove internal padding (useful when composing with CardHeader/CardBody) */
  noPadding?: boolean;
  /** Forward ref */
  as?: React.ElementType;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Right-side slot (actions, badges) */
  action?: React.ReactNode;
}

export function CardHeader({ children, action, className, ...rest }: CardHeaderProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between",
        "pb-[var(--space-3)] border-b border-[var(--border-subtle)]",
        "mb-[var(--space-3)]",
        className
      )}
      {...rest}
    >
      <div className="text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">
        {children}
      </div>
      {action && <div className="shrink-0 ml-[var(--space-3)]">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("flex flex-col gap-[var(--space-3)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between",
        "pt-[var(--space-3)] border-t border-[var(--border-subtle)]",
        "mt-[var(--space-3)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card                                                                */
/* ------------------------------------------------------------------ */

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "default",
    accentColor,
    noPadding = false,
    as: Component = "div",
    className,
    style,
    children,
    ...rest
  },
  ref
) {
  const highlightColor = accentColor ?? "var(--color-accent)";

  const base =
    "relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden";

  const variantClass = {
    default: "",
    interactive: [
      "cursor-pointer",
      "transition-all duration-[var(--duration-micro)] ease-out",
      "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-default)]",
    ].join(" "),
    highlighted: "border-l-[3px]",
  }[variant];

  const paddingClass = noPadding
    ? ""
    : "p-[var(--space-4)] max-sm:p-[var(--space-3)]";

  const inlineStyle: React.CSSProperties =
    variant === "highlighted"
      ? { borderLeftColor: highlightColor, ...style }
      : { ...style };

  return (
    <Component
      ref={ref}
      className={clsx(base, variantClass, paddingClass, className)}
      style={inlineStyle}
      {...rest}
    >
      {children}
    </Component>
  );
});

Card.displayName = "Card";
