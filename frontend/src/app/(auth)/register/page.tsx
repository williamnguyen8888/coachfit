// src/app/(auth)/register/page.tsx
// Registration page — calls POST /auth/register, hydrates auth store, redirects.
// Supports email/password + Google OAuth + Strava OAuth (auto-connects sync per docs).

"use client";

import { useState, useId, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth.store";
import { isApiError } from "@/lib/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: "athlete" | "coach" | "admin";
    tier: "free" | "pro" | "elite" | "coach";
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

function validateRegister(
  fullName: string,
  email: string,
  password: string,
): FieldErrors {
  const errs: FieldErrors = {};

  if (!fullName.trim()) {
    errs.fullName = "Full name is required.";
  } else if (fullName.trim().length < 2) {
    errs.fullName = "Name must be at least 2 characters.";
  }

  if (!email.trim()) {
    errs.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errs.email = "Enter a valid email address.";
  }

  if (!password) {
    errs.password = "Password is required.";
  } else if (password.length < 8) {
    errs.password = "Password must be at least 8 characters.";
  }

  return errs;
}

// ─── Password strength ────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): {
  score: number;
  level: "none" | "weak" | "fair" | "good" | "strong";
  label: string;
} {
  if (pw.length === 0) return { score: 0, level: "none", label: "" };
  if (pw.length < 8) return { score: 1, level: "weak", label: "Too short" };

  let score = 1;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;

  const map: Array<{ level: "weak" | "fair" | "good" | "strong"; label: string }> = [
    { level: "weak", label: "Weak" },
    { level: "weak", label: "Weak" },
    { level: "fair", label: "Fair" },
    { level: "good", label: "Good" },
    { level: "strong", label: "Strong" },
  ];
  const entry = map[score] ?? map[1];
  return { score, level: entry.level, label: entry.label };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const hydrateFromToken = useAuthStore((s) => s.hydrateFromToken);
  const uid = useId();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nameId = `${uid}-name`;
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;

  const passwordStrength = getPasswordStrength(password);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors(validateRegister(fullName, email, password));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    setTouched({ fullName: true, email: true, password: true });
    const errs = validateRegister(fullName, email, password);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
        skipAuth: true,
      });
      setAccessToken(res.token);
      hydrateFromToken(res.token);
      useAuthStore.setState({ status: "authenticated" });
      // New users will go to onboarding once built; fall back to dashboard for now
      router.replace("/");
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 409) {
          setFieldErrors((prev) => ({
            ...prev,
            email: "An account with this email already exists.",
          }));
          setTouched((prev) => ({ ...prev, email: true }));
        } else if (err.status === 400) {
          setServerError("Please check your details and try again.");
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError("Registration failed. Please check your connection.");
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
        <h1 className="auth-brand__title">Create your account</h1>
        <p className="auth-brand__subtitle">
          Start tracking your endurance training
        </p>
      </div>

      {/* ── OAuth shortcuts ────────────────────────────────── */}
      <div className="auth-oauth">
        <a
          href="/api/v1/auth/oauth/google"
          className="oauth-btn oauth-btn--google"
          id="register-google"
        >
          <GoogleIcon />
          <span>Sign up with Google</span>
        </a>
        <a
          href="/api/v1/auth/oauth/strava"
          className="oauth-btn oauth-btn--strava"
          id="register-strava"
        >
          <StravaIcon />
          <span>Sign up with Strava</span>
          <span className="oauth-btn__badge">Auto-syncs activities</span>
        </a>
      </div>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="auth-divider" role="separator">
        <span>or use email</span>
      </div>

      {/* ── Server error banner ────────────────────────────── */}
      {serverError && (
        <div
          className="auth-error-banner"
          role="alert"
          id="register-error"
          aria-live="polite"
        >
          <AlertIcon />
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Registration form ──────────────────────────────── */}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Full name */}
        <div className="auth-field">
          <label htmlFor={nameId} className="auth-field__label">
            Full name
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="name"
            required
            className={`auth-field__input${touched.fullName && fieldErrors.fullName ? " auth-field__input--error" : ""}`}
            placeholder="Minh Nguyen"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (touched.fullName)
                setFieldErrors(validateRegister(e.target.value, email, password));
            }}
            onBlur={() => handleBlur("fullName")}
            disabled={loading}
            aria-describedby={
              touched.fullName && fieldErrors.fullName
                ? `${nameId}-err`
                : undefined
            }
            aria-invalid={touched.fullName && !!fieldErrors.fullName}
          />
          {touched.fullName && fieldErrors.fullName && (
            <p id={`${nameId}-err`} className="auth-field__error" role="alert">
              {fieldErrors.fullName}
            </p>
          )}
        </div>

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
              if (touched.email)
                setFieldErrors(
                  validateRegister(fullName, e.target.value, password),
                );
            }}
            onBlur={() => handleBlur("email")}
            disabled={loading}
            aria-describedby={
              touched.email && fieldErrors.email ? `${emailId}-err` : undefined
            }
            aria-invalid={touched.email && !!fieldErrors.email}
          />
          {touched.email && fieldErrors.email && (
            <p
              id={`${emailId}-err`}
              className="auth-field__error"
              role="alert"
            >
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
              autoComplete="new-password"
              required
              minLength={8}
              className={`auth-field__input auth-field__input--with-action${touched.password && fieldErrors.password ? " auth-field__input--error" : ""}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (touched.password)
                  setFieldErrors(
                    validateRegister(fullName, email, e.target.value),
                  );
              }}
              onBlur={() => handleBlur("password")}
              disabled={loading}
              aria-describedby={`${passwordId}-strength${touched.password && fieldErrors.password ? ` ${passwordId}-err` : ""}`}
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

          {/* Strength indicator */}
          {password.length > 0 && (
            <div
              id={`${passwordId}-strength`}
              className="pw-strength"
              aria-label={`Password strength: ${passwordStrength.label}`}
            >
              <div className="pw-strength__bar" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="pw-strength__segment"
                    data-active={i <= passwordStrength.score}
                    data-level={passwordStrength.level}
                  />
                ))}
              </div>
              {passwordStrength.label && (
                <span
                  className="pw-strength__label"
                  data-level={passwordStrength.level}
                >
                  {passwordStrength.label}
                </span>
              )}
            </div>
          )}

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
          id="register-submit"
          type="submit"
          className="auth-submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="auth-submit__spinner" aria-hidden="true" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {/* ── Terms notice ───────────────────────────────────── */}
      <p className="auth-terms">
        By creating an account you agree to our{" "}
        <a href="/terms" className="auth-terms__link">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="auth-terms__link">
          Privacy Policy
        </a>
        .
      </p>

      {/* ── Footer ────────────────────────────────────────── */}
      <p className="auth-footer">
        Already have an account?{" "}
        <Link href="/login" className="auth-footer__link" id="register-login-link">
          Sign in
        </Link>
      </p>

      <RegisterStyles />
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

function RegisterStyles() {
  return (
    <style>{`
      /* ── Card ────────────────────────────────────────── */
      .auth-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-xl);
        padding: 40px 36px;
        display: flex;
        flex-direction: column;
        gap: 22px;
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

      /* ── OAuth ───────────────────────────────────────── */
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

      /* Strava "auto-syncs" badge */
      .oauth-btn__badge {
        font-size: 10px;
        font-weight: 500;
        background: rgba(252,76,2,0.15);
        color: #fc4c02;
        padding: 2px 7px;
        border-radius: var(--radius-full);
        letter-spacing: 0.02em;
        white-space: nowrap;
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
        gap: 16px;
      }

      /* ── Field ───────────────────────────────────────── */
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

      /* ── Password strength ───────────────────────────── */
      .pw-strength {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 2px;
      }

      .pw-strength__bar {
        display: flex;
        gap: 4px;
        flex: 1;
      }

      .pw-strength__segment {
        flex: 1;
        height: 3px;
        border-radius: var(--radius-full);
        background: var(--border-default);
        transition: background 0.25s ease;
      }

      .pw-strength__segment[data-active="true"][data-level="weak"]   { background: var(--color-danger); }
      .pw-strength__segment[data-active="true"][data-level="fair"]   { background: var(--color-warning); }
      .pw-strength__segment[data-active="true"][data-level="good"]   { background: var(--color-fitness); }
      .pw-strength__segment[data-active="true"][data-level="strong"] { background: var(--color-success); }

      .pw-strength__label {
        font-size: var(--text-xs);
        font-weight: 500;
        flex-shrink: 0;
        min-width: 44px;
        text-align: right;
        transition: color 0.25s ease;
      }

      .pw-strength__label[data-level="weak"]   { color: var(--color-danger); }
      .pw-strength__label[data-level="fair"]   { color: var(--color-warning); }
      .pw-strength__label[data-level="good"]   { color: var(--color-fitness); }
      .pw-strength__label[data-level="strong"] { color: var(--color-success); }

      /* ── Submit ──────────────────────────────────────── */
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

      /* ── Terms ───────────────────────────────────────── */
      .auth-terms {
        text-align: center;
        font-size: var(--text-xs);
        color: var(--text-muted);
        margin: -8px 0 0;
        line-height: 1.6;
      }

      .auth-terms__link {
        color: var(--text-muted);
        text-decoration: underline;
        text-underline-offset: 2px;
        transition: color 0.15s ease;
      }

      .auth-terms__link:hover {
        color: var(--text-secondary);
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
          gap: 18px;
        }

        .oauth-btn__badge {
          display: none;
        }
      }
    `}</style>
  );
}
