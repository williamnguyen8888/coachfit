"use client";

import { useEffect, useState } from "react";
import { X, Trophy, Activity, Zap, Heart, Clock, AlertCircle, Compass, Flame, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { analysisService } from "@/lib/services/analysis";
import type { CalendarEventAnalysis, StepAnalysis } from "@/lib/services/analysis";
import { useCalendarStore } from "@/stores/calendar.store";
import { useTranslation } from "@/hooks/useTranslation";

interface ActivityAnalysisModalProps {
  eventId: string;
  onClose: () => void;
}

export function ActivityAnalysisModal({ eventId, onClose }: ActivityAnalysisModalProps) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<CalendarEventAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 580);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    async function loadAnalysis() {
      setLoading(true);
      setError(null);
      try {
        const data = await analysisService.getAnalysis(eventId);
        setAnalysis(data);
        // Refresh calendar events to synchronize match score pill on the card
        useCalendarStore.getState().fetchCurrentRange(true);
      } catch (err) {
        console.error("Failed to load match analysis", err);
        setError(t("analysis.errorFallback"));
      } finally {
        setLoading(false);
      }
    }
    loadAnalysis();
  }, [eventId]);

  if (loading) {
    return (
      <div className="modal-backdrop" style={backdropStyle}>
        <div className="modal-container loading-container" style={loadingContainerStyle}>
          <Loader2 size={36} className="animate-spin text-accent" style={{ color: "var(--color-accent)" }} />
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>{t("analysis.analyzing")}</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="modal-backdrop" style={backdropStyle}>
        <div className="modal-container error-container" style={{ ...containerStyle, maxWidth: 420, padding: 24, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <button onClick={onClose} style={closeBtnStyle} aria-label={t("analysis.close")}>
              <X size={18} />
            </button>
          </div>
          <AlertCircle size={40} style={{ color: "var(--color-danger)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>{t("analysis.unavailable")}</h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16 }}>{error}</p>
          <button onClick={onClose} className="btn-accent" style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "var(--color-accent)", color: "white", fontWeight: 600, cursor: "pointer" }}>
            {t("analysis.close")}
          </button>
        </div>
      </div>
    );
  }

  const { title, sport, complianceScore, summary, steps, metrics, coaching } = analysis;
  const ratingColor = complianceScore >= 90 ? "var(--color-success)" : complianceScore >= 75 ? "var(--color-warning)" : "var(--color-danger)";

  const formatDuration = (seconds: number | null) => {
    if (seconds == null || seconds <= 0) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDistance = (meters: number | null) => {
    if (meters == null || meters <= 0) return "--";
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Circular gauge setup
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (complianceScore / 100) * circumference;

  return (
    <div className="modal-backdrop" style={backdropStyle} onClick={(e) => e.currentTarget === e.target && onClose()}>
      <div className="modal-container scrollbar-none" style={containerStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{sport === "cycling" ? "🚴" : sport === "running" ? "🏃" : sport === "swimming" ? "🏊" : "🏋️"}</span>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{title}</h2>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>{t("analysis.reportName")}</p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label={t("analysis.close")}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ ...contentStyle, padding: isMobile ? 12 : 20, gap: isMobile ? 12 : 16 }}>
          
          {/* Circular Score Panel & Coaching Insights */}
          <div style={{ ...topGridStyle, gridTemplateColumns: isMobile ? "1fr" : "130px 1fr", gap: isMobile ? 12 : 16 }}>
            {/* Score Ring */}
            <div style={scoreCardStyle}>
              <div style={{ position: "relative", width: 120, height: 120 }}>
                <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}>
                  {/* Background ring */}
                  <circle cx={60} cy={60} r={radius} fill="transparent" stroke="var(--border-subtle)" strokeWidth={10} />
                  {/* Compliance ring */}
                  <circle
                    cx={60}
                    cy={60}
                    r={radius}
                    fill="transparent"
                    stroke={ratingColor}
                    strokeWidth={10}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease-out-in" }}
                  />
                </svg>
                <div style={scoreCenterTextStyle}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)" }}>{Math.round(complianceScore)}%</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("analysis.match")}</span>
                </div>
              </div>
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: ratingColor, textTransform: "uppercase", background: `${ratingColor}15`, padding: "2px 8px", borderRadius: 12 }}>
                  {coaching.rating}
                </span>
              </div>
            </div>

            {/* Coaching Insights Text Box */}
            <div style={coachingCardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Trophy size={16} style={{ color: "var(--color-warning)" }} />
                <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-primary)" }}>{t("analysis.coachsReport")}</h3>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-secondary)", marginBottom: 8 }}>
                {coaching.summary}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
                <div>• <strong>{t("analysis.pacing")}:</strong> {coaching.pacingFeedback}</div>
                <div>• <strong>{t("analysis.duration")}:</strong> {coaching.durationFeedback}</div>
              </div>
            </div>
          </div>

          {/* Stats/KPIs Comparison Grid */}
          <div style={{ ...kpiGridStyle, gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)" }}>
            <div style={kpiCardStyle}>
              <div style={kpiLabelStyle}><Clock size={12} /> {t("analysis.duration")}</div>
              <div style={kpiValuesStyle}>
                <span className="plan-val" style={planValStyle}>{formatDuration(summary.plannedDuration)}</span>
                <ArrowRight size={10} style={{ color: "var(--text-muted)" }} />
                <span className="act-val" style={actValStyle}>{formatDuration(summary.actualDuration)}</span>
              </div>
              <div style={kpiDiffStyle(summary.durationCompliance)}>
                {summary.durationCompliance >= 95 ? `✓ ${t("analysis.optimal")}` : `${Math.round(summary.durationCompliance)}% ${t("analysis.compliance").toLowerCase()}`}
              </div>
            </div>

            <div style={kpiCardStyle}>
              <div style={kpiLabelStyle}><Compass size={12} /> {t("analysis.distance")}</div>
              <div style={kpiValuesStyle}>
                <span className="plan-val" style={planValStyle}>{formatDistance(summary.plannedDistance)}</span>
                <ArrowRight size={10} style={{ color: "var(--text-muted)" }} />
                <span className="act-val" style={actValStyle}>{formatDistance(summary.actualDistance)}</span>
              </div>
              <div style={kpiDiffStyle(summary.distanceCompliance)}>
                {summary.distanceCompliance >= 95 ? `✓ ${t("analysis.optimal")}` : `${Math.round(summary.distanceCompliance)}% ${t("analysis.compliance").toLowerCase()}`}
              </div>
            </div>

            <div style={kpiCardStyle}>
              <div style={kpiLabelStyle}><Flame size={12} /> {t("analysis.tssLoad")}</div>
              <div style={kpiValuesStyle}>
                <span className="plan-val" style={planValStyle}>{summary.plannedTss.toFixed(0)}</span>
                <ArrowRight size={10} style={{ color: "var(--text-muted)" }} />
                <span className="act-val" style={actValStyle}>{summary.actualTss.toFixed(0)}</span>
              </div>
              <div style={kpiDiffStyle(summary.tssCompliance)}>
                {summary.tssCompliance >= 95 ? `✓ ${t("analysis.optimal")}` : `${Math.round(summary.tssCompliance)}% ${t("analysis.compliance").toLowerCase()}`}
              </div>
            </div>

            <div style={kpiCardStyle}>
              <div style={kpiLabelStyle}><Activity size={12} /> {t("analysis.avgMetric")}</div>
              <div style={kpiValuesStyle}>
                <span className="act-val" style={actValStyle}>
                  {sport === "cycling" ? `${summary.actualAvgIntensity}W` : formatSpeedToPaceStr(summary.actualAvgIntensity, sport)}
                </span>
              </div>
              <span style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{t("analysis.actualAvgPowerPace")}</span>
            </div>
          </div>

          {/* Actionable Tips */}
          <div style={tipsCardStyle}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, textTransform: "uppercase" }}>{t("analysis.recommendations")}</h4>
            <ul style={{ paddingLeft: 16, margin: 0, fontSize: 11.5, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
              {coaching.recommendations.map((tip, idx) => (
                <li key={idx} style={{ listStyleType: "disc" }}>{tip}</li>
              ))}
            </ul>
          </div>

          {/* Step-by-Step Table */}
          <div style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-primary)", marginBottom: 8 }}>{t("analysis.breakdown")}</h3>
            <div style={{ ...tableWrapperStyle, overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderRowStyle}>
                    <th style={{ ...thStyle, width: 40 }}>{t("analysis.step")}</th>
                    <th style={thStyle}>{t("analysis.phaseName")}</th>
                    <th style={thStyle}>{t("analysis.targetValue")}</th>
                    <th style={thStyle}>{t("analysis.planDur")}</th>
                    <th style={thStyle}>{t("analysis.actDur")}</th>
                    <th style={thStyle}>{t("analysis.actAvg")}</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>{t("analysis.compliance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s, idx) => {
                    const stepStatusColor = s.isTargetMet ? "var(--color-success)" : s.stepCompliance >= 55 ? "var(--color-warning)" : "var(--color-danger)";
                    const actualAvgVal = sport === "cycling" && s.actualAvgPower > 0 ? `${s.actualAvgPower}W` : s.actualAvgPaceStr;

                    return (
                      <tr key={idx} style={tableRowStyle(idx)}>
                        <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{s.stepIndex}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: getStepTypeColor(s.stepType) }} />
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</span>
                            </div>
                            {s.heartRateRecovery != null && s.heartRateRecovery > 0 && (
                              <div style={{ fontSize: 9, color: "#f43f5e", fontWeight: 700, marginLeft: 12, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                                <span>❤️</span>
                                <span>HRR: -{s.heartRateRecovery} bpm (1m)</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ background: "var(--bg-input)", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "var(--text-secondary)" }}>
                            {s.targetValueStr}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>{formatDuration(s.plannedDuration)}</td>
                        <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>{formatDuration(s.actualDuration)}</td>
                        <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{actualAvgVal}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: stepStatusColor, background: `${stepStatusColor}15`, padding: "1px 6px", borderRadius: 8 }}>
                            {Math.round(s.stepCompliance)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Time in Zones Stacked Progress Chart */}
          <div style={zonesCardStyle}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, textTransform: "uppercase" }}>{t("analysis.timeInZones")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {metrics.zoneMatches.map((zm) => {
                const zColor = getZoneColor(zm.zone);
                return (
                  <div key={zm.zone} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                      <span style={{ color: "var(--text-primary)" }}>Zone {zm.zone} — {t(`analysis.zone${zm.zone}`)}</span>
                      <span style={{ color: "var(--text-muted)" }}>{t("analysis.plan")}: {zm.plannedPct}% | {t("analysis.act")}: {zm.actualPct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--bg-input)", overflow: "hidden", position: "relative", display: "flex" }}>
                      {/* Plan indicator (dotted or slight color overlay on background) */}
                      <div style={{ position: "absolute", left: 0, width: `${zm.plannedPct}%`, height: "100%", borderRight: "2px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", zIndex: 1 }} />
                      {/* Actual value bar */}
                      <div style={{ width: `${zm.actualPct}%`, height: "100%", background: zColor, zIndex: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Formatting helpers ──────────────────────────────────────────────────────
function formatSpeedToPaceStr(speedMps: number, sport: string): string {
  if (speedMps <= 0.1) return "--:--";
  const isSwimming = sport.toLowerCase() === "swimming";
  const paceSecs = isSwimming ? (100.0 / speedMps) : (1000.0 / speedMps);
  if (paceSecs > 1800) return "--:--";
  const m = Math.floor(paceSecs / 60);
  const s = Math.round(paceSecs % 60);
  return `${m}:${s.toString().padStart(2, "0")}/${isSwimming ? "100m" : "km"}`;
}

// ─── Color mappings ──────────────────────────────────────────────────────────
function getStepTypeColor(type: string): string {
  return switchTypeColor(type);
}

function switchTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "warmup": return "#3b82f6"; // Blue
    case "cooldown": return "#0ea5e9"; // Light blue
    case "rest":
    case "recovery": return "#10b981"; // Recovery green
    case "work": return "#f97316"; // Active orange
    default: return "#8b5cf6"; // Purple
  }
}

function getZoneColor(zone: number): string {
  switch (zone) {
    case 1: return "#9ca3af"; // Recovery gray
    case 2: return "#10b981"; // Aerobic green
    case 3: return "#f59e0b"; // Tempo yellow
    case 4: return "#f97316"; // Threshold orange
    default: return "#ef4444"; // VO2 Max red
  }
}

// ─── CSS-in-JS Styles (Rich aesthetics matching the main dashboard) ──────────
const backdropStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const loadingContainerStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 200,
  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
};

const containerStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 16,
  width: "100%",
  maxWidth: 640,
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)",
  position: "relative",
  animation: "modalFadeIn 0.3s ease-out",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid var(--border-subtle)",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
  padding: 4,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 150ms, color 150ms",
};

const contentStyle: React.CSSProperties = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const topGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "130px 1fr",
  gap: 16,
};

const scoreCardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const scoreCenterTextStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const coachingCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(255,255,255,0.01) 100%)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
};

const kpiGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12,
};

const kpiCardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  padding: 12,
  display: "flex",
  flexDirection: "column",
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 6,
};

const kpiValuesStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 4,
};

const planValStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--text-secondary)",
  fontVariantNumeric: "tabular-nums",
};

const actValStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "var(--text-primary)",
  fontVariantNumeric: "tabular-nums",
};

const kpiDiffStyle = (compliance: number): React.CSSProperties => {
  const isGood = compliance >= 90;
  return {
    fontSize: 10,
    fontWeight: 700,
    color: isGood ? "var(--color-success)" : compliance >= 60 ? "var(--color-warning)" : "var(--color-danger)",
  };
};

const tipsCardStyle: React.CSSProperties = {
  background: "rgba(255, 193, 7, 0.04)",
  border: "1px solid rgba(255, 193, 7, 0.15)",
  borderRadius: 10,
  padding: 12,
};

const tableWrapperStyle: React.CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--bg-surface)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 11.5,
  textAlign: "left",
};

const tableHeaderRowStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-subtle)",
  background: "rgba(255,255,255,0.02)",
};

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  fontSize: 9.5,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "var(--text-secondary)",
};

const tableRowStyle = (idx: number): React.CSSProperties => ({
  borderBottom: "1px solid var(--border-subtle)",
  background: idx % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent",
});

const zonesCardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  padding: 16,
};
