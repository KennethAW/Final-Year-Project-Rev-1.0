import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { useDashboard } from "@/context/DashboardContext";
import { useFeatureImportance } from "@/hooks/useFeatureImportance";
import { useFeatureCorrelation } from "@/hooks/useFeatureCorrelation";
import { useAdvancedMode } from "@/hooks/useAdvancedMode";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrainingConvergence } from "@/components/panels/TrainingConvergence";
import { modelDisplayName } from "@/lib/formatters";
import { useMemo } from "react";

const MODELS_WITH_FEATURES = ["xgboost", "tft"];

export function FeatureAnalysisPage() {
  const { model, ticker } = useDashboard();
  const { data: features, loading: loadingFI } = useFeatureImportance();
  const { data: correlations, loading: loadingCorr } = useFeatureCorrelation();
  const advancedMode = useAdvancedMode();

  const hasFeatureImportance = MODELS_WITH_FEATURES.includes(model);

  // Feature importance data (sorted highest first)
  const sortedFeatures = useMemo(() => {
    if (!features) return [];
    return [...features]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 25);
  }, [features]);

  const totalImportance = useMemo(() => {
    return sortedFeatures.reduce((sum, f) => sum + f.importance, 0);
  }, [sortedFeatures]);

  // Chart data: keep highest first (top of chart = most important)
  const chartData = useMemo(() => {
    return sortedFeatures.map((f) => ({
      feature: f.feature,
      importance: f.importance,
    }));
  }, [sortedFeatures]);

  // Correlation data for non-XGBoost/TFT models
  const corrChartData = useMemo(() => {
    if (!correlations) return [];
    return correlations.map((c) => ({
      feature: c.feature,
      correlation: c.correlation,
    }));
  }, [correlations]);

  const loading = hasFeatureImportance ? loadingFI : loadingCorr;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[500px] w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">
          Feature Analysis
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {modelDisplayName(model)} &mdash; {ticker}
        </p>
      </div>

      {hasFeatureImportance ? (
        <>
          {/* Feature Importance bar chart */}
          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              Feature Importance Rankings
            </h2>
            <ResponsiveContainer
              width="100%"
              height={Math.max(400, chartData.length * 28)}
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, bottom: 5, left: 180 }}
              >
                <defs>
                  <linearGradient
                    id="barGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#1e4976" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="feature"
                  tick={{ fontSize: 10, fill: "#334155" }}
                  tickLine={false}
                  width={170}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toFixed(6),
                    "Importance",
                  ]}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar
                  dataKey="importance"
                  fill="url(#barGradient)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Feature importance table */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-text-primary">
                Feature Details
              </h2>
              <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
                {sortedFeatures.length} features
              </span>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-outline text-left">
                    <th className="py-2 pr-3 font-medium text-text-secondary w-16">
                      Rank
                    </th>
                    <th className="py-2 pr-3 font-medium text-text-secondary">
                      Feature Name
                    </th>
                    <th className="py-2 pr-3 font-medium text-text-secondary text-right">
                      Importance Score
                    </th>
                    <th className="py-2 font-medium text-text-secondary text-right">
                      Importance %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFeatures.map((f, i) => (
                    <tr
                      key={f.feature}
                      className="border-b border-outline/50 last:border-0"
                    >
                      <td className="py-2 pr-3 text-text-secondary font-medium">
                        {i + 1}
                      </td>
                      <td className="py-2 pr-3 text-text-primary font-mono text-[11px]">
                        {f.feature}
                      </td>
                      <td className="py-2 pr-3 text-right text-text-primary tabular-nums">
                        {f.importance.toFixed(6)}
                      </td>
                      <td className="py-2 text-right text-text-primary tabular-nums">
                        {totalImportance > 0
                          ? ((f.importance / totalImportance) * 100).toFixed(2)
                          : "0.00"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* Fallback: Feature Correlation with Target */}
          <Card>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
              <p className="text-xs text-amber-800">
                Feature importance is not available for{" "}
                {modelDisplayName(model)}. Showing feature correlation with
                target (log return) instead, computed from the test set.
              </p>
            </div>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              Top 25 Features by Target Correlation
            </h2>
            {corrChartData.length === 0 ? (
              <p className="text-sm text-text-secondary py-8 text-center">
                No correlation data available.
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(400, corrChartData.length * 28)}
              >
                <BarChart
                  data={corrChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, bottom: 5, left: 180 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    tick={{ fontSize: 10, fill: "#334155" }}
                    tickLine={false}
                    width={170}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      value.toFixed(6),
                      "Correlation",
                    ]}
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar dataKey="correlation" radius={[0, 4, 4, 0]}>
                    {corrChartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.correlation >= 0 ? "#10b981" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Correlation table */}
          {corrChartData.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-text-primary">
                  Correlation Details
                </h2>
                <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
                  {corrChartData.length} features
                </span>
              </div>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-outline text-left">
                      <th className="py-2 pr-3 font-medium text-text-secondary w-16">
                        Rank
                      </th>
                      <th className="py-2 pr-3 font-medium text-text-secondary">
                        Feature Name
                      </th>
                      <th className="py-2 pr-3 font-medium text-text-secondary text-right">
                        Correlation
                      </th>
                      <th className="py-2 font-medium text-text-secondary text-right">
                        |Correlation|
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {corrChartData.map((f, i) => (
                      <tr
                        key={f.feature}
                        className="border-b border-outline/50 last:border-0"
                      >
                        <td className="py-2 pr-3 text-text-secondary font-medium">
                          {i + 1}
                        </td>
                        <td className="py-2 pr-3 text-text-primary font-mono text-[11px]">
                          {f.feature}
                        </td>
                        <td
                          className={`py-2 pr-3 text-right tabular-nums font-medium ${
                            f.correlation >= 0
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {f.correlation >= 0 ? "+" : ""}
                          {f.correlation.toFixed(6)}
                        </td>
                        <td className="py-2 text-right text-text-primary tabular-nums">
                          {Math.abs(f.correlation).toFixed(6)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Training Convergence — Advanced mode only */}
      {advancedMode && <TrainingConvergence />}
    </div>
  );
}
