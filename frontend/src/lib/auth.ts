// src/lib/auth.ts — Auth utilities placeholder (full impl in F03)

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("coachfit:access_token");
}

export function setAccessToken(token: string): void {
  localStorage.setItem("coachfit:access_token", token);
}

export function clearTokens(): void {
  localStorage.removeItem("coachfit:access_token");
  localStorage.removeItem("coachfit:refresh_token");
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
