"use client";

import { useState } from "react";
import { Smile, Frown, Award, Send, MessageSquare, Flame } from "lucide-react";

interface SubjectiveFeedbackCardProps {
  sport: string;
}

const FEEL_EMOJIS = [
  { value: "exhausted", emoji: "😫", label: "Exhausted", color: "var(--color-danger)" },
  { value: "tired", emoji: "🥱", label: "Tired", color: "var(--color-accent)" },
  { value: "average", emoji: "😐", label: "Average", color: "var(--text-muted)" },
  { value: "good", emoji: "😃", label: "Good", color: "var(--color-success)" },
  { value: "great", emoji: "🚀", label: "Great", color: "var(--color-fitness)" },
];

export function SubjectiveFeedbackCard({ sport }: SubjectiveFeedbackCardProps) {
  const [rpe, setRpe] = useState<number>(6);
  const [selectedFeel, setSelectedFeel] = useState<string>("average");
  const [coachNote, setCoachNote] = useState<string>("");
  const [coachSavedNote, setCoachSavedNote] = useState<string>(
    "Chỉ số nhịp tim hồi phục (HR Recovery) khá tốt sau bài biến tốc thứ 3. Em hãy cố gắng giữ đều nhịp chân (cadence) ở bài chạy dài cuối tuần nhé!"
  );

  const getRpeDescription = (val: number) => {
    if (val <= 2) return "Rất nhẹ nhàng (Active Recovery)";
    if (val <= 4) return "Vừa phải (Aerobic Endurance)";
    if (val <= 6) return "Khá mệt (Tempo / Sweet Spot)";
    if (val <= 8) return "Rất mệt (Lactate Threshold)";
    return "Kiệt sức (Anaerobic / VO2 Max)";
  };

  const handleSaveCoachNote = () => {
    if (!coachNote.trim()) return;
    setCoachSavedNote(coachNote);
    setCoachNote("");
  };

  return (
    <div 
      className="bg-bg-surface border border-border-subtle rounded-lg sm:rounded-xl p-3.5 sm:p-5 shadow-sm sm:shadow-lg flex flex-col gap-4"
      style={{
        background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(124, 58, 237, 0.03) 100%)"
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💬</span>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Athlete Subjective & Coach Feedback
          </h2>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
          Sport: <span className="text-color-accent">{sport}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Athlete Input */}
        <div className="lg:col-span-6 flex flex-col gap-4 border-r-0 lg:border-r border-border-subtle lg:pr-5">
          {/* Athlete Feel */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-text-muted uppercase">Athlete Feeling:</span>
            <div className="flex gap-1.5 sm:gap-2">
              {FEEL_EMOJIS.map((f) => {
                const isActive = selectedFeel === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setSelectedFeel(f.value)}
                    className="flex flex-col items-center gap-1 flex-1 cursor-pointer transition-all duration-150 rounded-md py-1.5 px-0.5 sm:py-2.5 sm:px-3 text-base sm:text-lg"
                    style={{
                      background: isActive ? "var(--bg-elevated)" : "transparent",
                      border: isActive ? `1.5px solid ${f.color}` : "1px solid var(--border-default)",
                    }}
                    title={f.label}
                  >
                    <span>{f.emoji}</span>
                    <span className="text-[8px] sm:text-[9px] font-semibold text-[var(--text-secondary)]">
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RPE Exertion */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[11px] font-bold text-text-muted uppercase">
              <span>Rate of Perceived Exertion (RPE):</span>
              <span className="font-mono text-xs text-color-accent">{rpe} / 10</span>
            </div>
            
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="w-full h-1.5 bg-bg-input rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>
            
            <span style={{ fontSize: "10.5px", fontStyle: "italic", color: "var(--text-muted)" }}>
              Effort: <strong className="text-text-secondary">{getRpeDescription(rpe)}</strong>
            </span>
          </div>
        </div>

        {/* Right Column: Coach Insights */}
        <div className="lg:col-span-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold text-text-muted uppercase flex items-center gap-1">
              <MessageSquare size={13} className="text-color-accent" />
              Coach Analysis & Insights:
            </span>
            <div 
              className="bg-bg-elevated/70 border border-border-subtle rounded-lg p-3 text-xs leading-relaxed text-text-secondary italic"
              style={{ minHeight: "68px" }}
            >
              {coachSavedNote ? (
                `"${coachSavedNote}"`
              ) : (
                <span className="text-text-muted">Chưa có phản hồi nào từ Huấn luyện viên cho bài tập này.</span>
              )}
            </div>
          </div>

          {/* Leave Coach Comment */}
          <div className="flex items-center gap-2">
            <textarea
              placeholder="Gửi nhận xét từ Coach..."
              value={coachNote}
              onChange={(e) => setCoachNote(e.target.value)}
              rows={1}
              style={{
                flex: 1,
                background: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                color: "var(--text-primary)",
                fontSize: "11px",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleSaveCoachNote}
              style={{
                background: "var(--color-accent)",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Send size={11} />
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
