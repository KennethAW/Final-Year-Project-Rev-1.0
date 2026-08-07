import { useDashboard } from "@/context/DashboardContext";
import { useFetchJson } from "./useFetchJson";
import type { Prediction } from "@/lib/types";

export function usePredictions() {
  const { ticker, model } = useDashboard();
  return useFetchJson<Prediction[]>(
    `/data/${model}/${ticker}_predictions.json`
  );
}
