import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/layout/AuthGuard";

// Authenticated route group layout.
// AuthGuard redirects to /login when the user is not authenticated.
// AppShell renders sidebar (desktop) + bottom tab bar (mobile).
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
