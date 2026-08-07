/* ── Manifest ─────────────────────────────────────── */
export interface Manifest {
  tickers: string[];
  models: string[];
  generatedAt: string;
  available: Record<string, string[]>;
}

/* ── Metrics ──────────────────────────────────────── */
export interface MetricGroup {
  accuracy: number;
  f1_macro: number;
  precision: number;
  recall: number;
  roc_auc: number;
  mcc: number;
}

export interface RegMetricGroup {
  rmse: number;
  mae: number;
  mape: string | number;
  directional_accuracy: number;
}

export interface Metrics {
  ticker: string;
  clf_val: MetricGroup;
  clf_test: MetricGroup;
  reg_val: RegMetricGroup;
  reg_test: RegMetricGroup;
}

/* ── Predictions ──────────────────────────────────── */
export interface Prediction {
  date: string;
  close: number;
  predDirection: number;
  predProbUp: number;
  predLogReturn: number;
  predPrice: number;
  targetDirection: number;
  targetLogReturn: number;
}

/* ── Feature Importance ───────────────────────────── */
export interface FeatureImportance {
  feature: string;
  importance: number;
}

/* ── Backtest Metrics ─────────────────────────────── */
export interface BacktestMetrics {
  total_return: number;
  annualised_return: number;
  annualised_volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  calmar_ratio: number;
  win_rate: number;
  profit_factor: number;
  benchmark_return: number;
  benchmark_ann_return: number;
  benchmark_sharpe: number;
  excess_return: number;
  information_ratio: number;
  total_trading_days: number;
  days_in_market: string | number;
  market_exposure: number;
  model: string;
  ticker: string;
}

/* ── Trades ───────────────────────────────────────── */
export interface Trade {
  entryDate: string;
  exitDate: string;
  durationDays: number;
  return: number;
  profitable: boolean;
}

/* ── Price Data ───────────────────────────────────── */
export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/* ── Model Comparison ─────────────────────────────── */
export interface ModelComparison {
  Model: string;
  Ticker: string;
  Clf_accuracy: number;
  Clf_f1_macro: number;
  Clf_precision: number;
  Clf_recall: number;
  Clf_roc_auc: number;
  Clf_mcc: number;
  Reg_rmse: number;
  Reg_mae: number;
  Reg_mape: number;
  Reg_directional_accuracy: number;
}
