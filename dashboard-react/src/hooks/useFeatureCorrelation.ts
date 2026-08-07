import { useDashboard } from "@/context/DashboardContext";
import { useFetchJson } from "./useFetchJson";

export interface FeatureCorrelation {
  feature: string;
  correlation: number;
}

export function useFeatureCorrelation() {
  const { ticker } = useDashboard();
  return useFetchJson<FeatureCorrelation[]>(
    `/data/correlations/${ticker}_correlation.json`
  );
}
