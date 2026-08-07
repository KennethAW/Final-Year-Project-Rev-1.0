import { useDashboard } from "@/context/DashboardContext";
import { useFetchJson } from "./useFetchJson";
import type { Trade } from "@/lib/types";

export function useTrades() {
  const { ticker, model } = useDashboard();
  return useFetchJson<Trade[]>(`/data/${model}/${ticker}_trades.json`);
}
