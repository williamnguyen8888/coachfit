/**
 * Skeleton — CoachFit UI primitive
 *
 * Loading placeholder using a shimmer animation.
 * Respects prefers-reduced-motion (global rule in globals.css).
 *
 * Shapes: rectangle (default) | circle | text
 *
 * All colors reference CSS tokens — no hardcoded hex values.
 */
import * as React from "react";
import { clsx } from "clsx";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type SkeletonShape = "rectangle" | "circle" | "text";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape;
  /** Width — any valid CSS value. Defaults to "100%" */
  width?: string | number;
  /** Height — any valid CSS value. Defaults to shape-specific value */
  height?: string | number;
  /**
   * For shape="text" — number of lines to render.
   * Ignores width/height in favour of a stack of text-sized bars.
   */
  lines?: number;
  /** Remove the shimmer animation (render static placeholder) */
  animated?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Inline styles                                                       */
/* ------------------------------------------------------------------ */

const shimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--bg-elevated) 25%, var(--border-default) 50%, var(--bg-elevated) 75%)",
  backgroundSize: "800px 100%",
  animation: "skeleton-shimmer 1.6s ease-in-out infinite",
};

const staticStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
};

/* ------------------------------------------------------------------ */
/*  Single bar                                                          */
/* ------------------------------------------------------------------ */

function SkeletonBar({
  width,
  height,
  circle,
  animated,
  className,
  style,
  ...rest
}: {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={clsx(circle ? "rounded-full" : "rounded-[var(--radius-sm)]", className)}
      style={{
        width,
        height,
        flexShrink: 0,
        ...(animated !== false ? shimmerStyle : staticStyle),
        ...style,
      }}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

export function Skeleton({
  shape = "rectangle",
  width = "100%",
  height,
  lines = 3,
  animated = true,
  className,
  style,
  ...rest
}: SkeletonProps) {
  /* ---- Text shape — stack of variable-width bars ---- */
  if (shape === "text") {
    return (
      <div
        aria-label="Loading…"
        aria-busy="true"
        className={clsx("flex flex-col gap-[var(--space-2)]", className)}
        style={style}
        {...rest}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBar
            key={i}
            animated={animated}
            // Last line is shorter to look more natural
            width={i === lines - 1 ? "65%" : "100%"}
            height="14px"
          />
        ))}
      </div>
    );
  }

  /* ---- Circle shape ---- */
  if (shape === "circle") {
    const size = height ?? width ?? "40px";
    return (
      <SkeletonBar
        circle
        animated={animated}
        width={size}
        height={size}
        aria-label="Loading…"
        aria-busy="true"
        className={className}
        style={style}
        {...rest}
      />
    );
  }

  /* ---- Rectangle shape (default) ---- */
  return (
    <SkeletonBar
      animated={animated}
      width={width}
      height={height ?? "20px"}
      aria-label="Loading…"
      aria-busy="true"
      className={className}
      style={style}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonCard — convenience preset for a full card placeholder       */
/* ------------------------------------------------------------------ */

export interface SkeletonCardProps {
  /** Show a circular avatar/icon area at the top */
  hasAvatar?: boolean;
  /** Number of text lines in the body */
  lines?: number;
  animated?: boolean;
  className?: string;
}

export function SkeletonCard({
  hasAvatar = false,
  lines = 3,
  animated = true,
  className,
}: SkeletonCardProps) {
  return (
    <div
      aria-label="Loading card…"
      aria-busy="true"
      className={clsx(
        "bg-[var(--bg-surface)] border border-[var(--border-subtle)]",
        "rounded-[var(--radius-md)] p-[var(--space-4)]",
        "flex flex-col gap-[var(--space-3)]",
        className
      )}
    >
      {hasAvatar && (
        <div className="flex items-center gap-[var(--space-3)]">
          <Skeleton shape="circle" width="40px" animated={animated} />
          <div className="flex-1 flex flex-col gap-[var(--space-1)]">
            <Skeleton width="50%" height="14px" animated={animated} />
            <Skeleton width="35%" height="11px" animated={animated} />
          </div>
        </div>
      )}
      <Skeleton shape="text" lines={lines} animated={animated} />
    </div>
  );
}
