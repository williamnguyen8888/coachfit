"use client";

import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";

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
    <div className="flex flex-col gap-4 p-4 border-b border-border-subtle bg-bg-surface/10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle/50 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">💬</span>
          <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider m-0">
            Feedback & RPE
          </h2>
        </div>
        <div className="text-[9px] uppercase font-bold tracking-wider text-text-muted">
          Sport: <span className="text-accent">{sport}</span>
        </div>
      </div>

      {/* Content Stack */}
      <div className="flex flex-col gap-4">
        {/* Athlete Feel */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-text-muted uppercase">Athlete Feeling:</span>
          <div className="flex gap-1">
            {FEEL_EMOJIS.map((f) => {
              const isActive = selectedFeel === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setSelectedFeel(f.value)}
                  className="flex flex-col items-center gap-1 flex-1 cursor-pointer transition-all duration-150 rounded-md py-1 px-0.5 text-base hover:bg-bg-elevated"
                  style={{
                    background: isActive ? "var(--bg-input)" : "transparent",
                    border: isActive ? `1.5px solid ${f.color}` : "1px solid transparent",
                  }}
                  title={f.label}
                >
                  <span>{f.emoji}</span>
                  <span className="text-[8px] font-semibold text-text-muted">
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RPE Exertion */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-text-muted uppercase">
            <span>Perceived Exertion (RPE):</span>
            <span className="font-mono text-xs text-accent">{rpe} / 10</span>
          </div>
          
          <input
            type="range"
            min="1"
            max="10"
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="w-full h-1 bg-bg-input rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          
          <span style={{ fontSize: "10px", fontStyle: "italic", color: "var(--text-muted)" }}>
            Effort: <strong className="text-text-secondary">{getRpeDescription(rpe)}</strong>
          </span>
        </div>

        {/* Coach Insights */}
        <div className="flex flex-col gap-1.5 border-t border-border-subtle/30 pt-3">
          <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1">
            <MessageSquare size={12} className="text-accent" />
            Coach Analysis & Insights:
          </span>
          <div 
            className="bg-bg-elevated/70 border border-border-subtle rounded-md p-2.5 text-xs leading-relaxed text-text-secondary italic"
            style={{ minHeight: "60px" }}
          >
            {coachSavedNote ? (
              `"${coachSavedNote}"`
            ) : (
              <span className="text-text-muted">Chưa có phản hồi nào từ Coach.</span>
            )}
          </div>
        </div>

        {/* Leave Coach Comment */}
        <div className="flex items-center gap-1.5">
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
              padding: "6px 8px",
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
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <Send size={10} />
            <span>Gửi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
