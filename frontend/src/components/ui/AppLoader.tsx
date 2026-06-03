// src/components/ui/AppLoader.tsx
// Full-screen loading skeleton shown while initAuth() is resolving.
// Mimics the app shell structure (sidebar + content) to reduce layout shift.

"use client";

export function AppLoader() {
  return (
    <div className="app-loader" aria-label="Loading CoachFit…" role="status">
      {/* Top Header skeleton */}
      <div className="app-loader__header">
        {/* Logo */}
        <div className="app-loader__logo skeleton" />
        
        {/* Nav Items */}
        <div className="app-loader__nav">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="app-loader__nav-item skeleton" />
          ))}
        </div>

        {/* Right actions */}
        <div className="app-loader__actions">
          <div className="app-loader__btn skeleton" />
          <div className="app-loader__avatar skeleton" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="app-loader__main">
        {/* Content blocks */}
        <div className="app-loader__content">
          <div className="skeleton app-loader__card app-loader__card--wide" />
          <div className="app-loader__grid">
            <div className="skeleton app-loader__card" />
            <div className="skeleton app-loader__card" />
            <div className="skeleton app-loader__card" />
          </div>
          <div className="skeleton app-loader__card app-loader__card--tall" />
        </div>
      </div>

      <style>{`
        .app-loader {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          background: var(--bg-base);
          overflow: hidden;
        }

        /* ── Skeleton shimmer ──────────────────────────────────────────── */
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--bg-surface) 25%,
            var(--bg-elevated) 50%,
            var(--bg-surface) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: var(--radius-md);
        }

        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Top Header ────────────────────────────────────────────────── */
        .app-loader__header {
          height: 64px;
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .app-loader__logo {
          height: 32px;
          width: 120px;
        }

        .app-loader__nav {
          display: flex;
          gap: 16px;
        }

        .app-loader__nav-item {
          height: 20px;
          width: 80px;
        }

        .app-loader__actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .app-loader__btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
        }

        .app-loader__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
        }

        /* ── Main area ────────────────────────────────────────────────── */
        .app-loader__main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .app-loader__content {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow: hidden;
        }

        .app-loader__grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .app-loader__card {
          height: 140px;
        }

        .app-loader__card--wide {
          height: 80px;
        }

        .app-loader__card--tall {
          height: 220px;
        }

        /* ── Mobile: hide header elements ────────────────────────────── */
        @media (max-width: 768px) {
          .app-loader__header { display: none; }
          .app-loader__grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
