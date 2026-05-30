// src/app/(onboarding)/onboarding/page.tsx
// Onboarding wizard — 3 steps:
//   1. Sport selection   → selectedSports[]
//   2. Experience level  → experienceLevel
//   3. Connect device    → Strava / Garmin OAuth entry points + import state
//
// Per spec (docs/03-user-flows.md):
//   • If user signed up via Strava, step 3 auto-skips (Strava already connected)
//   • Dashboard is shown immediately — import runs in background
//   • Loading & partial-progress states visible during import

"use client";

import {
  useState,
  useEffect,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { useRouter } from "next/navigation";
import {
  useOnboardingStore,
  type Sport,
  type ExperienceLevel,
  type ImportStatus,
} from "@/stores/onboarding.store";

// ─── Meta ─────────────────────────────────────────────────────────────────────

export const metadata = undefined; // suppress — title set in layout

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const step = useOnboardingStore((s) => s.step);
  const completed = useOnboardingStore((s) => s.completed);
  const setStep = useOnboardingStore((s) => s.setStep);

  // Track whether we're animating a forward or backward transition
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (completed) {
      router.replace("/");
    }
  }, [completed, router]);

  function goNext() {
    setDirection("forward");
    setAnimating(true);
    setTimeout(() => {
      setStep((step < 3 ? step + 1 : step) as 1 | 2 | 3);
      setAnimating(false);
    }, 180);
  }

  function goBack() {
    if (step === 1) return;
    setDirection("back");
    setAnimating(true);
    setTimeout(() => {
      setStep((step - 1) as 1 | 2 | 3);
      setAnimating(false);
    }, 180);
  }

  return (
    <div className="onb">
      {/* ── Header ─────────────────────────────────── */}
      <header className="onb__header">
        <LogoMark />
        <span className="onb__brand-name">CoachFit</span>
      </header>

      {/* ── Progress ────────────────────────────────── */}
      <ProgressBar step={step} />

      {/* ── Step panel ──────────────────────────────── */}
      <main
        className={`onb__panel${animating ? ` onb__panel--${direction === "forward" ? "exit-left" : "exit-right"}` : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {step === 1 && <Step1Sports onNext={goNext} />}
        {step === 2 && <Step2Experience onNext={goNext} onBack={goBack} />}
        {step === 3 && <Step3Connect onBack={goBack} />}
      </main>

      <OnboardingStyles />
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const STEPS = ["Sport", "Experience", "Connect"];
  return (
    <nav className="onb-progress" aria-label="Onboarding progress">
      <div className="onb-progress__track" role="list">
        {STEPS.map((label, i) => {
          const num = i + 1;
          const state =
            num < step ? "done" : num === step ? "active" : "upcoming";
          return (
            <div
              key={label}
              className="onb-progress__item"
              role="listitem"
              aria-current={state === "active" ? "step" : undefined}
            >
              <div className={`onb-progress__dot onb-progress__dot--${state}`}>
                {state === "done" ? <CheckIcon size={10} /> : num}
              </div>
              <span
                className={`onb-progress__label onb-progress__label--${state}`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`onb-progress__connector${state === "done" ? " onb-progress__connector--done" : ""}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Step 1 — Sport Selection ─────────────────────────────────────────────────

const SPORTS: Array<{
  id: Sport;
  label: string;
  icon: ReactNode;
  color: string;
}> = [
  {
    id: "cycling",
    label: "Cycling",
    icon: <CyclingIcon />,
    color: "var(--sport-cycling)",
  },
  {
    id: "running",
    label: "Running",
    icon: <RunningIcon />,
    color: "var(--sport-running)",
  },
  {
    id: "swimming",
    label: "Swimming",
    icon: <SwimmingIcon />,
    color: "var(--sport-swimming)",
  },
  {
    id: "triathlon",
    label: "Triathlon",
    icon: <TriathlonIcon />,
    color: "var(--color-accent)",
  },
  {
    id: "strength",
    label: "Strength",
    icon: <StrengthIcon />,
    color: "var(--sport-strength)",
  },
  {
    id: "other",
    label: "Other",
    icon: <OtherIcon />,
    color: "var(--sport-other)",
  },
];

function Step1Sports({ onNext }: { onNext: () => void }) {
  const selectedSports = useOnboardingStore((s) => s.selectedSports);
  const toggleSport = useOnboardingStore((s) => s.toggleSport);

  const canContinue = selectedSports.length > 0;

  return (
    <div className="onb-step">
      <div className="onb-step__head">
        <div className="onb-step__eyebrow">Step 1 of 3</div>
        <h1 className="onb-step__title">What sports do you train?</h1>
        <p className="onb-step__subtitle">
          Select all that apply. This helps us tailor your dashboard.
        </p>
      </div>

      <div
        className="onb-sport-grid"
        role="group"
        aria-label="Sport selection"
      >
        {SPORTS.map((sport) => {
          const selected = selectedSports.includes(sport.id);
          return (
            <button
              key={sport.id}
              id={`sport-${sport.id}`}
              type="button"
              className={`onb-sport-card${selected ? " onb-sport-card--selected" : ""}`}
              onClick={() => toggleSport(sport.id)}
              aria-pressed={selected}
              style={
                selected
                  ? ({
                      "--sport-accent": sport.color,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <div className="onb-sport-card__icon" aria-hidden="true">
                {sport.icon}
              </div>
              <span className="onb-sport-card__label">{sport.label}</span>
              {selected && (
                <div className="onb-sport-card__check" aria-hidden="true">
                  <CheckIcon size={12} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="onb-step__actions">
        <PrimaryButton
          id="onb-step1-next"
          onClick={onNext}
          disabled={!canContinue}
        >
          Continue
          <ArrowRightIcon />
        </PrimaryButton>
        {!canContinue && (
          <p className="onb-step__hint" aria-live="polite">
            Select at least one sport to continue
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 2 — Experience Level ────────────────────────────────────────────────

const EXPERIENCE_OPTIONS: Array<{
  id: ExperienceLevel;
  label: string;
  description: string;
  years: string;
  icon: ReactNode;
}> = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Just starting out or returning after a break",
    years: "< 1 year",
    icon: <SeedlingIcon />,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Consistent training, working toward goals",
    years: "1–4 years",
    icon: <FlameIcon />,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Competitive athlete, structured training plans",
    years: "5+ years",
    icon: <TrophyIcon />,
  },
];

function Step2Experience({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const experienceLevel = useOnboardingStore((s) => s.experienceLevel);
  const setExperienceLevel = useOnboardingStore((s) => s.setExperienceLevel);

  return (
    <div className="onb-step">
      <div className="onb-step__head">
        <div className="onb-step__eyebrow">Step 2 of 3</div>
        <h1 className="onb-step__title">How long have you been training?</h1>
        <p className="onb-step__subtitle">
          We use this to set appropriate defaults for your zones and metrics.
        </p>
      </div>

      <div
        className="onb-exp-list"
        role="radiogroup"
        aria-label="Experience level"
      >
        {EXPERIENCE_OPTIONS.map((opt) => {
          const selected = experienceLevel === opt.id;
          return (
            <button
              key={opt.id}
              id={`exp-${opt.id}`}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`onb-exp-card${selected ? " onb-exp-card--selected" : ""}`}
              onClick={() => setExperienceLevel(opt.id)}
            >
              <div className="onb-exp-card__icon" aria-hidden="true">
                {opt.icon}
              </div>
              <div className="onb-exp-card__body">
                <div className="onb-exp-card__label">{opt.label}</div>
                <div className="onb-exp-card__desc">{opt.description}</div>
              </div>
              <div className="onb-exp-card__years">{opt.years}</div>
              {selected && (
                <div className="onb-exp-card__radio" aria-hidden="true">
                  <div className="onb-exp-card__radio-dot" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="onb-step__actions onb-step__actions--row">
        <GhostButton id="onb-step2-back" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </GhostButton>
        <PrimaryButton
          id="onb-step2-next"
          onClick={onNext}
          disabled={!experienceLevel}
        >
          Continue
          <ArrowRightIcon />
        </PrimaryButton>
      </div>
    </div>
  );
}

// ─── Step 3 — Connect Device / Platform ───────────────────────────────────────

function Step3Connect({ onBack }: { onBack: () => void }) {
  const connectStrava = useOnboardingStore((s) => s.connectStrava);
  const connectGarmin = useOnboardingStore((s) => s.connectGarmin);
  const skipDeviceConnection = useOnboardingStore(
    (s) => s.skipDeviceConnection,
  );
  const providerStatuses = useOnboardingStore((s) => s.providerStatuses);
  const complete = useOnboardingStore((s) => s.complete);
  const router = useRouter();

  // Check if any provider has been successfully connected (or done importing)
  const stravaStatus = providerStatuses.find((p) => p.provider === "strava");
  const garminStatus = providerStatuses.find((p) => p.provider === "garmin");

  const anyConnected =
    stravaStatus?.status === "done" || garminStatus?.status === "done";
  const anyImporting =
    stravaStatus?.status === "importing" ||
    garminStatus?.status === "importing" ||
    stravaStatus?.status === "connecting" ||
    garminStatus?.status === "connecting";

  function handleGoToDashboard() {
    complete();
    router.replace("/");
  }

  return (
    <div className="onb-step">
      <div className="onb-step__head">
        <div className="onb-step__eyebrow">Step 3 of 3</div>
        <h1 className="onb-step__title">Connect your training data</h1>
        <p className="onb-step__subtitle">
          Link Strava or Garmin to automatically import your activities and
          health data.
        </p>
      </div>

      <div className="onb-connect-list">
        {/* Strava card */}
        <ConnectProviderCard
          id="connect-strava"
          name="Strava"
          description="Auto-sync activities, routes &amp; segments"
          badge="Most popular"
          icon={<StravaIcon />}
          accentColor="#fc4c02"
          status={stravaStatus}
          onConnect={connectStrava}
        />

        {/* Garmin card */}
        <ConnectProviderCard
          id="connect-garmin"
          name="Garmin"
          description="Full health data: HRV, sleep, body battery"
          icon={<GarminIcon />}
          accentColor="#00a8e0"
          status={garminStatus}
          onConnect={connectGarmin}
        />
      </div>

      {/* Global import progress banner */}
      {anyImporting && !anyConnected && (
        <div className="onb-import-banner onb-import-banner--progress" aria-live="polite">
          <ImportSpinner />
          <div className="onb-import-banner__text">
            <div className="onb-import-banner__title">
              Connecting & importing…
            </div>
            <div className="onb-import-banner__sub">
              This takes just a moment. You can go to the dashboard now &mdash; we&apos;ll
              keep importing in the background.
            </div>
          </div>
        </div>
      )}

      {/* All done banner */}
      {anyConnected && (
        <div className="onb-import-banner onb-import-banner--done" aria-live="polite">
          <SuccessIcon />
          <div className="onb-import-banner__text">
            <div className="onb-import-banner__title">
              {getTotalCount(providerStatuses)} activities imported
            </div>
            <div className="onb-import-banner__sub">
              Head to your dashboard — your training data is ready.
            </div>
          </div>
        </div>
      )}

      <div className="onb-step__actions onb-step__actions--row">
        <GhostButton id="onb-step3-back" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </GhostButton>

        {anyConnected || anyImporting ? (
          <PrimaryButton
            id="onb-go-dashboard"
            onClick={handleGoToDashboard}
          >
            Go to Dashboard
            <ArrowRightIcon />
          </PrimaryButton>
        ) : (
          <GhostButton
            id="onb-skip-connect"
            onClick={skipDeviceConnection}
            className="onb-skip-btn"
          >
            Skip for now
          </GhostButton>
        )}
      </div>

      <p className="onb-connect-note">
        You can connect more accounts later in{" "}
        <strong>Settings &rarr; Connected Accounts</strong>.
      </p>
    </div>
  );
}

// ─── ConnectProviderCard ──────────────────────────────────────────────────────

interface ConnectProviderCardProps {
  id: string;
  name: string;
  description: string;
  badge?: string;
  icon: ReactNode;
  accentColor: string;
  status: { status: ImportStatus; count?: number; error?: string } | undefined;
  onConnect: () => void;
}

function ConnectProviderCard({
  id,
  name,
  description,
  badge,
  icon,
  accentColor,
  status,
  onConnect,
}: ConnectProviderCardProps) {
  const st = status?.status ?? "idle";

  return (
    <div
      className={`onb-provider-card onb-provider-card--${st}`}
      style={{ "--provider-accent": accentColor } as React.CSSProperties}
      aria-label={`${name} connection status: ${st}`}
    >
      <div className="onb-provider-card__icon">{icon}</div>
      <div className="onb-provider-card__body">
        <div className="onb-provider-card__name">
          {name}
          {badge && (
            <span className="onb-provider-card__badge">{badge}</span>
          )}
        </div>
        <div className="onb-provider-card__desc">{description}</div>

        {/* Status line */}
        {st === "connecting" && (
          <div className="onb-provider-card__status onb-provider-card__status--connecting" aria-live="polite">
            <MiniSpinner />
            <span>Connecting…</span>
          </div>
        )}
        {st === "importing" && (
          <div className="onb-provider-card__status onb-provider-card__status--importing" aria-live="polite">
            <ImportBar />
            <span>Importing activities…</span>
          </div>
        )}
        {st === "done" && (
          <div className="onb-provider-card__status onb-provider-card__status--done" aria-live="polite">
            <CheckCircleIcon />
            <span>
              {status?.count ? `${status.count} activities imported` : "Connected"}
            </span>
          </div>
        )}
        {st === "error" && (
          <div className="onb-provider-card__status onb-provider-card__status--error" aria-live="polite">
            <WarningIcon />
            <span>{status?.error ?? "Connection failed. Try again."}</span>
          </div>
        )}
      </div>

      <div className="onb-provider-card__action">
        {st === "idle" && (
          <button
            id={id}
            type="button"
            className="onb-connect-btn"
            onClick={onConnect}
            aria-label={`Connect ${name}`}
          >
            Connect
          </button>
        )}
        {(st === "connecting" || st === "importing") && (
          <button type="button" className="onb-connect-btn onb-connect-btn--loading" disabled aria-busy="true">
            <MiniSpinner />
          </button>
        )}
        {st === "done" && (
          <div className="onb-connect-btn onb-connect-btn--done" aria-label="Connected">
            <CheckIcon size={14} />
          </div>
        )}
        {st === "error" && (
          <button
            type="button"
            className="onb-connect-btn onb-connect-btn--retry"
            onClick={onConnect}
            aria-label={`Retry connecting ${name}`}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTotalCount(statuses: Array<{ count?: number; status: ImportStatus }>) {
  return statuses
    .filter((s) => s.status === "done")
    .reduce((sum, s) => sum + (s.count ?? 0), 0);
}

// ─── Reusable button components ───────────────────────────────────────────────

function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`onb-btn onb-btn--primary ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`onb-btn onb-btn--ghost ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="var(--color-accent)" fillOpacity="0.15" />
      <path
        d="M18 6L26 14H22V22L18 30L14 22V14H10L18 6Z"
        fill="var(--color-accent)"
        fillOpacity="0.9"
      />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function MiniSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="onb-spinner">
      <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
      <path d="M12 3a9 9 0 0 1 9 9" />
    </svg>
  );
}

function ImportSpinner() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="onb-spinner">
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3a9 9 0 0 1 9 9" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <div className="onb-success-icon" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

function ImportBar() {
  return (
    <div className="onb-import-bar" aria-hidden="true">
      <div className="onb-import-bar__fill" />
    </div>
  );
}

// Sport icons
function CyclingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 0 0 0-2h-3l-3 8H5" />
      <path d="M15 6l2 4.5-5.5 4.5" />
    </svg>
  );
}

function RunningIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="1.5" />
      <path d="M8 17l1-3 3 2 3-6" />
      <path d="m6 21 3-4 3 2-1-6 4-2 3-4" />
    </svg>
  );
}

function SwimmingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 16c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <circle cx="17" cy="4" r="2" />
      <path d="m19 6-3 5h4" />
      <path d="m14 11-3-3-4 4" />
    </svg>
  );
}

function TriathlonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v5l3 3" />
      <path d="m9 12-3 3" />
      <path d="M8 20h8" />
      <path d="M10 15v5" />
      <path d="M14 15v5" />
    </svg>
  );
}

function StrengthIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h.01M17.5 6.5h.01M6.5 17.5h.01M17.5 17.5h.01M2 8h2M2 16h2M20 8h2M20 16h2M5 8a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8z" />
      <path d="M8 12h8" />
    </svg>
  );
}

function OtherIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}

function SeedlingIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-2-3.7.7-.1 3.3-.2 4.5.3z" />
      <path d="M14.1 6a7 7 0 0 1 1.1 4.8 4 4 0 0 1-4.8-1 5 5 0 0 1-1-4.8A7 7 0 0 1 14.1 6z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M7 4H17V14a5 5 0 0 1-5 5a5 5 0 0 1-5-5V4z" />
      <path d="M17 9h3a1 1 0 0 1 0 5h-3" />
      <path d="M7 9H4a1 1 0 0 0 0 5h3" />
    </svg>
  );
}

function StravaIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

function GarminIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
      <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 6c7.73 0 14 6.27 14 14s-6.27 14-14 14S10 31.73 10 24 16.27 10 24 10zm-2 4v12h8v-3h-5V14h-3z" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function OnboardingStyles() {
  return (
    <style>{`
      /* ── Shell ─────────────────────────────────────────── */
      .onb {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        min-height: 100dvh;
      }

      /* ── Header ─────────────────────────────────────────── */
      .onb__header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 20px 0 0;
        margin-bottom: 8px;
      }

      .onb__brand-name {
        font-size: var(--text-lg);
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.02em;
      }

      /* ── Progress ───────────────────────────────────────── */
      .onb-progress {
        padding: 16px 0 24px;
      }

      .onb-progress__track {
        display: flex;
        align-items: center;
        gap: 0;
      }

      .onb-progress__item {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .onb-progress__item:last-child {
        flex: 0 0 auto;
      }

      .onb-progress__dot {
        width: 28px;
        height: 28px;
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        flex-shrink: 0;
        transition: all var(--duration-standard) var(--ease-standard);
      }

      .onb-progress__dot--active {
        background: var(--color-accent);
        color: white;
        box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
      }

      .onb-progress__dot--done {
        background: var(--color-success);
        color: white;
      }

      .onb-progress__dot--upcoming {
        background: var(--bg-elevated);
        border: 1px solid var(--border-default);
        color: var(--text-muted);
      }

      .onb-progress__label {
        font-size: var(--text-xs);
        font-weight: 500;
        white-space: nowrap;
        transition: color var(--duration-standard) var(--ease-standard);
      }

      .onb-progress__label--active { color: var(--text-primary); }
      .onb-progress__label--done   { color: var(--color-success); }
      .onb-progress__label--upcoming { color: var(--text-muted); }

      .onb-progress__connector {
        flex: 1;
        height: 2px;
        background: var(--border-subtle);
        border-radius: var(--radius-full);
        margin: 0 4px;
        transition: background var(--duration-standard) var(--ease-standard);
      }

      .onb-progress__connector--done {
        background: var(--color-success);
      }

      /* ── Step panel ─────────────────────────────────────── */
      .onb__panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        transition: opacity 0.18s ease, transform 0.18s ease;
      }

      .onb__panel--exit-left  { opacity: 0; transform: translateX(-24px); }
      .onb__panel--exit-right { opacity: 0; transform: translateX(24px); }

      .onb-step {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 28px;
        animation: step-in 0.22s ease-out both;
      }

      @keyframes step-in {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ── Step head ──────────────────────────────────────── */
      .onb-step__head {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .onb-step__eyebrow {
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--color-accent);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .onb-step__title {
        font-size: var(--text-2xl);
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        letter-spacing: -0.02em;
        line-height: 1.25;
      }

      .onb-step__subtitle {
        font-size: var(--text-sm);
        color: var(--text-secondary);
        margin: 0;
        line-height: 1.6;
      }

      /* ── Actions ────────────────────────────────────────── */
      .onb-step__actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: auto;
        padding-top: 8px;
      }

      .onb-step__actions--row {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      .onb-step__hint {
        font-size: var(--text-xs);
        color: var(--text-muted);
        text-align: center;
        margin: 0;
      }

      /* ── Buttons ────────────────────────────────────────── */
      .onb-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 20px;
        height: 44px;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        border: none;
        outline: none;
        transition: all var(--duration-micro) ease-out;
        white-space: nowrap;
      }

      .onb-btn:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }

      .onb-btn:active { transform: scale(0.98); }

      .onb-btn--primary {
        background: var(--color-accent);
        color: white;
        min-width: 140px;
        justify-content: center;
      }

      .onb-btn--primary:hover:not(:disabled) {
        filter: brightness(1.1);
        box-shadow: 0 4px 16px rgba(139,92,246,0.3);
      }

      .onb-btn--primary:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .onb-btn--ghost {
        background: transparent;
        color: var(--text-secondary);
        padding: 0 12px;
      }

      .onb-btn--ghost:hover:not(:disabled) {
        color: var(--text-primary);
        background: var(--bg-elevated);
      }

      .onb-skip-btn {
        color: var(--text-muted) !important;
        font-weight: 500;
      }

      /* ── Step 1: Sport grid ─────────────────────────────── */
      .onb-sport-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      @media (max-width: 400px) {
        .onb-sport-grid { grid-template-columns: repeat(2, 1fr); }
      }

      .onb-sport-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 20px 12px;
        background: var(--bg-surface);
        border: 1.5px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        cursor: pointer;
        font-family: inherit;
        transition: all var(--duration-micro) ease-out;
        min-height: 96px;
      }

      .onb-sport-card:hover {
        border-color: var(--border-default);
        background: var(--bg-elevated);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .onb-sport-card:active { transform: scale(0.97); }

      .onb-sport-card--selected {
        border-color: var(--sport-accent, var(--color-accent));
        background: color-mix(in srgb, var(--sport-accent, var(--color-accent)) 10%, var(--bg-surface));
        box-shadow: 0 0 0 1px var(--sport-accent, var(--color-accent));
      }

      .onb-sport-card__icon {
        color: var(--text-secondary);
        transition: color var(--duration-micro) ease;
      }

      .onb-sport-card--selected .onb-sport-card__icon {
        color: var(--sport-accent, var(--color-accent));
      }

      .onb-sport-card__label {
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--text-secondary);
        transition: color var(--duration-micro) ease;
      }

      .onb-sport-card--selected .onb-sport-card__label {
        color: var(--text-primary);
        font-weight: 600;
      }

      .onb-sport-card__check {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border-radius: var(--radius-full);
        background: var(--sport-accent, var(--color-accent));
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pop-in 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      @keyframes pop-in {
        from { transform: scale(0); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }

      /* ── Step 2: Experience list ────────────────────────── */
      .onb-exp-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .onb-exp-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: var(--bg-surface);
        border: 1.5px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: all var(--duration-micro) ease-out;
        position: relative;
      }

      .onb-exp-card:hover {
        border-color: var(--border-default);
        background: var(--bg-elevated);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }

      .onb-exp-card:active { transform: scale(0.99); }

      .onb-exp-card--selected {
        border-color: var(--color-accent);
        background: rgba(139, 92, 246, 0.08);
      }

      .onb-exp-card__icon {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-md);
        background: var(--bg-elevated);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        flex-shrink: 0;
        transition: all var(--duration-micro) ease;
      }

      .onb-exp-card--selected .onb-exp-card__icon {
        background: rgba(139, 92, 246, 0.15);
        color: var(--color-accent);
      }

      .onb-exp-card__body {
        flex: 1;
        min-width: 0;
      }

      .onb-exp-card__label {
        font-size: var(--text-base);
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 2px;
      }

      .onb-exp-card__desc {
        font-size: var(--text-sm);
        color: var(--text-muted);
        line-height: 1.4;
      }

      .onb-exp-card__years {
        font-size: var(--text-xs);
        font-weight: 500;
        color: var(--text-muted);
        white-space: nowrap;
        flex-shrink: 0;
      }

      .onb-exp-card--selected .onb-exp-card__years {
        color: var(--color-accent);
      }

      .onb-exp-card__radio {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 18px;
        height: 18px;
        border-radius: var(--radius-full);
        border: 2px solid var(--color-accent);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .onb-exp-card__radio-dot {
        width: 8px;
        height: 8px;
        border-radius: var(--radius-full);
        background: var(--color-accent);
        animation: pop-in 0.12s ease-out both;
      }

      /* ── Step 3: Provider cards ─────────────────────────── */
      .onb-connect-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .onb-provider-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: var(--bg-surface);
        border: 1.5px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        transition: all var(--duration-micro) ease;
      }

      .onb-provider-card--done {
        border-color: color-mix(in srgb, var(--provider-accent, var(--color-success)) 40%, transparent);
        background: color-mix(in srgb, var(--provider-accent, var(--color-success)) 5%, var(--bg-surface));
      }

      .onb-provider-card--connecting,
      .onb-provider-card--importing {
        border-color: color-mix(in srgb, var(--provider-accent, var(--color-accent)) 30%, transparent);
      }

      .onb-provider-card--error {
        border-color: rgba(239, 68, 68, 0.35);
        background: rgba(239, 68, 68, 0.04);
      }

      .onb-provider-card__icon {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-md);
        background: var(--bg-elevated);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--provider-accent, var(--text-secondary));
        flex-shrink: 0;
      }

      .onb-provider-card__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .onb-provider-card__name {
        font-size: var(--text-base);
        font-weight: 600;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .onb-provider-card__badge {
        font-size: 10px;
        font-weight: 500;
        background: rgba(139, 92, 246, 0.15);
        color: var(--color-accent);
        padding: 2px 7px;
        border-radius: var(--radius-full);
      }

      .onb-provider-card__desc {
        font-size: var(--text-sm);
        color: var(--text-muted);
      }

      .onb-provider-card__status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: var(--text-xs);
        font-weight: 500;
        margin-top: 4px;
        animation: step-in 0.2s ease-out;
      }

      .onb-provider-card__status--connecting,
      .onb-provider-card__status--importing { color: var(--provider-accent, var(--color-accent)); }
      .onb-provider-card__status--done      { color: var(--color-success); }
      .onb-provider-card__status--error     { color: var(--color-danger); }

      /* ── Provider action button ──────────────────────────── */
      .onb-connect-btn {
        padding: 0 14px;
        height: 34px;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        border: 1.5px solid var(--provider-accent, var(--color-accent));
        color: var(--provider-accent, var(--color-accent));
        background: color-mix(in srgb, var(--provider-accent, var(--color-accent)) 10%, transparent);
        transition: all var(--duration-micro) ease;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .onb-connect-btn:hover:not(:disabled) {
        background: color-mix(in srgb, var(--provider-accent, var(--color-accent)) 18%, transparent);
      }

      .onb-connect-btn--loading {
        opacity: 0.6;
        cursor: wait;
        border-color: var(--border-default);
        color: var(--text-muted);
        background: transparent;
      }

      .onb-connect-btn--done {
        width: 34px;
        height: 34px;
        padding: 0;
        border-radius: var(--radius-full);
        border-color: var(--color-success);
        color: var(--color-success);
        background: rgba(34, 197, 94, 0.12);
        justify-content: center;
        pointer-events: none;
      }

      .onb-connect-btn--retry {
        border-color: var(--color-danger);
        color: var(--color-danger);
        background: rgba(239,68,68,0.08);
      }

      /* ── Import banner ───────────────────────────────────── */
      .onb-import-banner {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 14px 16px;
        border-radius: var(--radius-lg);
        animation: step-in 0.25s ease-out;
      }

      .onb-import-banner--progress {
        background: rgba(139, 92, 246, 0.08);
        border: 1px solid rgba(139, 92, 246, 0.2);
        color: var(--color-accent);
      }

      .onb-import-banner--done {
        background: rgba(34, 197, 94, 0.08);
        border: 1px solid rgba(34, 197, 94, 0.25);
        color: var(--color-success);
      }

      .onb-import-banner__title {
        font-size: var(--text-sm);
        font-weight: 600;
        margin-bottom: 2px;
      }

      .onb-import-banner__sub {
        font-size: var(--text-xs);
        color: var(--text-secondary);
        line-height: 1.5;
      }

      .onb-success-icon {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-full);
        background: rgba(34, 197, 94, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      /* ── Connect note ────────────────────────────────────── */
      .onb-connect-note {
        font-size: var(--text-xs);
        color: var(--text-muted);
        text-align: center;
        margin: 0;
        padding-bottom: 8px;
      }

      /* ── Spinner ─────────────────────────────────────────── */
      .onb-spinner {
        animation: spin 0.8s linear infinite;
        flex-shrink: 0;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      /* ── Import indeterminate bar ────────────────────────── */
      .onb-import-bar {
        width: 64px;
        height: 3px;
        background: var(--border-default);
        border-radius: var(--radius-full);
        overflow: hidden;
        flex-shrink: 0;
        align-self: center;
      }

      .onb-import-bar__fill {
        height: 100%;
        width: 40%;
        background: var(--provider-accent, var(--color-accent));
        border-radius: var(--radius-full);
        animation: indeterminate 1.4s ease-in-out infinite;
      }

      @keyframes indeterminate {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(260%); }
      }

      /* ── Responsive ──────────────────────────────────────── */
      @media (max-width: 480px) {
        .onb-step__title { font-size: var(--text-xl); }
        .onb-progress__label { display: none; }
        .onb-step__actions--row {
          flex-direction: column-reverse;
          align-items: stretch;
        }
        .onb-btn--primary { justify-content: center; width: 100%; }
        .onb-btn--ghost { justify-content: center; }
      }
    `}</style>
  );
}
