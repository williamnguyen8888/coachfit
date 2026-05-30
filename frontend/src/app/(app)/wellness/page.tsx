import { WellnessPage } from "@/components/wellness/WellnessPageClient";

export const metadata = {
  title: "Wellness Check-in — CoachFit",
  description:
    "Log your daily mood, RPE, fatigue, sleep quality, and more to help optimise your training load.",
};

export default function WellnessRoute() {
  return (
    <div className="flex-1 min-h-0">
      <WellnessPage />
    </div>
  );
}
