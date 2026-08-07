import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { useCostSensitivity } from "@/hooks/useCostSensitivity";
import { useDashboard } from "@/context/DashboardContext";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMemo, useState } from "react";
import { modelDisplayName, formatRatio } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const MODEL_COLORS: Record<string, string> = {
  xgboost: "#27609d",
  lstm: "#fb5b2d",
  tft: "#10b981",
  patchtst: "#8b5cf6",
};

const MODEL_ORDER = ["xgboost", "lstm", "tft", "patchtst"];

type ChartScope = "ticker" | "mean";

export function CostSensitivity() {
  const { data, loading } = useCostSensitivity();
  const { ticker } = useDashboard();
  const [scope, setScope] = useState<ChartScope>("ticker");

  // Build chart rows. In "ticker" mode, filter rows to the currently-selected ticker.
  // In "mean" mode, average across all 5 tickers for each model.
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.cost_levels_bps.map((bps) => {
      const row: Record<string, number | string> = { bps: `${bps} bps` };
      for (const model of MODEL_ORDER) {
        const matches = data.rows.filter((r) => {
          if (r.bps !== bps || r.model !== model) return false;
          if (scope === "ticker") return r.ticker === ticker;
          return true;
        });
        if (matches.length) {
          const meanSharpe =
            matches.reduce((s, r) => s + r.sharpe_ratio, 0) / matches.length;
          row[model] = +meanSharpe.toFixed(3);
        }
      }
      return row;
    });
  }, [data, scope, ticker]);

  // Summary table: this is always across all tickers — it's a global defensive fact
  const summaryRows = data?.summary_by_bps ?? [];
  const totalBeatsAcrossAll = summaryRows.reduce((s, r) => s + r.beats_spy, 0);
  const totalEvaluations = summaryRows.reduce((s, r) => s + r.total, 0);

  // Summary: per-ticker beats-SPY counts in ticker mode (informational)
  const tickerBeats = useMemo(() => {
    if (!data || scope !== "ticker") return null;
    let beats = 0;
    let total = 0;
    for (const r of data.rows) {
      if (r.ticker === ticker) {
        total += 1;
        if (r.beats_spy) beats += 1;
      }
    }
    return { beats, total };
  }, [data, scope, ticker]);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-text-primary">
            Cost Sensitivity
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Strategy Sharpe ratio across transaction-cost levels (0&ndash;20 bps per
            trade). Dashed zero line = break-even vs cash.{" "}
            {scope === "ticker" ? (
              <span>
                Currently showing <strong className="text-text-primary">{ticker}</strong>.
              </span>
            ) : (
              <span>
                Currently showing <strong className="text-text-primary">mean across all 5 tickers</strong>.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-surface-container p-1 shrink-0">
          <button
            onClick={() => setScope("ticker")}
            className={cn(
              "rounded-md px-3 py-1 text-[11px] font-semibold transition-all",
              scope === "ticker"
                ? "bg-white shadow-sm text-primary ring-1 ring-primary/10"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            This ticker
          </button>
          <button
            onClick={() => setScope("mean")}
            className={cn(
              "rounded-md px-3 py-1 text-[11px] font-semibold transition-all",
              scope === "mean"
                ? "bg-white shadow-sm text-primary ring-1 ring-primary/10"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            All tickers (mean)
          </button>
        </div>
      </div>
      {loading || !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Line chart: Sharpe vs cost */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 15, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="bps"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  label={{
                    value: scope === "ticker" ? "Sharpe" : "Mean Sharpe",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(v: number, name: string) => [v.toFixed(3), modelDisplayName(name)]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(name: string) => modelDisplayName(name)}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                {MODEL_ORDER.map((m) => (
                  <Line
                    key={m}
                    type="monotone"
                    dataKey={m}
                    stroke={MODEL_COLORS[m]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {scope === "ticker" && tickerBeats && (
              <p className="text-[10px] text-text-secondary mt-2">
                On <strong className="text-text-primary">{ticker}</strong>:{" "}
                <strong className="text-text-primary">
                  {tickerBeats.beats} / {tickerBeats.total}
                </strong>{" "}
                (model &times; cost-level) pairs beat SPY.
              </p>
            )}
          </div>

          {/* Summary: beats SPY per level — always cross-all-tickers (global fact) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
              Beats SPY <span className="text-text-primary">(all 5 tickers)</span>
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline text-left">
                  <th className="py-1.5 pr-2 font-medium text-text-secondary">Cost</th>
                  <th className="py-1.5 pr-2 font-medium text-text-secondary text-right">Beats SPY</th>
                  <th className="py-1.5 font-medium text-text-secondary text-right">Mean Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((s) => (
                  <tr key={s.bps} className="border-b border-outline/50 last:border-0">
                    <td className="py-1.5 pr-2 text-text-primary tabular-nums">
                      {s.bps} bps
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          s.beats_spy > 0
                            ? "bg-positive-light text-positive"
                            : "bg-negative-light text-negative"
                        }`}
                      >
                        {s.beats_spy} / {s.total}
                      </span>
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums font-medium ${
                        s.mean_sharpe >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {formatRatio(s.mean_sharpe, 3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-text-secondary mt-3 leading-relaxed">
              Across all {data.cost_levels_bps.length} cost levels and{" "}
              {totalEvaluations / data.cost_levels_bps.length} model-ticker pairs,{" "}
              <strong className="text-text-primary">{totalBeatsAcrossAll}</strong>{" "}
              total strategies beat SPY. The{" "}
              <strong className="text-text-primary">
                0 / 20 at 0 bps
              </strong>{" "}
              finding shows the result is <em>structural, not a cost artifact</em>{" "}
              &mdash; even with zero friction the ML strategies underperform
              buy-and-hold. This summary is unchanged by ticker selection.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
