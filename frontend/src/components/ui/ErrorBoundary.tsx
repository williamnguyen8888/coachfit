// src/components/ui/ErrorBoundary.tsx
// React class error boundary — catches unexpected render-time errors.
// Wrap around page-level content (not the entire app; let auth errors fall
// through to the AuthGuard instead).

"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback. If omitted, renders the default error card. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO (Phase 2): send to error tracking (Sentry)
    console.error("[ErrorBoundary] Caught render error:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return <ErrorCard error={this.state.error} onRetry={this.handleRetry} />;
  }
}

// ─── Default error card ───────────────────────────────────────────────────────

function ErrorCard({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="error-boundary-card" role="alert">
      <div className="error-boundary-card__icon">⚠️</div>
      <h2 className="error-boundary-card__title">Something went wrong</h2>
      <p className="error-boundary-card__message">
        {error?.message ?? "An unexpected error occurred. Please try again."}
      </p>
      <button
        className="error-boundary-card__retry"
        onClick={onRetry}
        type="button"
      >
        Try again
      </button>

      <style>{`
        .error-boundary-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          padding: 40px 24px;
          text-align: center;
          gap: 12px;
        }

        .error-boundary-card__icon {
          font-size: 48px;
          margin-bottom: 8px;
        }

        .error-boundary-card__title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .error-boundary-card__message {
          font-size: var(--text-sm);
          color: var(--text-muted);
          max-width: 400px;
          margin: 0;
          line-height: 1.6;
        }

        .error-boundary-card__retry {
          margin-top: 8px;
          padding: 8px 20px;
          background: var(--brand-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .error-boundary-card__retry:hover {
          opacity: 0.85;
        }
      `}</style>
    </div>
  );
}
