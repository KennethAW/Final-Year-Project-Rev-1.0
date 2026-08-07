import { useEffect, useState } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetchJson<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        // Handle Infinity and NaN in JSON
        const sanitized = text
          .replace(/:\s*Infinity/g, ": 1e308")
          .replace(/:\s*-Infinity/g, ": -1e308")
          .replace(/:\s*NaN/g, ": null");
        const parsed = JSON.parse(sanitized) as T;
        if (!cancelled) setState({ data: parsed, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
