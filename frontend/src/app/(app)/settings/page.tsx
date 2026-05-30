// src/app/(app)/settings/page.tsx
// Settings page route — delegates to SettingsPageClient for all interaction.

import { SettingsPageClient } from "@/components/settings/SettingsPageClient";

export const metadata = {
  title: "Settings | CoachFit",
  description: "Manage your athlete profile, training zones, connected accounts, API keys, and subscription.",
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
