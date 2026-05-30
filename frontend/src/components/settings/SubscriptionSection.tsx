"use client";
// src/components/settings/SubscriptionSection.tsx
// Subscription placeholder — shows current plan and tier features.
// Checkout and portal calls hook into Stripe-backed backend.
// API: GET /subscription · POST /subscription/checkout · POST /subscription/portal

import React, { useState } from "react";
import { useQuery } from "@/hooks/useQuery";
import { subscriptionService } from "@/lib/services/settings";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CheckCircle,
  Crown,
  Zap,
  ExternalLink,
  Lock,
  Star,
} from "lucide-react";
import type { Subscription } from "@/lib/types/settings";

/* ─── Plan configs ─────────────────────────────────────────────────────────── */

interface PlanConfig {
  tier: "free" | "pro" | "elite";
  label: string;
  price: string;
  color: string;
  icon: React.ReactNode;
  features: string[];
}

const PLANS: PlanConfig[] = [
  {
    tier: "free",
    label: "Free",
    price: "$0 / mo",
    color: "var(--text-muted)",
    icon: <Star size={16} />,
    features: [
      "Last 30 days of activities",
      "Basic calendar",
      "Manual wellness log",
      "1 connected platform",
      "Strava & Garmin sync",
    ],
  },
  {
    tier: "pro",
    label: "Pro",
    price: "$12 / mo",
    color: "var(--color-fitness)",
    icon: <Zap size={16} />,
    features: [
      "Everything in Free",
      "Full activity history",
      "PMC / fitness chart",
      "Power curve analysis",
      "Advanced zone distribution",
      "FIT file export",
      "API key access",
    ],
  },
  {
    tier: "elite",
    label: "Elite",
    price: "$29 / mo",
    color: "var(--color-accent)",
    icon: <Crown size={16} />,
    features: [
      "Everything in Pro",
      "AI coaching suggestions",
      "Race predictor",
      "Priority support",
      "Early access to new features",
    ],
  },
];

/* ─── Status badge ─────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "var(--color-success)" },
    trialing: { label: "Trial", color: "var(--color-fitness)" },
    past_due: { label: "Past due", color: "var(--color-warning)" },
    canceled: { label: "Canceled", color: "var(--color-danger)" },
    incomplete: { label: "Incomplete", color: "var(--color-warning)" },
  };
  const cfg = map[status] ?? { label: status, color: "var(--text-muted)" };
  return (
    <span
      className="rounded-[var(--radius-full)] px-2 py-0.5"
      style={{
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
        color: cfg.color,
        border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`,
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ─── Plan card ────────────────────────────────────────────────────────────── */

function PlanCard({
  plan,
  isCurrentTier,
  sub,
  onUpgrade,
  onManage,
}: {
  plan: PlanConfig;
  isCurrentTier: boolean;
  sub: Subscription | null;
  onUpgrade: (tier: "pro" | "elite") => void;
  onManage: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (plan.tier === "free") return;
    if (isCurrentTier && sub?.tier !== "free") {
      setLoading(true);
      try { await onManage(); } finally { setLoading(false); }
      return;
    }
    setLoading(true);
    try { await onUpgrade(plan.tier as "pro" | "elite"); } finally { setLoading(false); }
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-[var(--radius-lg)] p-5 flex-1 min-w-[200px] transition-all duration-200"
      style={{
        background: isCurrentTier
          ? `color-mix(in srgb, ${plan.color} 8%, var(--bg-surface))`
          : "var(--bg-surface)",
        border: isCurrentTier
          ? `2px solid color-mix(in srgb, ${plan.color} 45%, transparent)`
          : "1px solid var(--border-subtle)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow for current */}
      {isCurrentTier && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at top left, color-mix(in srgb, ${plan.color} 10%, transparent), transparent 60%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: plan.color }}>{plan.icon}</span>
          <span
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {plan.label}
          </span>
          {isCurrentTier && (
            <span
              className="rounded-[var(--radius-full)] px-2 py-0.5"
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                background: `color-mix(in srgb, ${plan.color} 15%, transparent)`,
                color: plan.color,
              }}
            >
              Current plan
            </span>
          )}
        </div>
        {isCurrentTier && sub?.status && <StatusBadge status={sub.status} />}
      </div>

      {/* Price */}
      <div>
        <span
          className="font-metric tabular-nums"
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            color: isCurrentTier ? plan.color : "var(--text-primary)",
          }}
        >
          {plan.price.split(" / ")[0]}
        </span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {" "}/ mo
        </span>
      </div>

      {/* Features */}
      <ul className="flex flex-col gap-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle
              size={13}
              style={{
                color: isCurrentTier ? plan.color : "var(--text-muted)",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <span
              style={{
                fontSize: "var(--text-sm)",
                color: isCurrentTier ? "var(--text-secondary)" : "var(--text-muted)",
              }}
            >
              {f}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-auto pt-2">
        {plan.tier === "free" ? (
          isCurrentTier ? (
            <Button variant="ghost" size="sm" fullWidth disabled>
              Free plan
            </Button>
          ) : null
        ) : isCurrentTier ? (
          <Button
            id={`manage-subscription-${plan.tier}`}
            variant="secondary"
            size="sm"
            fullWidth
            loading={loading}
            leftIcon={<ExternalLink size={13} />}
            onClick={handleAction}
          >
            Manage billing
          </Button>
        ) : (
          <Button
            id={`upgrade-to-${plan.tier}`}
            variant="primary"
            size="sm"
            fullWidth
            loading={loading}
            leftIcon={<Lock size={13} />}
            onClick={handleAction}
          >
            Upgrade to {plan.label}
          </Button>
        )}
      </div>

      {/* Renewal info */}
      {isCurrentTier && sub?.currentPeriodEnd && sub.tier !== "free" && (
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          {sub.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
          {new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

/* ─── Section ─────────────────────────────────────────────────────────────── */

export function SubscriptionSection() {
  const { data: sub, loading } = useQuery<Subscription>("/subscription");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const currentTier = sub?.tier ?? "free";

  const handleUpgrade = async (tier: "pro" | "elite") => {
    setCheckoutError(null);
    try {
      const { url } = await subscriptionService.checkout(tier);
      window.location.href = url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Failed to start checkout");
    }
  };

  const handleManage = async () => {
    setCheckoutError(null);
    try {
      const { url } = await subscriptionService.portal();
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Failed to open billing portal");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="280px" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* Placeholder notice */}
      <div
        className="flex items-start gap-2 rounded-[var(--radius-md)] px-4 py-3"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 8%, var(--bg-elevated))",
          border: "1px solid color-mix(in srgb, var(--color-accent) 20%, var(--border-subtle))",
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
        }}
      >
        <Crown size={14} style={{ color: "var(--color-accent)", marginTop: 2, flexShrink: 0 }} />
        <span>
          Billing is managed via Stripe. Upgrade, downgrade, or cancel anytime from the billing portal.
        </span>
      </div>

      {/* Plan cards */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            isCurrentTier={currentTier === plan.tier}
            sub={sub}
            onUpgrade={handleUpgrade}
            onManage={handleManage}
          />
        ))}
      </div>

      {checkoutError && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}>
          {checkoutError}
        </p>
      )}
    </div>
  );
}
