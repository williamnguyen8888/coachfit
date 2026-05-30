// src/lib/auth.ts
// In-memory access token store + JWT decode utilities.
//
// IMPORTANT — storage rules (from docs/08-auth-model.md):
//   • Access token → frontend memory ONLY (never localStorage / sessionStorage)
//   • Refresh token → httpOnly secure cookie (set by backend, never touched here)
//
// The token lives in a module-level variable so it survives React re-renders but
// is wiped on a full page refresh. On refresh the app calls initAuth() which
// silently re-authenticates via the refresh-token cookie.

/** Shape of the CoachFit JWT payload */
export interface JwtPayload {
  sub: string; // user UUID
  email: string;
  role: "athlete" | "coach" | "admin";
  tier: "free" | "pro" | "elite" | "coach";
  iat: number;
  exp: number;
}

// ─── Module-level token store ────────────────────────────────────────────────

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string): void {
  _accessToken = token;
}

export function clearAccessToken(): void {
  _accessToken = null;
}

// ─── JWT utilities ───────────────────────────────────────────────────────────

/**
 * Decode the JWT payload without signature verification.
 * (Backend validates the signature on every request — we only decode for UI state.)
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64-url → base64 → decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true when the token is expired or within the buffer window.
 * Buffer = 60 seconds — triggers proactive refresh before the server rejects.
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - nowSeconds < bufferSeconds;
}

/**
 * Returns true when a valid, non-expired access token is in memory.
 */
export function hasValidToken(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return !isTokenExpired(token);
}
