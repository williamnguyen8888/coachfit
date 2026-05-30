// src/app/(auth)/login/page.tsx
// Login page — calls POST /auth/login via the auth store.

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { isApiError } from "@/lib/errors";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message);
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {/* Logo / Brand */}
      <div className="auth-card__brand">
        <div className="auth-card__logo" aria-hidden="true">⚡</div>
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__subtitle">Sign in to your CoachFit account</p>
      </div>

      {/* OAuth buttons */}
      <div className="auth-card__oauth">
        <a
          href="/api/v1/auth/oauth/strava"
          className="oauth-btn oauth-btn--strava"
          id="login-strava"
        >
          <StravaIcon />
          Continue with Strava
        </a>
        <a
          href="/api/v1/auth/oauth/google"
          className="oauth-btn oauth-btn--google"
          id="login-google"
        >
          <GoogleIcon />
          Continue with Google
        </a>
      </div>

      <div className="auth-card__divider">
        <span>or continue with email</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="auth-card__error" role="alert" id="login-error">
          {error}
        </div>
      )}

      {/* Email / Password form */}
      <form onSubmit={handleSubmit} className="auth-card__form" noValidate>
        <div className="auth-field">
          <label htmlFor="login-email" className="auth-field__label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            className="auth-field__input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-password" className="auth-field__label">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            className="auth-field__input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          id="login-submit"
          type="submit"
          className="auth-btn auth-btn--primary"
          disabled={loading || !email || !password}
        >
          {loading ? (
            <span className="auth-btn__spinner" aria-hidden="true" />
          ) : null}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="auth-card__footer">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="auth-card__link" id="login-register-link">
          Create one
        </Link>
      </p>

      <AuthStyles />
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function StravaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function AuthStyles() {
  return (
    <style>{`
      .auth-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-xl);
        padding: 40px 32px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.4);
      }

      .auth-card__brand {
        text-align: center;
      }

      .auth-card__logo {
        font-size: 40px;
        margin-bottom: 12px;
      }

      .auth-card__title {
        font-size: var(--text-2xl);
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 6px;
      }

      .auth-card__subtitle {
        font-size: var(--text-sm);
        color: var(--text-muted);
        margin: 0;
      }

      /* OAuth buttons */
      .auth-card__oauth {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .oauth-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 11px 16px;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 500;
        text-decoration: none;
        transition: opacity 0.15s, transform 0.1s;
        cursor: pointer;
        border: 1px solid var(--border-default);
        color: var(--text-primary);
        background: var(--bg-elevated);
      }

      .oauth-btn:hover {
        opacity: 0.85;
        transform: translateY(-1px);
      }

      .oauth-btn--strava {
        color: #fc4c02;
        border-color: rgba(252,76,2,0.3);
        background: rgba(252,76,2,0.08);
      }

      /* Divider */
      .auth-card__divider {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--text-muted);
        font-size: var(--text-xs);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .auth-card__divider::before,
      .auth-card__divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border-subtle);
      }

      /* Error */
      .auth-card__error {
        background: rgba(239,68,68,0.1);
        border: 1px solid rgba(239,68,68,0.3);
        color: #f87171;
        border-radius: var(--radius-md);
        padding: 10px 14px;
        font-size: var(--text-sm);
      }

      /* Form */
      .auth-card__form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .auth-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .auth-field__label {
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--text-secondary);
      }

      .auth-field__input {
        width: 100%;
        padding: 10px 14px;
        background: var(--bg-elevated);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--text-sm);
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
        box-sizing: border-box;
      }

      .auth-field__input::placeholder {
        color: var(--text-muted);
      }

      .auth-field__input:focus {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 20%, transparent);
      }

      .auth-field__input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Submit button */
      .auth-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 12px 16px;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        border: none;
        transition: opacity 0.15s, transform 0.1s;
      }

      .auth-btn--primary {
        background: var(--brand-primary);
        color: white;
      }

      .auth-btn:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .auth-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .auth-btn__spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Footer */
      .auth-card__footer {
        text-align: center;
        font-size: var(--text-sm);
        color: var(--text-muted);
        margin: 0;
      }

      .auth-card__link {
        color: var(--brand-primary);
        text-decoration: none;
        font-weight: 500;
      }

      .auth-card__link:hover {
        text-decoration: underline;
      }
    `}</style>
  );
}
