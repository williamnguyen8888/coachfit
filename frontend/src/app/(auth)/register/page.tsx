// src/app/(auth)/register/page.tsx
// Registration page — calls POST /auth/register, stores token, redirects to app.

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth.store";
import { isApiError } from "@/lib/errors";

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: "athlete" | "coach" | "admin";
    tier: "free" | "pro" | "elite" | "coach";
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const hydrateFromToken = useAuthStore((s) => s.hydrateFromToken);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password }),
        skipAuth: true,
      });
      setAccessToken(res.token);
      hydrateFromToken(res.token);
      // Update auth status to authenticated
      useAuthStore.setState({ status: "authenticated" });
      // New users go to onboarding (not yet built — fall back to dashboard)
      router.replace("/");
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="auth-card">
      {/* Brand */}
      <div className="auth-card__brand">
        <div className="auth-card__logo" aria-hidden="true">⚡</div>
        <h1 className="auth-card__title">Create your account</h1>
        <p className="auth-card__subtitle">
          Start tracking your endurance training
        </p>
      </div>

      {/* OAuth shortcuts */}
      <div className="auth-card__oauth">
        <a
          href="/api/v1/auth/oauth/strava"
          className="oauth-btn oauth-btn--strava"
          id="register-strava"
        >
          <StravaIcon />
          Sign up with Strava
        </a>
        <a
          href="/api/v1/auth/oauth/google"
          className="oauth-btn"
          id="register-google"
        >
          <GoogleIcon />
          Sign up with Google
        </a>
      </div>

      <div className="auth-card__divider">
        <span>or use email</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="auth-card__error" role="alert" id="register-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-card__form" noValidate>
        <div className="auth-field">
          <label htmlFor="register-name" className="auth-field__label">
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            required
            className="auth-field__input"
            placeholder="Minh Nguyen"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="register-email" className="auth-field__label">
            Email
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="auth-field__label">
            Password
            <span className="auth-field__hint"> (min 8 characters)</span>
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="auth-field__input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {password.length > 0 && (
            <div className="password-strength" aria-label={`Password strength: ${passwordStrength.label}`}>
              <div className="password-strength__bar">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="password-strength__segment"
                    data-active={i < passwordStrength.score}
                    data-level={passwordStrength.level}
                  />
                ))}
              </div>
              <span className="password-strength__label" data-level={passwordStrength.level}>
                {passwordStrength.label}
              </span>
            </div>
          )}
        </div>

        <button
          id="register-submit"
          type="submit"
          className="auth-btn auth-btn--primary"
          disabled={loading || !fullName || !email || password.length < 8}
        >
          {loading ? <span className="auth-btn__spinner" aria-hidden="true" /> : null}
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-card__footer">
        Already have an account?{" "}
        <Link href="/login" className="auth-card__link" id="register-login-link">
          Sign in
        </Link>
      </p>

      <RegisterStyles />
    </div>
  );
}

// ─── Password strength helper ─────────────────────────────────────────────────

function getPasswordStrength(pw: string): { score: number; level: string; label: string } {
  if (pw.length < 8) return { score: 0, level: "none", label: "Too short" };
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const levels = ["", "weak", "fair", "good", "strong"];
  return { score, level: levels[score] ?? "weak", label: labels[score] ?? "Weak" };
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

function RegisterStyles() {
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

      .auth-card__brand { text-align: center; }
      .auth-card__logo { font-size: 40px; margin-bottom: 12px; }
      .auth-card__title { font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
      .auth-card__subtitle { font-size: var(--text-sm); color: var(--text-muted); margin: 0; }

      .auth-card__oauth { display: flex; flex-direction: column; gap: 10px; }

      .oauth-btn {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        padding: 11px 16px; border-radius: var(--radius-md);
        font-size: var(--text-sm); font-weight: 500; text-decoration: none;
        transition: opacity 0.15s, transform 0.1s; cursor: pointer;
        border: 1px solid var(--border-default); color: var(--text-primary);
        background: var(--bg-elevated);
      }
      .oauth-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      .oauth-btn--strava { color: #fc4c02; border-color: rgba(252,76,2,0.3); background: rgba(252,76,2,0.08); }

      .auth-card__divider {
        display: flex; align-items: center; gap: 12px;
        color: var(--text-muted); font-size: var(--text-xs);
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .auth-card__divider::before, .auth-card__divider::after {
        content: ''; flex: 1; height: 1px; background: var(--border-subtle);
      }

      .auth-card__error {
        background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
        color: #f87171; border-radius: var(--radius-md);
        padding: 10px 14px; font-size: var(--text-sm);
      }

      .auth-card__form { display: flex; flex-direction: column; gap: 16px; }

      .auth-field { display: flex; flex-direction: column; gap: 6px; }
      .auth-field__label { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); }
      .auth-field__hint { color: var(--text-muted); font-weight: 400; }

      .auth-field__input {
        width: 100%; padding: 10px 14px; background: var(--bg-elevated);
        border: 1px solid var(--border-default); border-radius: var(--radius-md);
        color: var(--text-primary); font-size: var(--text-sm); font-family: inherit;
        outline: none; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
      }
      .auth-field__input::placeholder { color: var(--text-muted); }
      .auth-field__input:focus {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 20%, transparent);
      }
      .auth-field__input:disabled { opacity: 0.6; cursor: not-allowed; }

      /* Password strength */
      .password-strength {
        display: flex; align-items: center; gap: 10px; margin-top: 4px;
      }
      .password-strength__bar { display: flex; gap: 4px; flex: 1; }
      .password-strength__segment {
        flex: 1; height: 3px; border-radius: 2px;
        background: var(--border-default);
        transition: background 0.2s;
      }
      .password-strength__segment[data-active="true"][data-level="weak"] { background: #ef4444; }
      .password-strength__segment[data-active="true"][data-level="fair"] { background: #f59e0b; }
      .password-strength__segment[data-active="true"][data-level="good"] { background: #3b82f6; }
      .password-strength__segment[data-active="true"][data-level="strong"] { background: #22c55e; }
      .password-strength__label {
        font-size: var(--text-xs); font-weight: 500; flex-shrink: 0;
      }
      .password-strength__label[data-level="weak"] { color: #ef4444; }
      .password-strength__label[data-level="fair"] { color: #f59e0b; }
      .password-strength__label[data-level="good"] { color: #3b82f6; }
      .password-strength__label[data-level="strong"] { color: #22c55e; }

      /* Button */
      .auth-btn {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%; padding: 12px 16px; border-radius: var(--radius-md);
        font-size: var(--text-sm); font-weight: 600; font-family: inherit;
        cursor: pointer; border: none; transition: opacity 0.15s, transform 0.1s;
      }
      .auth-btn--primary { background: var(--brand-primary); color: white; }
      .auth-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      .auth-btn__spinner {
        width: 16px; height: 16px;
        border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
        border-radius: 50%; animation: spin 0.7s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .auth-card__footer { text-align: center; font-size: var(--text-sm); color: var(--text-muted); margin: 0; }
      .auth-card__link { color: var(--brand-primary); text-decoration: none; font-weight: 500; }
      .auth-card__link:hover { text-decoration: underline; }
    `}</style>
  );
}
