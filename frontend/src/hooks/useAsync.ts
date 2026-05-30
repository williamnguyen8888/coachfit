// src/hooks/useAsync.ts
// Generic hook for async operations with loading / error state.
// Use for user-triggered actions (form submit, button click).
// Use useQuery for data fetching that auto-runs on mount.

"use client";

import { useState, useCallback, useRef } from "react";
import { isApiError, getErrorMessage, type ApiError } from "@/lib/errors";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  errorMessage: string | null;
}

export interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

/**
 * Wraps an async function with loading / error state tracking.
 *
 * @example
 * const { execute, loading, error } = useAsync(
 *   (email: string, pw: string) => useAuthStore.getState().login(email, pw)
 * );
 */
export function useAsync<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
): UseAsyncReturn<T, Args> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    errorMessage: null,
  });

  // Track mounted state to avoid setState after unmount
  const mountedRef = useRef(true);
  // Using useRef for mountedRef cleanup is done in calling component if needed

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState((s) => ({ ...s, loading: true, error: null, errorMessage: null }));
      try {
        const result = await asyncFn(...args);
        if (mountedRef.current) {
          setState({ data: result, loading: false, error: null, errorMessage: null });
        }
        return result;
      } catch (e) {
        const err = isApiError(e) ? e : e instanceof Error ? e : new Error(String(e));
        const message = getErrorMessage(err);
        if (mountedRef.current) {
          setState({ data: null, loading: false, error: err, errorMessage: message });
        }
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asyncFn],
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, errorMessage: null });
  }, []);

  return { ...state, execute, reset };
}
