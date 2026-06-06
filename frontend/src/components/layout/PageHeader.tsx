/**
 * PageHeader — shared page header component.
 *
 * Production-grade: clear hierarchy, action slot, optional meta text.
 * Mobile-first: stacks on small screens, side-by-side on sm+.
 */
import * as React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Optional meta info displayed after subtitle (e.g., result count) */
  meta?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action, meta }: PageHeaderProps) {
  return (
    <header
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 lg:px-6 pt-5 pb-4"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Title block */}
      <div className="min-w-0 flex-1">
        <h1
          className="font-bold tracking-tight truncate"
          style={{
            fontSize: "var(--text-2xl)",
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {(subtitle || meta) && (
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {subtitle && (
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </p>
            )}
            {meta && (
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {meta}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action slot */}
      {action && (
        <div className="shrink-0 self-start">
          {action}
        </div>
      )}
    </header>
  );
}
