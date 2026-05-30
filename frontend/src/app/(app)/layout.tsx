import { AppShell } from "@/components/layout/AppShell";

// This layout wraps all authenticated app pages with the app shell
// (sidebar on desktop, bottom tab bar on mobile).
// Auth guard is added in F03.
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
