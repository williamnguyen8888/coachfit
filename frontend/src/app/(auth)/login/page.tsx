// src/app/(auth)/login/page.tsx
// Login page — calls POST /auth/login via the auth store.
// Supports email/password + Google OAuth + Strava OAuth entry points.

"use client";

import { useState, useId, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { isApiError } from "@/lib/errors";

// ─── Field validation ─────────────────────────────────────────────────────────

interface FieldErrors {
  email?: string;
  password?: string;
}

function validateLogin(email: string, password: string): FieldErrors {
  const errs: FieldErrors = {};
  if (!email.trim()) {
    errs.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errs.email = "Enter a valid email address.";
  }
  if (!password) {
    errs.password = "Password is required.";
  }
  return errs;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const uid = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validateLogin(email, password);
    setFieldErrors(errs);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Mark all fields touched
    setTouched({ email: true, password: true });
    const errs = validateLogin(email, password);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      if (isApiError(err)) {
        // Map known backend codes to friendly messages
        if (err.status === 401) {
          setServerError("Incorrect email or password. Please try again.");
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError("Unable to sign in. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="auth-brand">
        <div className="auth-brand__logo" aria-hidden="true">
          <LogoMark />
        </div>
        <h1 className="auth-brand__title">Welcome back</h1>
        <p className="auth-brand__subtitle">Sign in to your CoachFit account</p>
      </div>

      {/* ── OAuth buttons ──────────────────────────────────── */}
      <div className="auth-oauth">
        <a
          href="/api/v1/auth/oauth/google"
          className="oauth-btn oauth-btn--google"
          id="login-google"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </a>
        <a
          href="/api/v1/auth/oauth/strava"
          className="oauth-btn oauth-btn--strava"
          id="login-strava"
        >
          <StravaIcon />
          <span>Continue with Strava</span>
        </a>
      </div>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="auth-divider" role="separator">
        <span>or continue with email</span>
      </div>

      {/* ── Server error banner ────────────────────────────── */}
      {serverError && (
        <div
          className="auth-error-banner"
          role="alert"
          id="login-error"
          aria-live="polite"
        >
          <AlertIcon />
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Email / password form ──────────────────────────── */}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Email */}
        <div className="auth-field">
          <label htmlFor={emailId} className="auth-field__label">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            className={`auth-field__input${touched.email && fieldErrors.email ? " auth-field__input--error" : ""}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (touched.email) {
                setFieldErrors(validateLogin(e.target.value, password));
              }
            }}
            onBlur={() => handleBlur("email")}
            disabled={loading}
            aria-describedby={
              touched.email && fieldErrors.email ? `${emailId}-err` : undefined
            }
            aria-invalid={touched.email && !!fieldErrors.email}
          />
          {touched.email && fieldErrors.email && (
            <p id={`${emailId}-err`} className="auth-field__error" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="auth-field">
          <label htmlFor={passwordId} className="auth-field__label">
            Password
          </label>
          <div className="auth-field__input-wrap">
            <input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className={`auth-field__input auth-field__input--with-action${touched.password && fieldErrors.password ? " auth-field__input--error" : ""}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (touched.password) {
                  setFieldErrors(validateLogin(email, e.target.value));
                }
              }}
              onBlur={() => handleBlur("password")}
              disabled={loading}
              aria-describedby={
                touched.password && fieldErrors.password
                  ? `${passwordId}-err`
                  : undefined
              }
              aria-invalid={touched.password && !!fieldErrors.password}
            />
            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {touched.password && fieldErrors.password && (
            <p
              id={`${passwordId}-err`}
              className="auth-field__error"
              role="alert"
            >
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          type="submit"
          className="auth-submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="auth-submit__spinner" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* ── Footer link ────────────────────────────────────── */}
      <p className="auth-footer">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="auth-footer__link" id="login-register-link">
          Create one
        </Link>
      </p>

      <AuthStyles />
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="var(--color-accent)" fillOpacity="0.15" />
      <path
        d="M18 6L26 14H22V22L18 30L14 22V14H10L18 6Z"
        fill="var(--color-accent)"
        fillOpacity="0.9"
      />
    </svg>
  );
}

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

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function AuthStyles() {
  return (
    <style>{`
      /* ── Card shell ─────────────────────────────────── */
      .auth-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-xl);
        padding: 40px 36px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        box-shadow:
          0 0 0 1px rgba(255,255,255,0.04) inset,
          0 32px 80px rgba(0,0,0,0.5),
          var(--shadow-glow);
        backdrop-filter: blur(2px);
      }

      /* ── Brand ──────────────────────────────────────── */
      .auth-brand {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }

      .auth-brand__logo {
        width: 52px;
        height: 52px;
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
      }

      .auth-brand__title {
        font-size: var(--text-2xl);
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        letter-spacing: -0.02em;
      }

      .auth-brand__subtitle {
        font-size: var(--text-sm);
        color: var(--text-muted);
        margin: 0;
      }

      /* ── OAuth buttons ───────────────────────────────── */
      .auth-oauth {
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
        font-family: inherit;
        text-decoration: none;
        border: 1px solid var(--border-default);
        color: var(--text-primary);
        background: var(--bg-elevated);
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }

      .oauth-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0);
        transition: background 0.15s ease;
      }

      .oauth-btn:hover {
        transform: translateY(-1px);
        border-color: var(--border-default);
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      }

      .oauth-btn:hover::before {
        background: rgba(255,255,255,0.03);
      }

      .oauth-btn:active {
        transform: scale(0.98);
      }

      .oauth-btn--google:hover {
        border-color: rgba(66,133,244,0.4);
        box-shadow: 0 4px 12px rgba(66,133,244,0.1);
      }

      .oauth-btn--strava {
        color: #fc4c02;
        border-color: rgba(252,76,2,0.25);
        background: rgba(252,76,2,0.06);
      }

      .oauth-btn--strava:hover {
        background: rgba(252,76,2,0.1);
        border-color: rgba(252,76,2,0.4);
        box-shadow: 0 4px 12px rgba(252,76,2,0.12);
      }

      /* ── Divider ─────────────────────────────────────── */
      .auth-divider {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--text-muted);
        font-size: var(--text-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 500;
      }

      .auth-divider::before,
      .auth-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border-subtle);
      }

      /* ── Error banner ────────────────────────────────── */
      .auth-error-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.25);
        color: #f87171;
        border-radius: var(--radius-md);
        padding: 12px 14px;
        font-size: var(--text-sm);
        animation: error-in 0.2s ease-out;
      }

      @keyframes error-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ── Form ────────────────────────────────────────── */
      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      /* ── Fields ──────────────────────────────────────── */
      .auth-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .auth-field__label {
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--text-secondary);
        letter-spacing: 0.01em;
      }

      .auth-field__input-wrap {
        position: relative;
      }

      .auth-field__input {
        width: 100%;
        padding: 11px 14px;
        background: var(--bg-elevated);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--text-sm);
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        box-sizing: border-box;
        height: 44px;
      }

      .auth-field__input--with-action {
        padding-right: 44px;
      }

      .auth-field__input::placeholder {
        color: var(--text-muted);
      }

      .auth-field__input:focus {
        border-color: var(--color-accent);
        background: var(--bg-input);
        box-shadow: 0 0 0 3px rgba(139,92,246,0.15);
      }

      .auth-field__input:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .auth-field__input--error {
        border-color: var(--color-danger) !important;
        box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important;
      }

      .auth-field__toggle {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        transition: color 0.15s ease;
      }

      .auth-field__toggle:hover {
        color: var(--text-secondary);
      }

      .auth-field__error {
        font-size: var(--text-xs);
        color: var(--color-danger);
        margin: 0;
        padding-left: 2px;
        animation: error-in 0.15s ease-out;
      }

      /* ── Submit button ────────────────────────────────── */
      .auth-submit {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        height: 44px;
        padding: 0 16px;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 600;
        font-family: inherit;
        letter-spacing: 0.01em;
        cursor: pointer;
        border: none;
        background: var(--color-accent);
        color: white;
        transition: opacity 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
        position: relative;
        overflow: hidden;
        margin-top: 4px;
      }

      .auth-submit::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%);
      }

      .auth-submit:hover:not(:disabled) {
        opacity: 0.92;
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(139,92,246,0.4);
      }

      .auth-submit:active:not(:disabled) {
        transform: scale(0.98);
      }

      .auth-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .auth-submit__spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.65s linear infinite;
        flex-shrink: 0;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* ── Footer ──────────────────────────────────────── */
      .auth-footer {
        text-align: center;
        font-size: var(--text-sm);
        color: var(--text-muted);
        margin: 0;
      }

      .auth-footer__link {
        color: var(--color-accent);
        text-decoration: none;
        font-weight: 500;
        transition: opacity 0.15s ease;
      }

      .auth-footer__link:hover {
        opacity: 0.8;
        text-decoration: underline;
      }

      /* ── Mobile ──────────────────────────────────────── */
      @media (max-width: 480px) {
        .auth-card {
          padding: 32px 24px;
          border-radius: var(--radius-lg);
        }
      }
    `}</style>
  );
}
