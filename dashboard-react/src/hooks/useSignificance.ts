import { useFetchJson } from "./useFetchJson";

export interface PerTickerSignificance {
  model: string;
  ticker: string;
  n_samples: number;
  accuracy: number;
  binomial_pvalue: number;
  acc_ci_low: number;
  acc_ci_high: number;
  significant_vs_random: boolean;
}

export interface PairwiseDM {
  ticker: string;
  model_a: string;
  model_b: string;
  dm_pvalue: number;
  significant: boolean;
  n_common: number;
}

export interface PerModelSummary {
  model: string;
  n_tickers: number;
  mean_accuracy: number;
  mean_ci_width: number;
  n_significant_vs_random: number;
}

export interface SignificanceData {
  per_ticker: PerTickerSignificance[];
  pairwise_dm: PairwiseDM[];
  per_model_summary: PerModelSummary[];
  notes: Record<string, string>;
}

export function useSignificance() {
  return useFetchJson<SignificanceData>("/data/significance.json");
}
