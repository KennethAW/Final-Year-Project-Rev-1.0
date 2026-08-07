import { useDashboard } from "@/context/DashboardContext";
import { useFetchJson } from "./useFetchJson";
import type { FeatureImportance } from "@/lib/types";

export function useFeatureImportance() {
  const { ticker, model } = useDashboard();
  return useFetchJson<FeatureImportance[]>(
    `/data/${model}/${ticker}_feature_importance.json`
  );
}
