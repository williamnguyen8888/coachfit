// src/lib/api.ts
// Production API client for CoachFit.
//
// Key behaviours (aligned to docs/05-api-design.md + docs/08-auth-model.md):
//   • Attaches Authorization: Bearer <token> on every request automatically
//   • Intercepts 401 → attempts POST /auth/refresh → retries original request once
//   • Special-cases TIER_CHANGED 401 → same refresh→retry flow
//   • Refresh mutex prevents parallel refresh races (multiple concurrent 401s)
//   • Parses backend error envelope: { "error": { "code": "...", "message": "..." } }
//   • Exposes apiUpload() for multipart FIT/TCX/GPX file uploads

import { ApiError, ERROR_CODES } from "./errors";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  isTokenExpired,
} from "./auth";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080") + "/api/v1";

// ─── Refresh mutex ────────────────────────────────────────────────────────────
// Prevents multiple concurrent requests from each triggering their own refresh.

let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeToRefresh(cb: (token: string | null) => void) {
  _refreshSubscribers.push(cb);
}

function notifyRefreshSubscribers(token: string | null) {
  _refreshSubscribers.forEach((cb) => cb(token));
  _refreshSubscribers = [];
}

// ─── Token refresh ────────────────────────────────────────────────────────────

/**
 * Calls POST /auth/refresh.
 * The refresh token lives in an httpOnly cookie — the browser sends it
 * automatically; we never read or write it.
 * Returns the new access token, or null on failure.
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include", // send httpOnly cookie
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { accessToken?: string; token?: string };
    return body.accessToken ?? body.token ?? null;
  } catch {
    return null;
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

type ApiOptions = RequestInit & {
  /** Skip automatic token attachment (used for auth endpoints) */
  skipAuth?: boolean;
  /** Skip the 401 retry (used internally during refresh to avoid loops) */
  skipRetry?: boolean;
};

/**
 * Core fetch wrapper. Throws ApiError on non-2xx responses.
 * All other modules should use this (or apiUpload) — never raw fetch.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth = false, skipRetry = false, ...fetchOptions } = options;

  // ── Proactive token refresh (if within 60s of expiry) ──
  const currentToken = getAccessToken();
  if (!skipAuth && currentToken && isTokenExpired(currentToken)) {
    // Token is about to expire — refresh before the request
    const fresh = await doRefresh();
    if (fresh) setAccessToken(fresh);
    else clearAccessToken();
  }

  // ── Build headers ──
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (typeof window !== "undefined") {
    const locale = localStorage.getItem("cf_locale");
    if (locale) {
      headers["Accept-Language"] = locale;
    }
  }

  const token = skipAuth ? null : getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // ── Execute request ──
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // always include cookies (refresh token)
    ...fetchOptions,
    headers,
  });

  // ── Success ──
  if (res.ok) {
    // 204 No Content
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }

  // ── Parse error body ──
  let errorCode = "UNKNOWN";
  let errorMessage = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    errorCode = body?.error?.code ?? errorCode;
    errorMessage = body?.error?.message ?? errorMessage;
  } catch {
    // ignore parse errors
  }

  // ── 401 handling: refresh + retry ──
  if (res.status === 401 && !skipRetry) {
    const shouldRetry =
      errorCode === ERROR_CODES.UNAUTHORIZED ||
      errorCode === ERROR_CODES.TIER_CHANGED;

    if (shouldRetry) {
      const newToken = await doRefresh();

      if (newToken) {
        setAccessToken(newToken);
        // Retry once with fresh token
        return apiFetch<T>(path, { ...options, skipRetry: true });
      } else {
        // Refresh failed → force logout (store will handle redirect)
        clearAccessToken();
        // Import lazily to avoid circular dependency
        const { useAuthStore } = await import("@/stores/auth.store");
        useAuthStore.getState().handleSessionExpired();
        throw new ApiError(401, errorCode, "Session expired. Please log in again.");
      }
    }
  }

  throw new ApiError(res.status, errorCode, errorMessage);
}

/**
 * Shared refresh logic with mutex — ensures only one refresh runs at a time.
 * All concurrent callers wait for the same refresh promise.
 */
async function doRefresh(): Promise<string | null> {
  if (_isRefreshing) {
    // Already refreshing — wait for result
    return new Promise<string | null>((resolve) => {
      subscribeToRefresh(resolve);
    });
  }

  _isRefreshing = true;
  const newToken = await refreshAccessToken();
  _isRefreshing = false;
  notifyRefreshSubscribers(newToken);
  return newToken;
}

// ─── File upload ──────────────────────────────────────────────────────────────

/**
 * Multipart upload — for FIT/TCX/GPX file ingestion.
 * Does NOT set Content-Type (browser sets it with the correct boundary).
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }

  let errorCode = "UNKNOWN";
  let errorMessage = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    errorCode = body?.error?.code ?? errorCode;
    errorMessage = body?.error?.message ?? errorMessage;
  } catch {
    // ignore
  }

  throw new ApiError(res.status, errorCode, errorMessage);
}

// ─── Convenience method shorthands ───────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: ApiOptions) =>
    apiFetch<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: ApiOptions) =>
    apiFetch<T>(path, { method: "DELETE", ...options }),

  upload: apiUpload,
} as const;

// Re-export for convenience
export { ApiError } from "./errors";
