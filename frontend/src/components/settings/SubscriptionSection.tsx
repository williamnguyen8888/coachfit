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
      className="flex flex-col gap-5 rounded-[var(--radius-lg)] p-6 flex-1 min-w-[240px] transition-all duration-300 relative overflow-hidden"
      style={{
        background: isCurrentTier
          ? "var(--bg-elevated)"
          : "rgba(255, 255, 255, 0.01)",
        border: isCurrentTier
          ? "1px solid rgba(255, 255, 255, 0.15)"
          : "1px solid var(--border-subtle)",
        boxShadow: isCurrentTier ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "none",
      }}
    >
      {/* Active Top border highlight strip */}
      {isCurrentTier && (
        <div 
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: "var(--color-accent)",
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-secondary)" }}>
            {plan.icon}
          </span>
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
              className="rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: "rgba(139, 92, 246, 0.1)",
                color: "var(--color-accent)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
              }}
            >
              Current
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
            fontSize: "var(--text-3xl)",
            fontWeight: 800,
            color: "var(--text-primary)",
          }}
        >
          {plan.price.split(" / ")[0]}
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
          {" "}/ month
        </span>
      </div>

      {/* Features list */}
      <ul className="flex flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <CheckCircle
              size={14}
              style={{
                color: isCurrentTier ? "var(--color-accent)" : "var(--text-muted)",
                flexShrink: 0,
                marginTop: 2.5,
              }}
            />
            <span
              style={{
                fontSize: "var(--text-sm)",
                color: isCurrentTier ? "var(--text-secondary)" : "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              {f}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <div className="mt-auto pt-4">
        {plan.tier === "free" ? (
          isCurrentTier ? (
            <Button variant="ghost" size="sm" fullWidth disabled className="border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] text-[var(--text-muted)]">
              Free plan active
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
            className="bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)] text-[var(--text-primary)] font-semibold"
          >
            Manage billing
          </Button>
        ) : (
          <button
            id={`upgrade-to-${plan.tier}`}
            disabled={loading}
            onClick={handleAction}
            className="w-full h-9 px-4 rounded-[var(--radius-md)] flex items-center justify-center gap-1.5 text-sm font-semibold active:scale-[0.985] transition-all cursor-pointer bg-white text-black hover:bg-neutral-200 border-none"
          >
            <Lock size={13} />
            Upgrade to {plan.label}
          </button>
        )}
      </div>

      {/* Renewal info */}
      {isCurrentTier && sub?.currentPeriodEnd && sub.tier !== "free" && (
        <p
          className="mt-1"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          {sub.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
          {new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
            month: "short",
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
