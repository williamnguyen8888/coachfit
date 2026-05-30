// src/hooks/useQuery.ts
// Data-fetching hook that auto-runs on mount and when the path changes.
// Use for read operations. Use useAsync for user-triggered mutations.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { isApiError, getErrorMessage } from "@/lib/errors";
import type { ApiError } from "@/lib/errors";

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  errorMessage: string | null;
  /** True while re-fetching but stale data is still available */
  isRefetching: boolean;
}

export interface UseQueryReturn<T> extends QueryState<T> {
  refetch: () => void;
}

/**
 * Auto-fetching hook. Fires on mount and when `path` changes.
 * Keeps previous data while re-fetching (stale-while-revalidate pattern).
 *
 * @example
 * const { data, loading, error } = useQuery<Activity[]>('/activities?page=0&size=20');
 */
export function useQuery<T>(
  path: string | null,
  options?: RequestInit,
): UseQueryReturn<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: false,
    error: null,
    errorMessage: null,
    isRefetching: false,
  });

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(
    async (isRefetch = false) => {
      if (!path) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState((s) => ({
        ...s,
        loading: !isRefetch || !s.data,
        isRefetching: isRefetch && !!s.data,
        error: null,
        errorMessage: null,
      }));

      try {
        const data = await apiFetch<T>(path, {
          signal: abortRef.current.signal,
          ...options,
        });
        if (mountedRef.current) {
          setState({
            data,
            loading: false,
            isRefetching: false,
            error: null,
            errorMessage: null,
          });
        }
      } catch (e) {
        // Ignore AbortError (component unmounted or re-fetched)
        if (e instanceof Error && e.name === "AbortError") return;
        const err = isApiError(e) ? e : e instanceof Error ? e : new Error(String(e));
        if (mountedRef.current) {
          setState((s) => ({
            ...s,
            loading: false,
            isRefetching: false,
            error: err,
            errorMessage: getErrorMessage(err),
          }));
        }
      }
    },
    // options object is intentionally excluded from deps to avoid re-running on
    // every render when callers pass inline objects. Callers should memoize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path],
  );

  // Auto-fetch on mount and when path changes
  useEffect(() => {
    mountedRef.current = true;
    fetch_(false);
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetch_]);

  const refetch = useCallback(() => fetch_(true), [fetch_]);

  return { ...state, refetch };
}
