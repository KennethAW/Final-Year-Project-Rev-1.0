import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useComparison } from "@/hooks/useComparison";
import { useSignificance } from "@/hooks/useSignificance";
import { useBaselines } from "@/hooks/useBaselines";
import { useAdvancedMode } from "@/hooks/useAdvancedMode";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMemo } from "react";
import { modelDisplayName, formatPercent, formatRatio } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const MODEL_COLORS: Record<string, string> = {
  XGBOOST: "#27609d",
  LSTM: "#fb5b2d",
  TFT: "#10b981",
  PATCHTST: "#8b5cf6",
};

const MODEL_ORDER = ["xgboost", "lstm", "tft", "patchtst"];

export function AnalyticsPage() {
  const { data: comparison, loading } = useComparison();
  const { data: significance } = useSignificance();
  const { data: baselines } = useBaselines();
  const advancedMode = useAdvancedMode();

  const meanRows = useMemo(() => {
    if (!comparison) return [];
    return comparison.filter((r) => r.Ticker === "MEAN");
  }, [comparison]);

  const barData = useMemo(() => {
    return meanRows.map((r) => ({
      model: modelDisplayName(r.Model.toLowerCase()),
      modelKey: r.Model,
      Accuracy: +(r.Clf_accuracy * 100).toFixed(1),
      "Dir. Accuracy": +(r.Reg_directional_accuracy * 100).toFixed(1),
      "ROC AUC": +(r.Clf_roc_auc * 100).toFixed(1),
    }));
  }, [meanRows]);

  const tickerRows = useMemo(() => {
    if (!comparison) return [];
    return comparison.filter((r) => r.Ticker !== "MEAN");
  }, [comparison]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Model Comparison</h1>
        <p className="text-sm text-text-secondary mt-1">
          Cross-model performance across all tickers
        </p>
      </div>

      {/* Baselines — Advanced mode only */}
      {advancedMode && baselines && (
        <Card>
          <div className="flex flex-col gap-5">
            <h2 className="text-base font-semibold text-text-primary">
              Simple Baselines
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {baselines.summary.map((s) => (
                <div
                  key={s.baseline}
                  className="rounded-lg bg-surface-container-low border border-outline px-5 py-4 text-center"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold text-text-primary tabular-nums mt-1">
                    {formatPercent(s.mean_accuracy, 1)}
                  </p>
                  <p className="text-[11px] text-text-secondary tabular-nums mt-0.5">
                    Sharpe {formatRatio(s.mean_sharpe, 2)}
                  </p>
                </div>
              ))}
              <div className="rounded-lg bg-primary/5 border-2 border-primary px-5 py-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Best ML (XGBoost)
                </p>
                <p className="text-2xl font-bold text-primary tabular-nums mt-1">
                  55.5%
                </p>
                <p className="text-[11px] text-text-secondary tabular-nums mt-0.5">
                  Reg. Dir. Accuracy
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Grouped bar chart */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">
          Average Model Performance (%)
        </h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={barData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="model"
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`]}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Accuracy" fill="#27609d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Dir. Accuracy" fill="#fb5b2d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ROC AUC" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed table */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">
          Model-Ticker Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-outline text-left">
                <th className="py-2 pr-4 font-medium text-text-secondary">Model</th>
                <th className="py-2 pr-4 font-medium text-text-secondary">Ticker</th>
                <th className="py-2 pr-4 font-medium text-text-secondary text-right">Accuracy</th>
                <th className="py-2 pr-4 font-medium text-text-secondary text-right">F1</th>
                <th className="py-2 pr-4 font-medium text-text-secondary text-right">ROC AUC</th>
                <th className="py-2 pr-4 font-medium text-text-secondary text-right">MCC</th>
                <th className="py-2 pr-4 font-medium text-text-secondary text-right">RMSE</th>
                <th className="py-2 font-medium text-text-secondary text-right">Dir. Acc.</th>
              </tr>
            </thead>
            <tbody>
              {tickerRows.map((r) => (
                <tr
                  key={`${r.Model}-${r.Ticker}`}
                  className="border-b border-outline/50 last:border-0"
                >
                  <td className="py-2 pr-4 font-medium" style={{ color: MODEL_COLORS[r.Model] }}>
                    {modelDisplayName(r.Model.toLowerCase())}
                  </td>
                  <td className="py-2 pr-4 text-text-primary font-medium">{r.Ticker}</td>
                  <td className="py-2 pr-4 text-right text-text-primary">
                    {formatPercent(r.Clf_accuracy, 1)}
                  </td>
                  <td className="py-2 pr-4 text-right text-text-secondary">
                    {formatPercent(r.Clf_f1_macro, 1)}
                  </td>
                  <td className="py-2 pr-4 text-right text-text-secondary">
                    {formatPercent(r.Clf_roc_auc, 1)}
                  </td>
                  <td className="py-2 pr-4 text-right text-text-secondary">
                    {formatRatio(r.Clf_mcc)}
                  </td>
                  <td className="py-2 pr-4 text-right text-text-secondary">
                    {formatRatio(r.Reg_rmse, 4)}
                  </td>
                  <td className="py-2 text-right text-text-primary font-medium">
                    {formatPercent(r.Reg_directional_accuracy, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Statistical Significance — Advanced mode only */}
      {advancedMode && (
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Statistical Significance
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Binomial test vs random (p&lt;0.05 is significant) &middot; Bootstrap 95% CI (1000 resamples) &middot; Diebold-Mariano test for pairwise model comparison
            </p>
          </div>
        </div>
        {!significance ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Per-model aggregate */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
                Per-Model Summary (across 5 tickers)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-outline text-left">
                      <th className="py-2 pr-3 font-medium text-text-secondary">Model</th>
                      <th className="py-2 pr-3 font-medium text-text-secondary text-right">Mean Acc.</th>
                      <th className="py-2 pr-3 font-medium text-text-secondary text-right">95% CI Width</th>
                      <th className="py-2 font-medium text-text-secondary text-right">Sig. vs Random</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_ORDER.map((m) => {
                      const row = significance.per_model_summary.find(
                        (s) => s.model === m
                      );
                      if (!row) return null;
                      const hasAny = row.n_significant_vs_random > 0;
                      return (
                        <tr key={m} className="border-b border-outline/50 last:border-0">
                          <td
                            className="py-2 pr-3 font-semibold"
                            style={{ color: MODEL_COLORS[m.toUpperCase()] }}
                          >
                            {modelDisplayName(m)}
                          </td>
                          <td className="py-2 pr-3 text-right text-text-primary tabular-nums">
                            {formatPercent(row.mean_accuracy, 1)}
                          </td>
                          <td className="py-2 pr-3 text-right text-text-secondary tabular-nums">
                            &plusmn;{(row.mean_ci_width * 100 / 2).toFixed(1)}pp
                          </td>
                          <td className="py-2 text-right">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                hasAny
                                  ? "bg-positive-light text-positive"
                                  : "bg-negative-light text-negative"
                              )}
                            >
                              {row.n_significant_vs_random} / {row.n_tickers}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-text-secondary mt-3 leading-relaxed">
                Reading: only {significance.per_model_summary.reduce((s, r) => s + r.n_significant_vs_random, 0)} of {significance.per_ticker.length} model-ticker pairs are statistically different from random chance at &alpha;=0.05. Consistent with the project's headline negative result.
              </p>
            </div>

            {/* Pairwise DM heatmap-ish table */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
                Pairwise Diebold-Mariano (mean p across tickers)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-outline">
                      <th className="py-2 pr-3 text-left font-medium text-text-secondary"></th>
                      {MODEL_ORDER.map((m) => (
                        <th
                          key={m}
                          className="py-2 px-2 font-medium text-text-secondary text-center"
                        >
                          {modelDisplayName(m)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_ORDER.map((mA) => (
                      <tr
                        key={mA}
                        className="border-b border-outline/50 last:border-0"
                      >
                        <td
                          className="py-2 pr-3 font-semibold"
                          style={{ color: MODEL_COLORS[mA.toUpperCase()] }}
                        >
                          {modelDisplayName(mA)}
                        </td>
                        {MODEL_ORDER.map((mB) => {
                          if (mA === mB) {
                            return (
                              <td
                                key={mB}
                                className="py-2 px-2 text-center text-text-secondary"
                              >
                                &mdash;
                              </td>
                            );
                          }
                          const rows = significance.pairwise_dm.filter(
                            (r) =>
                              (r.model_a === mA && r.model_b === mB) ||
                              (r.model_a === mB && r.model_b === mA)
                          );
                          if (rows.length === 0) {
                            return (
                              <td
                                key={mB}
                                className="py-2 px-2 text-center text-text-secondary"
                              >
                                n/a
                              </td>
                            );
                          }
                          const meanP =
                            rows.reduce((s, r) => s + r.dm_pvalue, 0) / rows.length;
                          const sig = meanP < 0.05;
                          return (
                            <td
                              key={mB}
                              className={cn(
                                "py-2 px-2 text-center tabular-nums font-medium",
                                sig ? "text-positive" : "text-text-secondary"
                              )}
                              title={`Mean DM p-value across ${rows.length} tickers`}
                            >
                              {meanP.toFixed(3)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-text-secondary mt-3 leading-relaxed">
                Cells show mean DM p-value across 5 tickers. Green = pair differs significantly (p&lt;0.05). Most model pairs are <em>not</em> significantly different &mdash; the models are within noise of each other.
              </p>
            </div>
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
