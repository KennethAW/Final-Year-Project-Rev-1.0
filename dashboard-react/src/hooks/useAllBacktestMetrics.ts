import { useEffect, useState } from "react";
import { useDashboard, MODELS } from "@/context/DashboardContext";
import type { BacktestMetrics } from "@/lib/types";

interface AllBacktestState {
  data: BacktestMetrics[];
  loading: boolean;
  error: string | null;
}

export function useAllBacktestMetrics(): AllBacktestState {
  const { ticker } = useDashboard();
  const [state, setState] = useState<AllBacktestState>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: [], loading: true, error: null });

    const fetches = MODELS.map((m) =>
      fetch(`/data/${m}/${ticker}_backtest_metrics.json`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((text) => {
          const sanitized = text
            .replace(/:\s*Infinity/g, ": 1e308")
            .replace(/:\s*-Infinity/g, ": -1e308")
            .replace(/:\s*NaN/g, ": null");
          return JSON.parse(sanitized) as BacktestMetrics;
        })
        .catch(() => null)
    );

    Promise.all(fetches).then((results) => {
      if (!cancelled) {
        const valid = results.filter((r): r is BacktestMetrics => r !== null);
        setState({ data: valid, loading: false, error: null });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return state;
}
