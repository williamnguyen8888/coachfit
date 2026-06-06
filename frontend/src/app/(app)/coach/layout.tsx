// src/app/(app)/coach/layout.tsx
// Coach-only route group layout. Accessible only when user has coach or admin role.
// The role check is handled client-side by the coach page since
// we are using client-side auth state (JWT in memory, no server session).

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
