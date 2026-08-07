import { useDashboard } from "@/context/DashboardContext";
import { useFetchJson } from "./useFetchJson";
import type { Metrics } from "@/lib/types";

export function useMetrics() {
  const { ticker, model } = useDashboard();
  return useFetchJson<Metrics>(`/data/${model}/${ticker}_metrics.json`);
}
