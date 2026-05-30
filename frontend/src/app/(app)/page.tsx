import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata = {
  title: "Dashboard — CoachFit",
  description:
    "Your training hub: morning briefing, today's workout, health snapshot, weekly summary, and fitness trend.",
};

export default function DashboardPage() {
  return (
    <div className="flex-1 min-h-0">
      <DashboardClient />
    </div>
  );
}
