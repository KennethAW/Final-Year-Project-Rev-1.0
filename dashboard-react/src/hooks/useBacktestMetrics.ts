import { useDashboard } from "@/context/DashboardContext";
import { useFetchJson } from "./useFetchJson";
import type { BacktestMetrics } from "@/lib/types";

export function useBacktestMetrics() {
  const { ticker, model } = useDashboard();
  return useFetchJson<BacktestMetrics>(
    `/data/${model}/${ticker}_backtest_metrics.json`
  );
}
