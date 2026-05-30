"use client";
// src/components/settings/ProfileSection.tsx
// Athlete profile settings — name, sport preferences, body stats, unit system.
// API: GET /athlete · PUT /athlete

import React, { useEffect, useState, useCallback } from "react";
import { useQuery } from "@/hooks/useQuery";
import { athleteService } from "@/lib/services/settings";
import { Button } from "@/components/ui/Button";
import { Input, InputGroup } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  User,
  Save,
  RefreshCw,
  CheckCircle,
  Mail,
  Shield,
} from "lucide-react";
import type {
  AthleteProfile,
  AthleteProfileUpdateRequest,
  Sport,
  ExperienceLevel,
  Gender,
  UnitSystem,
} from "@/lib/types/settings";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const ALL_SPORTS: { value: Sport; label: string; emoji: string }[] = [
  { value: "cycling", label: "Cycling", emoji: "🚴" },
  { value: "running", label: "Running", emoji: "🏃" },
  { value: "swimming", label: "Swimming", emoji: "🏊" },
  { value: "strength", label: "Strength", emoji: "🏋️" },
  { value: "other", label: "Other", emoji: "⚡" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "elite", label: "Elite" },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "var(--space-3)",
      }}
    >
      {children}
    </h3>
  );
}

function SportToggle({
  sport,
  selected,
  onChange,
}: {
  sport: (typeof ALL_SPORTS)[number];
  selected: boolean;
  onChange: (s: Sport, on: boolean) => void;
}) {
  return (
    <button
      type="button"
      id={`sport-toggle-${sport.value}`}
      aria-pressed={selected}
      onClick={() => onChange(sport.value, !selected)}
      className="flex flex-col items-center gap-1 px-3 py-2 rounded-[var(--radius-md)] transition-all duration-150 cursor-pointer border"
      style={{
        background: selected
          ? "color-mix(in srgb, var(--color-accent) 15%, var(--bg-surface))"
          : "var(--bg-input)",
        borderColor: selected ? "var(--color-accent)" : "var(--border-default)",
        color: selected ? "var(--color-accent)" : "var(--text-secondary)",
        minWidth: 72,
      }}
    >
      <span style={{ fontSize: 20 }}>{sport.emoji}</span>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
        {sport.label}
      </span>
    </button>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <label
        htmlFor={id}
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-[var(--radius-sm)] border px-3 appearance-none"
        style={{
          background: "var(--bg-input)",
          borderColor: "var(--border-default)",
          color: value ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: "var(--text-base)",
          outline: "none",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Profile form state ────────────────────────────────────────────────────── */

interface FormState {
  fullName: string;
  sports: Sport[];
  primarySport: Sport | "";
  experienceLevel: ExperienceLevel | "";
  weightKg: string;
  gender: Gender | "";
  units: UnitSystem;
  timezone: string;
}

function profileToForm(p: AthleteProfile): FormState {
  return {
    fullName: p.fullName ?? "",
    sports: p.profile?.sports ?? [],
    primarySport: p.profile?.primarySport ?? "",
    experienceLevel: p.profile?.experienceLevel ?? "",
    weightKg: p.profile?.weightKg != null ? String(p.profile.weightKg) : "",
    gender: p.profile?.gender ?? "",
    units: p.settings?.units ?? "metric",
    timezone: p.settings?.timezone ?? "",
  };
}

function formToRequest(f: FormState): AthleteProfileUpdateRequest {
  return {
    fullName: f.fullName || undefined,
    profile: {
      sports: f.sports,
      primarySport: (f.primarySport as Sport) || null,
      experienceLevel: (f.experienceLevel as ExperienceLevel) || null,
      weightKg: f.weightKg ? parseFloat(f.weightKg) : null,
      gender: (f.gender as Gender) || null,
    },
    settings: {
      units: f.units,
      timezone: f.timezone || undefined,
    },
  };
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export function ProfileSection() {
  const { data: profile, loading } = useQuery<AthleteProfile>("/athlete");

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hydrate form when profile loads
  useEffect(() => {
    if (profile && !form) setForm(profileToForm(profile));
  }, [profile, form]);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => (f ? { ...f, [key]: value } : f));
      setSaved(false);
    },
    [],
  );

  const handleSportToggle = useCallback((sport: Sport, on: boolean) => {
    setForm((f) => {
      if (!f) return f;
      const sports = on
        ? [...f.sports, sport]
        : f.sports.filter((s) => s !== sport);
      return {
        ...f,
        sports,
        // Clear primary if deselected
        primarySport:
          !on && f.primarySport === sport ? "" : f.primarySport,
      };
    });
    setSaved(false);
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaveError(null);
    try {
      await athleteService.updateProfile(formToRequest(form));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save profile";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Skeleton ── */
  if (loading || !form) {
    return (
      <div className="flex flex-col gap-[var(--space-5)]">
        <Skeleton height="20px" width="40%" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-4)]">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="60px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      {/* Identity (read-only hints) */}
      {profile && (
        <div
          className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {/* Avatar placeholder */}
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 48,
              height: 48,
              background:
                "linear-gradient(135deg, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 60%, var(--color-fitness)) 100%)",
              fontSize: 20,
              color: "white",
              fontWeight: 700,
            }}
          >
            {profile.fullName?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              style={{
                fontSize: "var(--text-base)",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {profile.fullName ?? "—"}
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="flex items-center gap-1"
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                <Mail size={11} />
                {profile.email}
              </span>
              <span
                className="flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5"
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  background:
                    "color-mix(in srgb, var(--color-accent) 15%, transparent)",
                  color: "var(--color-accent)",
                  border: "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)",
                }}
              >
                <Shield size={10} />
                {profile.tier.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Basic info */}
      <div>
        <SectionTitle>Basic Information</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-4)]">
          <InputGroup label="Full name" htmlFor="profile-fullname">
            <Input
              id="profile-fullname"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Your full name"
              leftAdornment={<User size={14} />}
            />
          </InputGroup>

          <SelectField
            id="profile-units"
            label="Units"
            value={form.units}
            onChange={(v) => set("units", v as UnitSystem)}
            options={[
              { value: "metric", label: "Metric (kg, km)" },
              { value: "imperial", label: "Imperial (lbs, mi)" },
            ]}
          />

          <InputGroup
            label={`Weight (${form.units === "imperial" ? "lbs" : "kg"})`}
            htmlFor="profile-weight"
          >
            <Input
              id="profile-weight"
              type="number"
              min={20}
              max={300}
              step={0.5}
              value={form.weightKg}
              onChange={(e) => set("weightKg", e.target.value)}
              placeholder={form.units === "imperial" ? "e.g. 160" : "e.g. 72.5"}
            />
          </InputGroup>

          <SelectField
            id="profile-gender"
            label="Gender"
            value={form.gender}
            onChange={(v) => set("gender", v as Gender)}
            options={GENDERS}
            placeholder="Select…"
          />
        </div>
      </div>

      {/* Sports */}
      <div>
        <SectionTitle>Sports</SectionTitle>
        <div className="flex flex-wrap gap-2 mb-[var(--space-4)]">
          {ALL_SPORTS.map((s) => (
            <SportToggle
              key={s.value}
              sport={s}
              selected={form.sports.includes(s.value)}
              onChange={handleSportToggle}
            />
          ))}
        </div>

        {form.sports.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-4)]">
            <SelectField
              id="profile-primary-sport"
              label="Primary sport"
              value={form.primarySport}
              onChange={(v) => set("primarySport", v as Sport)}
              options={ALL_SPORTS.filter((s) =>
                form.sports.includes(s.value),
              ).map((s) => ({ value: s.value, label: s.label }))}
              placeholder="Select…"
            />
            <SelectField
              id="profile-experience"
              label="Experience level"
              value={form.experienceLevel}
              onChange={(v) => set("experienceLevel", v as ExperienceLevel)}
              options={EXPERIENCE_LEVELS}
              placeholder="Select…"
            />
          </div>
        )}
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3">
        <Button
          id="profile-save-btn"
          variant="primary"
          size="md"
          loading={saving}
          leftIcon={saved ? <CheckCircle size={15} /> : <Save size={15} />}
          onClick={handleSave}
        >
          {saved ? "Saved" : "Save profile"}
        </Button>
        {saveError && (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}>
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}
