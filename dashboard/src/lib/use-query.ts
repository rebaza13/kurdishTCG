"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/supabase";

interface QueryResult<T> {
  /** Latest successful data — kept while a reload is in flight. */
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  reload: () => void;
}

/**
 * Tiny data-fetching hook: runs `fn` on mount and whenever `deps` change,
 * ignores results from superseded runs, and exposes a `reload()`.
 */
export function useQuery<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[]
): QueryResult<T> {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    token: string;
    data?: T;
    error?: string;
  }>();

  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const token = `${JSON.stringify(deps)}#${version}`;

  useEffect(() => {
    let cancelled = false;
    fnRef.current().then(
      (data) => {
        if (!cancelled) setResult({ token, data });
      },
      (err) => {
        if (!cancelled) setResult({ token, error: errorMessage(err) });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data: result?.data,
    error: result?.token === token ? result.error : undefined,
    loading: result?.token !== token,
    reload,
  };
}
