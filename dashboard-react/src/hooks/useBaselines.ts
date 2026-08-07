import { useFetchJson } from "./useFetchJson";

export interface BaselineRow {
  ticker: string;
  baseline: string;
  accuracy: number;
  sharpe: number;
}

export interface BaselineSummary {
  baseline: string;
  label: string;
  mean_accuracy: number;
  mean_sharpe: number;
}

export interface Baselines {
  rows: BaselineRow[];
  summary: BaselineSummary[];
}

export function useBaselines() {
  return useFetchJson<Baselines>("/data/baselines.json");
}
