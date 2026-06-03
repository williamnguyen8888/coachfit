"use client";

import { useEffect, useState } from "react";
import { X, Activity, Heart, Clock, AlertCircle, Compass, Flame, CheckCircle, ArrowRight, Loader2, ArrowUp, ArrowDown, Check } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<'overview' | 'intervals' | 'zones'>('overview');

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
  }, [eventId, t]);

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

  const { title, sport, complianceScore, summary, steps, metrics } = analysis;
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

  // Count steps met
  const intervalsMet = steps.filter(s => s.isTargetMet).length;
  const totalIntervals = steps.length;

  // Target intensity bar rendering
  const renderIntensityBar = (targetStr: string, actualPower: number, actualHr: number, targetType: string) => {
    if (!targetStr || !targetType || targetType === 'open' || targetType === 'rpe' || targetType === 'cadence') {
      return <span style={{ color: "var(--text-muted)", fontSize: 10 }}>--</span>;
    }

    const isPower = targetType.startsWith('power') || targetType.includes('power');
    const isHr = targetType.startsWith('hr') || targetType.includes('hr');
    
    let actVal = 0;
    if (isPower) actVal = actualPower;
    else if (isHr) actVal = actualHr;

    if (actVal <= 0) {
      return <span style={{ color: "var(--text-muted)", fontSize: 10 }}>--</span>;
    }

    const cleanTarget = targetStr.replace(/[Wbpms\/km]/g, '').trim();
    if (cleanTarget.includes('-')) {
      const parts = cleanTarget.split('-');
      const targetMin = parseFloat(parts[0]);
      const targetMax = parseFloat(parts[1]);
      if (!isNaN(targetMin) && !isNaN(targetMax) && targetMin > 0 && targetMax > 0) {
        const scaleMin = 0.6 * targetMin;
        const scaleMax = 1.4 * targetMax;
        const range = scaleMax - scaleMin;
        if (range > 0) {
          const startPct = ((targetMin - scaleMin) / range) * 100;
          const endPct = ((targetMax - scaleMin) / range) * 100;
          const widthPct = endPct - startPct;
          const actualPct = Math.max(0, Math.min(100, ((actVal - scaleMin) / range) * 100));

          const isOptimal = actVal >= targetMin && actVal <= targetMax;
          const barColor = isOptimal ? "var(--color-success)" : actVal < targetMin ? "var(--color-warning)" : "var(--color-danger)";

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 85, marginTop: 4 }}>
              <div style={{ height: 4, background: "var(--bg-input)", borderRadius: 2, position: "relative" }}>
                <div style={{ position: "absolute", left: `${startPct}%`, width: `${widthPct}%`, height: "100%", background: "rgba(16, 185, 129, 0.25)", borderRadius: 1 }} />
                <div style={{ position: "absolute", left: `calc(${actualPct}% - 3px)`, top: -1, width: 6, height: 6, borderRadius: "50%", background: barColor, border: "1px solid #fff" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--text-muted)" }}>
                <span>{Math.round(targetMin)}</span>
                <span style={{ color: barColor, fontWeight: 700 }}>{Math.round(actVal)}</span>
                <span>{Math.round(targetMax)}</span>
              </div>
            </div>
          );
        }
      }
    }
    return <span style={{ color: "var(--text-muted)", fontSize: 10 }}>--</span>;
  };

  // Duration progress rendering
  const renderDurationBar = (planned: number, actual: number) => {
    if (planned <= 0) return <span style={{ color: "var(--text-muted)", fontSize: 10 }}>--</span>;
    const actualVal = actual || 0;
    const maxDur = Math.max(planned, actualVal);
    const plannedPct = (planned / maxDur) * 100;
    const actualPct = (actualVal / maxDur) * 100;
    const ratio = actualVal / planned;
    const isMatch = ratio >= 0.9 && ratio <= 1.1;
    const barColor = isMatch ? "var(--color-success)" : actualVal < planned ? "var(--color-warning)" : "var(--color-danger)";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 85, marginTop: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={{ height: 2, background: "var(--border-subtle)", borderRadius: 1 }}>
            <div style={{ width: `${plannedPct}%`, height: "100%", background: "var(--text-muted)" }} />
          </div>
          <div style={{ height: 3, background: "var(--bg-input)", borderRadius: 1.5 }}>
            <div style={{ width: `${actualPct}%`, height: "100%", background: barColor }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--text-muted)" }}>
          <span>KH: {formatDuration(planned)}</span>
          <span style={{ color: barColor, fontWeight: 700 }}>TT: {formatDuration(actualVal)}</span>
        </div>
      </div>
    );
  };

  // Tab 1 rendering: Overall Metrics Summary
  const renderOverviewTab = () => {
    const getStatusText = (compliance: number, actual: number | null, planned: number) => {
      if (actual == null || actual <= 0) return { text: "Chưa tập", color: "var(--text-muted)" };
      if (compliance >= 90 && compliance <= 110) return { text: "Tối ưu", color: "var(--color-success)" };
      if (actual < planned) return { text: "Dưới KH", color: "var(--color-warning)" };
      return { text: "Vượt KH", color: "var(--color-danger)" };
    };

    const rows = [
      {
        name: "Thời lượng (Duration)",
        icon: <Clock size={14} />,
        planned: formatDuration(summary.plannedDuration),
        actual: formatDuration(summary.actualDuration),
        compliance: summary.durationCompliance,
        status: getStatusText(summary.durationCompliance, summary.actualDuration, summary.plannedDuration),
      },
      {
        name: "Quãng đường (Distance)",
        icon: <Compass size={14} />,
        planned: formatDistance(summary.plannedDistance),
        actual: formatDistance(summary.actualDistance),
        compliance: summary.distanceCompliance,
        status: getStatusText(summary.distanceCompliance, summary.actualDistance ? Math.round(summary.actualDistance) : 0, Math.round(summary.plannedDistance)),
      },
      {
        name: "Khối lượng TSS (Load)",
        icon: <Flame size={14} />,
        planned: `${summary.plannedTss.toFixed(0)}`,
        actual: `${summary.actualTss.toFixed(0)}`,
        compliance: summary.tssCompliance,
        status: getStatusText(summary.tssCompliance, Math.round(summary.actualTss), Math.round(summary.plannedTss)),
      },
      {
        name: "Cường độ TB (Intensity)",
        icon: <Activity size={14} />,
        planned: sport === "cycling" ? "Zone 2-3" : "Vùng hiếu khí",
        actual: sport === "cycling" ? `${summary.actualAvgIntensity}W` : formatSpeedToPaceStr(summary.actualAvgIntensity, sport),
        compliance: summary.intensityCompliance,
        status: getStatusText(summary.intensityCompliance, summary.actualAvgIntensity, 70),
      },
    ];

    return (
      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={thStyle}>Chỉ số chính</th>
              <th style={thStyle}>Kế hoạch</th>
              <th style={thStyle}>Thực tế</th>
              <th style={thStyle}>Tỷ lệ đạt</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={tableRowStyle(idx)}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                    {row.icon}
                    <span>{row.name}</span>
                  </div>
                </td>
                <td style={tdStyle}>{row.planned}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: "var(--text-primary)" }}>{row.actual}</td>
                <td style={tdStyle}>
                  <span style={{
                    color: row.compliance >= 90 ? "var(--color-success)" : row.compliance >= 60 ? "var(--color-warning)" : "var(--color-danger)",
                    fontWeight: 800,
                  }}>
                    {Math.round(row.compliance)}%
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: row.status.color,
                    background: `${row.status.color}15`,
                    padding: "2px 8px",
                    borderRadius: 12,
                  }}>
                    {row.status.text}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Tab 2 rendering: Detailed Interval Steps
  const renderIntervalsTab = () => {
    return (
      <div style={{ ...tableWrapperStyle, overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={{ ...thStyle, width: 30 }}>#</th>
              <th style={thStyle}>Khoảng tập</th>
              <th style={thStyle}>Mục tiêu</th>
              <th style={thStyle}>Thực tế (CĐ)</th>
              {!isMobile && <th style={thStyle}>Thời lượng KH</th>}
              {!isMobile && <th style={thStyle}>Thời lượng TT</th>}
              <th style={thStyle}>Đạt KH</th>
              <th style={thStyle}>Đạt CĐ</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Khớp chung</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, idx) => {
              const stepStatusColor = s.isTargetMet ? "var(--color-success)" : s.stepCompliance >= 55 ? "var(--color-warning)" : "var(--color-danger)";
              const durStatusColor = s.durationCompliance >= 90 ? "var(--color-success)" : s.durationCompliance >= 60 ? "var(--color-warning)" : "var(--color-danger)";
              const intStatusColor = s.intensityCompliance >= 90 ? "var(--color-success)" : s.intensityCompliance >= 60 ? "var(--color-warning)" : "var(--color-danger)";
              const actualAvgVal = sport === "cycling" && s.actualAvgPower > 0 ? `${s.actualAvgPower}W` : s.actualAvgPaceStr;

              const dev = getStepDeviation(s.targetValueStr, s.actualAvgPower, s.actualAvgHr, s.targetType);
              let devIcon = null;
              if (dev === 'under') {
                devIcon = <span title="Thấp hơn mục tiêu" style={{ display: "inline-flex", alignItems: "center" }}><ArrowDown size={11} style={{ color: "var(--color-warning)", marginLeft: 4 }} /></span>;
              } else if (dev === 'over') {
                devIcon = <span title="Vượt mục tiêu" style={{ display: "inline-flex", alignItems: "center" }}><ArrowUp size={11} style={{ color: "var(--color-danger)", marginLeft: 4 }} /></span>;
              } else if (dev === 'in-zone') {
                devIcon = <span title="Đúng mục tiêu" style={{ display: "inline-flex", alignItems: "center" }}><Check size={11} style={{ color: "var(--color-success)", marginLeft: 4 }} /></span>;
              }

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
                  <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {actualAvgVal}
                      {devIcon}
                    </span>
                  </td>
                  {!isMobile && <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>{formatDuration(s.plannedDuration)}</td>}
                  {!isMobile && <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>{formatDuration(s.actualDuration)}</td>}
                  <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", fontWeight: 700, color: durStatusColor }}>
                    {Math.round(s.durationCompliance)}%
                  </td>
                  <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", fontWeight: 700, color: intStatusColor }}>
                    {Math.round(s.intensityCompliance)}%
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: stepStatusColor, background: `${stepStatusColor}15`, padding: "2px 6px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      {s.isTargetMet ? (
                        <CheckCircle size={10} style={{ color: "var(--color-success)" }} />
                      ) : s.stepCompliance >= 55 ? (
                        <AlertCircle size={10} style={{ color: "var(--color-warning)" }} />
                      ) : (
                        <AlertCircle size={10} style={{ color: "var(--color-danger)" }} />
                      )}
                      {Math.round(s.stepCompliance)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Tab 3 rendering: Zones Distribution match
  const renderZonesTab = () => {
    return (
      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={thStyle}>Vùng cường độ (Zones)</th>
              <th style={thStyle}>Kế hoạch %</th>
              <th style={thStyle}>Thực tế %</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Sai lệch</th>
            </tr>
          </thead>
          <tbody>
            {metrics.zoneMatches.map((zm) => {
              const zColor = getZoneColor(zm.zone);
              const diff = zm.actualPct - zm.plannedPct;
              const diffText = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
              const isMatch = Math.abs(diff) <= 5.0;
              const diffColor = isMatch ? "var(--color-success)" : diff > 0 ? "var(--color-danger)" : "var(--color-warning)";

              return (
                <tr key={zm.zone} style={tableRowStyle(zm.zone - 1)}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: zColor }} />
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                        Zone {zm.zone} — {t(`analysis.zone${zm.zone}`)}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>{zm.plannedPct}%</td>
                  <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--text-primary)" }}>{zm.actualPct}%</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: diffColor }}>
                    {diffText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

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
          
          {/* Performance Matching Summary Header */}
          <div style={summaryPanelStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexDirection: isMobile ? "column" : "row", textAlign: isMobile ? "center" : "left" }}>
              {/* Score Ring */}
              <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
                <svg width={100} height={100} style={{ transform: "rotate(-90deg)" }}>
                  <circle cx={50} cy={50} r={40} fill="transparent" stroke="var(--border-subtle)" strokeWidth={8} />
                  <circle
                    cx={50}
                    cy={50}
                    r={40}
                    fill="transparent"
                    stroke={ratingColor}
                    strokeWidth={8}
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 - (complianceScore / 100) * (2 * Math.PI * 40)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease-out-in" }}
                  />
                </svg>
                <div style={scoreCenterTextStyle}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>{Math.round(complianceScore)}%</span>
                  <span style={{ fontSize: 7, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>MATCH</span>
                </div>
              </div>

              {/* Quick Objective Stats */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Độ khớp bài tập (Compliance Analysis)
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 4, justifyContent: isMobile ? "center" : "flex-start" }}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    • Khoảng tập hoàn thành: <strong style={{ color: "var(--text-primary)" }}>{intervalsMet}/{totalIntervals} bước</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    • Thời lượng đạt: <strong style={{ color: "var(--text-primary)" }}>{Math.round(summary.durationCompliance)}%</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    • Cường độ đạt: <strong style={{ color: "var(--text-primary)" }}>{Math.round(summary.intensityCompliance)}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selection Navigation */}
          <div style={tabContainerStyle}>
            <button onClick={() => setActiveTab('overview')} style={tabBtnStyle(activeTab === 'overview')}>
              Tổng quan chỉ số
            </button>
            <button onClick={() => setActiveTab('intervals')} style={tabBtnStyle(activeTab === 'intervals')}>
              Chi tiết bước tập ({totalIntervals} khoảng)
            </button>
            <button onClick={() => setActiveTab('zones')} style={tabBtnStyle(activeTab === 'zones')}>
              Phân bố vùng tập luyện
            </button>
          </div>

          {/* Active Tab Table Component */}
          <div style={{ minHeight: 200 }}>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'intervals' && renderIntervalsTab()}
            {activeTab === 'zones' && renderZonesTab()}
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

function getStepDeviation(targetStr: string, actualPower: number, actualHr: number, targetType: string): 'under' | 'over' | 'in-zone' | 'none' {
  if (!targetStr || !targetType || targetType === 'open' || targetType === 'rpe' || targetType === 'cadence') {
    return 'none';
  }

  const isPower = targetType.startsWith('power') || targetType.includes('power');
  const isHr = targetType.startsWith('hr') || targetType.includes('hr');
  
  let actVal = 0;
  if (isPower) actVal = actualPower;
  else if (isHr) actVal = actualHr;

  if (actVal <= 0) return 'none';

  const cleanTarget = targetStr.replace(/[Wbpms\/km]/g, '').trim();
  if (cleanTarget.includes('-')) {
    const parts = cleanTarget.split('-');
    const targetMin = parseFloat(parts[0]);
    const targetMax = parseFloat(parts[1]);
    if (!isNaN(targetMin) && !isNaN(targetMax)) {
      if (actVal < targetMin) return 'under';
      if (actVal > targetMax) return 'over';
      return 'in-zone';
    }
  }
  return 'none';
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
const summaryPanelStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(255,255,255,0.01) 100%)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
};

const tabContainerStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid var(--border-subtle)",
  gap: 16,
  marginBottom: 12,
  paddingBottom: 4,
};

const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
  background: "none",
  border: "none",
  borderBottom: isActive ? "2.5px solid var(--color-accent)" : "2.5px solid transparent",
  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
  padding: "8px 4px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  transition: "all 0.15s ease",
});

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
  maxWidth: 700,
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
