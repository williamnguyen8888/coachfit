// src/components/ui/AppLoader.tsx
// Full-screen loading skeleton shown while initAuth() is resolving.
// Mimics the app shell structure (sidebar + content) to reduce layout shift.

"use client";

export function AppLoader() {
  return (
    <div className="app-loader" aria-label="Loading CoachFit…" role="status">
      {/* Sidebar skeleton */}
      <div className="app-loader__sidebar">
        {/* Logo area */}
        <div className="app-loader__logo skeleton" />
        {/* Nav items */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="app-loader__nav-item">
            <div className="skeleton app-loader__nav-icon" />
            <div className="skeleton app-loader__nav-label" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="app-loader__main">
        {/* Top bar */}
        <div className="app-loader__topbar">
          <div className="skeleton app-loader__topbar-title" />
          <div className="skeleton app-loader__topbar-avatar" />
        </div>
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

        /* ── Sidebar ──────────────────────────────────────────────────── */
        .app-loader__sidebar {
          width: 240px;
          flex-shrink: 0;
          padding: 20px 16px;
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .app-loader__logo {
          height: 36px;
          width: 120px;
          margin-bottom: 24px;
        }

        .app-loader__nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
        }

        .app-loader__nav-icon {
          width: 20px;
          height: 20px;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }

        .app-loader__nav-label {
          height: 14px;
          flex: 1;
          max-width: 100px;
        }

        /* ── Main area ────────────────────────────────────────────────── */
        .app-loader__main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .app-loader__topbar {
          height: 60px;
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .app-loader__topbar-title {
          height: 20px;
          width: 160px;
        }

        .app-loader__topbar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
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

        /* ── Mobile: hide sidebar ─────────────────────────────────────── */
        @media (max-width: 768px) {
          .app-loader__sidebar { display: none; }
          .app-loader__grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
