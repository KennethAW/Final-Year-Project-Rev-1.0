import { useFetchJson } from "./useFetchJson";

export interface CostRow {
  model: string;
  ticker: string;
  bps: number;
  sharpe_ratio: number;
  total_return: number;
  annualised_return: number;
  benchmark_return: number;
  beats_spy: boolean;
}

export interface CostSummary {
  bps: number;
  total: number;
  beats_spy: number;
  mean_sharpe: number;
  mean_total_return: number;
}

export interface CostSensitivity {
  rows: CostRow[];
  summary_by_bps: CostSummary[];
  cost_levels_bps: number[];
}

export function useCostSensitivity() {
  return useFetchJson<CostSensitivity>("/data/cost_sensitivity.json");
}
