// src/lib/api.ts — API client placeholder (wired in F03)
// This stub keeps the import path stable for other modules.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const error = await res.text();
      return { error, status: res.status };
    }
    const data = await res.json();
    return { data, status: res.status };
  } catch (err) {
    return { error: String(err), status: 0 };
  }
}
